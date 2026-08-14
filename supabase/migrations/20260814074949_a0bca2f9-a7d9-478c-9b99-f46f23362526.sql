-- ============ helpers ============
CREATE OR REPLACE FUNCTION public.workflow_level_role(_level text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _level WHEN 'country' THEN 'country_admin' WHEN 'state' THEN 'state_admin' ELSE 'district_admin' END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_next_level(_level text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _level WHEN 'country' THEN 'state' WHEN 'state' THEN 'district' ELSE NULL END;
$$;

CREATE OR REPLACE FUNCTION public.workflow_eligible_admins(_level text, _country text, _state text, _district text)
RETURNS TABLE(user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT s.user_id
  FROM public.admin_scopes s
  WHERE s.is_active = true
    AND s.role = public.workflow_level_role(_level)
    AND (_level <> 'country' OR s.country IS NULL OR _country IS NULL OR lower(s.country) = lower(_country))
    AND (_level <> 'state'   OR ((s.country IS NULL OR _country IS NULL OR lower(s.country) = lower(_country))
                             AND (s.state IS NULL OR _state IS NULL OR lower(s.state) = lower(_state))))
    AND (_level <> 'district' OR ((s.state IS NULL OR _state IS NULL OR lower(s.state) = lower(_state))
                             AND (s.district IS NULL OR _district IS NULL OR lower(s.district) = lower(_district))));
$$;

CREATE OR REPLACE FUNCTION public.workflow_admin_level(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.admin_scopes s WHERE s.user_id = _user_id AND s.is_active AND s.role = 'country_admin') THEN 'country'
    WHEN EXISTS (SELECT 1 FROM public.admin_scopes s WHERE s.user_id = _user_id AND s.is_active AND s.role = 'state_admin') THEN 'state'
    WHEN EXISTS (SELECT 1 FROM public.admin_scopes s WHERE s.user_id = _user_id AND s.is_active AND s.role = 'district_admin') THEN 'district'
    ELSE NULL END;
$$;

-- ============ enter a queue level ============
CREATE OR REPLACE FUNCTION public.property_enter_queue(_property_id uuid, _level text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p record; cfg record; mins integer; admin_ids uuid[]; expires timestamptz; nxt text;
BEGIN
  SELECT * INTO p FROM public.properties WHERE id = _property_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','property_not_found'); END IF;
  SELECT * INTO cfg FROM public.workflow_settings LIMIT 1;

  mins := CASE _level WHEN 'country' THEN cfg.country_timer_minutes
                      WHEN 'state' THEN cfg.state_timer_minutes
                      ELSE cfg.district_timer_minutes END;

  SELECT array_agg(user_id) INTO admin_ids
  FROM public.workflow_eligible_admins(_level, p.country, p.state, p.district);

  IF admin_ids IS NULL OR array_length(admin_ids,1) = 0 THEN
    nxt := public.workflow_next_level(_level);
    INSERT INTO public.property_hold_events(property_id, level, action, reason)
      VALUES (_property_id, _level, 'skipped', 'No eligible admins at this level');
    IF nxt IS NULL THEN
      UPDATE public.properties
        SET lifecycle_status = 'pending_admin_review', queue_level = NULL,
            queue_started_at = NULL, queue_expires_at = NULL
        WHERE id = _property_id;
      RETURN jsonb_build_object('escalated_to','super_admin');
    END IF;
    RETURN public.property_enter_queue(_property_id, nxt);
  END IF;

  expires := now() + make_interval(mins => mins);

  UPDATE public.properties SET
    lifecycle_status = (_level || '_queue')::property_lifecycle_status,
    queue_level = _level,
    queue_started_at = now(),
    queue_expires_at = expires,
    is_locked = false,
    hold_admin_id = NULL, hold_admin_role = NULL,
    hold_started_at = NULL, hold_expires_at = NULL
  WHERE id = _property_id;

  INSERT INTO public.property_admin_timers(property_id, admin_id, level, status, started_at, expires_at, remaining_seconds)
  SELECT _property_id, a, _level, 'running', now(), expires, mins * 60
  FROM unnest(admin_ids) a
  ON CONFLICT (property_id, admin_id, level) DO UPDATE
    SET status='running', started_at=now(), expires_at=EXCLUDED.expires_at,
        paused_at=NULL, remaining_seconds=EXCLUDED.remaining_seconds;

  INSERT INTO public.notifications(user_id, title, message, type, link)
  SELECT a, 'New property in your review queue',
         'Property "' || COALESCE(p.title,'Untitled') || '" is awaiting review. You have ' || mins || ' minutes to place a hold.',
         'alert', '/admin'
  FROM unnest(admin_ids) a;

  INSERT INTO public.property_hold_events(property_id, level, action, metadata)
    VALUES (_property_id, _level, 'queued', jsonb_build_object('admins', to_jsonb(admin_ids), 'timer_minutes', mins));

  RETURN jsonb_build_object('level', _level, 'admins', array_length(admin_ids,1), 'expires_at', expires);
END;
$$;

-- ============ submit ============
CREATE OR REPLACE FUNCTION public.property_submit_for_review(_property_id uuid, _needs_agent boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.properties WHERE id = _property_id
                 AND (submitted_by = auth.uid() OR public.is_admin(auth.uid()))) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  UPDATE public.properties
    SET needs_agent = _needs_agent, is_draft = false, lifecycle_status = 'submitted'
    WHERE id = _property_id;
  INSERT INTO public.property_hold_events(property_id, admin_id, action, metadata)
    VALUES (_property_id, auth.uid(), 'submitted', jsonb_build_object('needs_agent', _needs_agent));
  RETURN public.property_enter_queue(_property_id, 'country');
END;
$$;

-- ============ hold ============
CREATE OR REPLACE FUNCTION public.property_hold(_property_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; cfg record; lvl text; uid uuid := auth.uid(); expires timestamptz;
BEGIN
  SELECT * INTO p FROM public.properties WHERE id = _property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF p.is_locked THEN RAISE EXCEPTION 'Property is already on hold by another admin'; END IF;
  lvl := p.queue_level;
  IF lvl IS NULL THEN RAISE EXCEPTION 'Property is not in a review queue'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.property_admin_timers t
                 WHERE t.property_id = _property_id AND t.admin_id = uid AND t.level = lvl
                   AND t.status IN ('running','paused')) THEN
    RAISE EXCEPTION 'You are not eligible to hold this property';
  END IF;

  SELECT * INTO cfg FROM public.workflow_settings LIMIT 1;
  expires := now() + make_interval(hours => cfg.max_hold_hours);

  UPDATE public.properties SET
    is_locked = true, hold_admin_id = uid, hold_admin_role = public.workflow_level_role(lvl),
    hold_started_at = now(), hold_expires_at = expires,
    lifecycle_status = (lvl || '_hold')::property_lifecycle_status,
    edit_locked = true
  WHERE id = _property_id;

  UPDATE public.property_admin_timers SET status='held', paused_at=now(),
         remaining_seconds = GREATEST(0, EXTRACT(EPOCH FROM (expires_at - now()))::int)
   WHERE property_id = _property_id AND level = lvl AND admin_id = uid;

  UPDATE public.property_admin_timers SET status='paused', paused_at=now(),
         remaining_seconds = GREATEST(0, EXTRACT(EPOCH FROM (expires_at - now()))::int)
   WHERE property_id = _property_id AND level = lvl AND admin_id <> uid AND status = 'running';

  INSERT INTO public.property_hold_events(property_id, admin_id, level, action)
    VALUES (_property_id, uid, lvl, 'hold');

  IF p.submitted_by IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (p.submitted_by, 'Your property is under review',
      'A JAAGAX ' || initcap(lvl) || ' Admin is reviewing "' || COALESCE(p.title,'your property') || '".',
      'info', '/dashboard/customer');
  END IF;

  RETURN jsonb_build_object('held_by', uid, 'level', lvl, 'hold_expires_at', expires);
END;
$$;

-- ============ release ============
CREATE OR REPLACE FUNCTION public.property_release(_property_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; lvl text; uid uuid := auth.uid(); remaining int;
BEGIN
  SELECT * INTO p FROM public.properties WHERE id = _property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF p.hold_admin_id IS DISTINCT FROM uid AND NOT public.is_admin(uid) THEN
    RAISE EXCEPTION 'Only the holding admin can release this property';
  END IF;
  lvl := COALESCE(p.queue_level, 'country');

  UPDATE public.property_admin_timers SET status='expired', remaining_seconds=0
   WHERE property_id=_property_id AND level=lvl AND admin_id=p.hold_admin_id;

  UPDATE public.property_admin_timers
     SET status='running', expires_at = now() + make_interval(secs => GREATEST(remaining_seconds,60)), paused_at=NULL
   WHERE property_id=_property_id AND level=lvl AND status='paused';

  SELECT COUNT(*) INTO remaining FROM public.property_admin_timers
   WHERE property_id=_property_id AND level=lvl AND status='running';

  UPDATE public.properties SET
    is_locked=false, hold_admin_id=NULL, hold_admin_role=NULL,
    hold_started_at=NULL, hold_expires_at=NULL, edit_locked=false,
    lifecycle_status=(lvl || '_queue')::property_lifecycle_status,
    queue_expires_at = (SELECT MAX(expires_at) FROM public.property_admin_timers
                        WHERE property_id=_property_id AND level=lvl AND status='running')
  WHERE id=_property_id;

  INSERT INTO public.property_hold_events(property_id, admin_id, level, action, reason)
    VALUES (_property_id, uid, lvl, 'release', _reason);

  IF remaining = 0 THEN
    RETURN public.property_escalate(_property_id);
  END IF;
  RETURN jsonb_build_object('released', true, 'remaining_admins', remaining);
END;
$$;

-- ============ escalate ============
CREATE OR REPLACE FUNCTION public.property_escalate(_property_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; nxt text;
BEGIN
  SELECT * INTO p FROM public.properties WHERE id=_property_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','not_found'); END IF;
  nxt := public.workflow_next_level(COALESCE(p.queue_level,'country'));
  UPDATE public.property_admin_timers SET status='expired'
   WHERE property_id=_property_id AND status IN ('running','paused');
  INSERT INTO public.property_hold_events(property_id, level, action, reason)
    VALUES (_property_id, p.queue_level, 'escalated', 'Queue completed without verification');
  IF nxt IS NULL THEN
    UPDATE public.properties SET lifecycle_status='pending_admin_review', queue_level=NULL,
      queue_expires_at=NULL, is_locked=false WHERE id=_property_id;
    RETURN jsonb_build_object('escalated_to','super_admin');
  END IF;
  RETURN public.property_enter_queue(_property_id, nxt);
END;
$$;

-- ============ reject ============
CREATE OR REPLACE FUNCTION public.property_reject_review(_property_id uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; uid uuid := auth.uid();
BEGIN
  SELECT * INTO p FROM public.properties WHERE id=_property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF p.hold_admin_id IS DISTINCT FROM uid AND NOT public.is_admin(uid) THEN
    RAISE EXCEPTION 'Only the holding admin can reject this property';
  END IF;
  UPDATE public.property_admin_timers SET status='expired' WHERE property_id=_property_id;
  UPDATE public.properties SET
    lifecycle_status='rejected', rejection_reason=_reason, is_locked=false,
    is_live=false, verified=false, was_ever_rejected=true, edit_locked=false,
    queue_level=NULL, queue_expires_at=NULL, hold_admin_id=NULL, hold_expires_at=NULL
  WHERE id=_property_id;
  INSERT INTO public.property_hold_events(property_id, admin_id, level, action, reason)
    VALUES (_property_id, uid, p.queue_level, 'reject', _reason);
  IF p.submitted_by IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (p.submitted_by, 'Property rejected',
      'Your property "' || COALESCE(p.title,'') || '" was rejected. Reason: ' || COALESCE(_reason,'Not specified'),
      'alert', '/dashboard/customer');
  END IF;
  RETURN jsonb_build_object('rejected', true);
END;
$$;

-- ============ admin submits verification to owner ============
CREATE OR REPLACE FUNCTION public.property_submit_verification_to_owner(_property_id uuid, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; uid uuid := auth.uid();
BEGIN
  SELECT * INTO p FROM public.properties WHERE id=_property_id FOR UPDATE;
  IF p.hold_admin_id IS DISTINCT FROM uid AND NOT public.is_admin(uid) THEN
    RAISE EXCEPTION 'Only the holding admin can submit verification';
  END IF;
  UPDATE public.properties SET
    lifecycle_status='owner_review', owner_review_requested_at=now(), agent_notes=COALESCE(_notes, agent_notes)
  WHERE id=_property_id;
  INSERT INTO public.property_hold_events(property_id, admin_id, level, action, reason)
    VALUES (_property_id, uid, p.queue_level, 'verification_submitted', _notes);
  IF p.submitted_by IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (p.submitted_by, 'Verification ready for your approval',
      'JAAGAX has completed verification of "' || COALESCE(p.title,'') || '". Please approve or reject the changes.',
      'action', '/dashboard/customer');
  END IF;
  RETURN jsonb_build_object('status','owner_review');
END;
$$;

-- ============ owner approves / rejects ============
CREATE OR REPLACE FUNCTION public.property_owner_decision(_property_id uuid, _approve boolean, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; uid uuid := auth.uid(); lvl text;
BEGIN
  SELECT * INTO p FROM public.properties WHERE id=_property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF p.submitted_by IS DISTINCT FROM uid AND NOT public.is_admin(uid) THEN
    RAISE EXCEPTION 'Only the property owner can respond';
  END IF;
  lvl := COALESCE(p.queue_level,'country');

  IF NOT _approve THEN
    UPDATE public.properties SET lifecycle_status=(lvl || '_hold')::property_lifecycle_status WHERE id=_property_id;
    INSERT INTO public.property_hold_events(property_id, admin_id, level, action, reason)
      VALUES (_property_id, uid, lvl, 'owner_rejected', _reason);
    IF p.hold_admin_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, title, message, type, link)
      VALUES (p.hold_admin_id, 'Owner rejected your verification',
        'Owner rejected the verification for "' || COALESCE(p.title,'') || '". Reason: ' || COALESCE(_reason,'Not specified'),
        'alert', '/admin');
    END IF;
    RETURN jsonb_build_object('status','back_to_admin');
  END IF;

  UPDATE public.property_admin_timers SET status='completed' WHERE property_id=_property_id;

  UPDATE public.properties SET
    lifecycle_status = CASE WHEN p.needs_agent THEN 'live_verified'::property_lifecycle_status ELSE 'live'::property_lifecycle_status END,
    verified = true, is_live = true, is_draft = false, published_at = now(),
    verification_status = 'verified', last_verified_at = now(),
    verified_by_admin_id = p.hold_admin_id, verified_level = lvl,
    is_locked = false, edit_locked = false,
    queue_level = NULL, queue_expires_at = NULL,
    assigned_agent_id = CASE WHEN p.needs_agent THEN p.hold_admin_id ELSE NULL END,
    agent_assignment_status = CASE WHEN p.needs_agent THEN 'accepted'::agent_assignment_state ELSE NULL END,
    agent_assigned_at = CASE WHEN p.needs_agent THEN now() ELSE NULL END,
    agent_accepted_at = CASE WHEN p.needs_agent THEN now() ELSE NULL END
  WHERE id=_property_id;

  INSERT INTO public.property_hold_events(property_id, admin_id, level, action, metadata)
    VALUES (_property_id, uid, lvl, 'owner_approved', jsonb_build_object('agent_assigned', p.needs_agent));

  IF p.hold_admin_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (p.hold_admin_id,
      CASE WHEN p.needs_agent THEN 'You are now the assigned agent' ELSE 'Property published' END,
      'Property "' || COALESCE(p.title,'') || '" is now live.', 'success', '/admin');
  END IF;

  RETURN jsonb_build_object('status','live','agent_assigned', p.needs_agent);
END;
$$;

-- ============ background tick ============
CREATE OR REPLACE FUNCTION public.workflow_tick()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; released int := 0; escalated int := 0; cfg record;
BEGIN
  SELECT * INTO cfg FROM public.workflow_settings LIMIT 1;

  -- expired holds auto-release
  IF cfg.auto_release_enabled THEN
    FOR r IN SELECT id FROM public.properties
             WHERE is_locked = true AND hold_expires_at IS NOT NULL AND hold_expires_at < now() LOOP
      PERFORM public.property_release(r.id, 'Hold expired automatically');
      released := released + 1;
    END LOOP;
  END IF;

  -- expire finished timers
  UPDATE public.property_admin_timers SET status='expired'
   WHERE status='running' AND expires_at < now();

  -- escalate queues where no timer is left running and nobody holds it
  FOR r IN SELECT p.id FROM public.properties p
           WHERE p.queue_level IS NOT NULL AND p.is_locked = false
             AND NOT EXISTS (SELECT 1 FROM public.property_admin_timers t
                             WHERE t.property_id = p.id AND t.level = p.queue_level AND t.status='running') LOOP
    PERFORM public.property_escalate(r.id);
    escalated := escalated + 1;
  END LOOP;

  RETURN jsonb_build_object('released', released, 'escalated', escalated);
END;
$$;

GRANT EXECUTE ON FUNCTION public.property_submit_for_review(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.property_hold(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.property_release(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.property_reject_review(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.property_submit_verification_to_owner(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.property_owner_decision(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_eligible_admins(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_admin_level(uuid) TO authenticated;