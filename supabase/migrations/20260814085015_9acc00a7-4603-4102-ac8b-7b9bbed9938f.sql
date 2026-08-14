-- Phase 1: visit scheduling, closure, and no-agent (Scenario 2) rules

ALTER TABLE public.workflow_settings
  ADD COLUMN IF NOT EXISTS no_agent_max_hold_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS no_agent_review_days_min integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS no_agent_review_days_max integer NOT NULL DEFAULT 10;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS verification_visit_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_visit_notes text,
  ADD COLUMN IF NOT EXISTS closed_reason text,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by uuid;

-- hold: shorter hold window when no agent was requested + review-window message
CREATE OR REPLACE FUNCTION public.property_hold(_property_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; cfg record; lvl text; uid uuid := auth.uid(); expires timestamptz; hrs integer;
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
  hrs := CASE WHEN p.needs_agent THEN cfg.max_hold_hours ELSE cfg.no_agent_max_hold_hours END;
  expires := now() + make_interval(hours => hrs);

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

  INSERT INTO public.property_hold_events(property_id, admin_id, level, action, metadata)
    VALUES (_property_id, uid, lvl, 'hold', jsonb_build_object('needs_agent', p.needs_agent, 'hold_hours', hrs));

  IF p.submitted_by IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (p.submitted_by, 'Your property is under review',
      CASE WHEN p.needs_agent
        THEN 'A JAAGAX ' || initcap(lvl) || ' Admin is reviewing "' || COALESCE(p.title,'your property') || '" and will schedule a visit shortly.'
        ELSE 'JAAGAX is reviewing "' || COALESCE(p.title,'your property') || '". Estimated review time: '
             || cfg.no_agent_review_days_min || '-' || cfg.no_agent_review_days_max || ' days.'
      END,
      'info', '/dashboard/customer');
  END IF;

  RETURN jsonb_build_object('held_by', uid, 'level', lvl, 'hold_expires_at', expires, 'needs_agent', p.needs_agent);
END;
$$;

-- schedule a verification visit (holding admin only)
CREATE OR REPLACE FUNCTION public.property_schedule_verification_visit(
  _property_id uuid, _visit_at timestamptz, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; cfg record; uid uuid := auth.uid(); deadline timestamptz;
BEGIN
  SELECT * INTO p FROM public.properties WHERE id = _property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF p.hold_admin_id IS DISTINCT FROM uid AND NOT public.is_admin(uid) THEN
    RAISE EXCEPTION 'Only the holding admin can schedule the visit';
  END IF;
  SELECT * INTO cfg FROM public.workflow_settings LIMIT 1;
  deadline := COALESCE(p.hold_started_at, now()) + make_interval(days => cfg.visit_window_days);
  IF _visit_at < now() - interval '5 minutes' THEN
    RAISE EXCEPTION 'Visit date cannot be in the past';
  END IF;
  IF _visit_at > deadline THEN
    RAISE EXCEPTION 'Visit must be scheduled within % day(s) of the hold', cfg.visit_window_days;
  END IF;

  UPDATE public.properties
     SET verification_visit_at = _visit_at, verification_visit_notes = _notes
   WHERE id = _property_id;

  INSERT INTO public.property_hold_events(property_id, admin_id, level, action, reason, metadata)
    VALUES (_property_id, uid, p.queue_level, 'visit_scheduled', _notes,
            jsonb_build_object('visit_at', _visit_at));

  IF p.submitted_by IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (p.submitted_by, 'Verification visit scheduled',
      'A JAAGAX admin will visit "' || COALESCE(p.title,'your property') || '" on '
      || to_char(_visit_at, 'DD Mon YYYY, HH12:MI AM') || '.', 'info', '/dashboard/customer');
  END IF;

  RETURN jsonb_build_object('visit_at', _visit_at, 'deadline', deadline);
END;
$$;

-- close a property (sold / rented / owner cancelled) - removes from every queue
CREATE OR REPLACE FUNCTION public.property_close(_property_id uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; uid uuid := auth.uid();
BEGIN
  SELECT * INTO p FROM public.properties WHERE id = _property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF p.hold_admin_id IS DISTINCT FROM uid
     AND p.submitted_by IS DISTINCT FROM uid
     AND NOT public.is_admin(uid) THEN
    RAISE EXCEPTION 'Only the holding admin or the owner can close this property';
  END IF;

  UPDATE public.property_admin_timers SET status='expired', remaining_seconds=0
   WHERE property_id = _property_id AND status IN ('running','paused','held');

  UPDATE public.properties SET
    lifecycle_status = 'closed', closed_reason = _reason, closed_at = now(), closed_by = uid,
    is_live = false, is_locked = false, edit_locked = false,
    queue_level = NULL, queue_started_at = NULL, queue_expires_at = NULL,
    hold_admin_id = NULL, hold_admin_role = NULL, hold_started_at = NULL, hold_expires_at = NULL
  WHERE id = _property_id;

  INSERT INTO public.property_hold_events(property_id, admin_id, level, action, reason)
    VALUES (_property_id, uid, p.queue_level, 'closed', _reason);

  IF p.submitted_by IS NOT NULL AND p.submitted_by <> uid THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (p.submitted_by, 'Property closed',
      '"' || COALESCE(p.title,'Your property') || '" was closed. Reason: ' || COALESCE(_reason,'Not specified'),
      'alert', '/dashboard/customer');
  END IF;

  RETURN jsonb_build_object('closed', true);
END;
$$;

-- escalation now notifies the owner too
CREATE OR REPLACE FUNCTION public.property_escalate(_property_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; nxt text; res jsonb;
BEGIN
  SELECT * INTO p FROM public.properties WHERE id=_property_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','not_found'); END IF;
  IF p.lifecycle_status IN ('closed','rejected','sold') THEN
    RETURN jsonb_build_object('skipped', p.lifecycle_status::text);
  END IF;
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

  IF p.submitted_by IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (p.submitted_by, 'Review moved to the next level',
      '"' || COALESCE(p.title,'Your property') || '" has moved to the ' || initcap(nxt) || ' Admin review queue.',
      'info', '/dashboard/customer');
  END IF;

  res := public.property_enter_queue(_property_id, nxt);
  RETURN res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.property_schedule_verification_visit(uuid, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.property_close(uuid, text) TO authenticated;