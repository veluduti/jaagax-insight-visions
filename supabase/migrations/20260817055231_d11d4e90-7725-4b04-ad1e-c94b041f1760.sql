-- Best-matched nearby agent for a property, ranked by location closeness,
-- then trust/rating, then lightest workload.
CREATE OR REPLACE FUNCTION public.property_best_matched_agent(_property_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE p record; pick uuid;
BEGIN
  SELECT city, locality, district, state, country INTO p
  FROM public.properties WHERE id = _property_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT a.user_id INTO pick
  FROM public.agents a
  WHERE a.verified = true
    AND a.user_id IS NOT NULL
    AND (
         (p.locality IS NOT NULL AND p.locality <> '' AND (
            lower(COALESCE(a.locality,'')) = lower(p.locality)
            OR COALESCE(a.localities_served,'') ILIKE '%' || p.locality || '%'
            OR COALESCE(a.cities_served,'') ILIKE '%' || p.locality || '%'))
      OR (p.district IS NOT NULL AND p.district <> '' AND lower(COALESCE(a.district,'')) = lower(p.district))
      OR (p.city IS NOT NULL AND p.city <> '' AND (
            lower(COALESCE(a.city,'')) = lower(p.city)
            OR COALESCE(a.cities_served,'') ILIKE '%' || p.city || '%'))
      OR (p.state IS NOT NULL AND p.state <> '' AND lower(COALESCE(a.state,'')) = lower(p.state))
    )
  ORDER BY
    CASE
      WHEN p.locality IS NOT NULL AND p.locality <> '' AND (
             lower(COALESCE(a.locality,'')) = lower(p.locality)
             OR COALESCE(a.localities_served,'') ILIKE '%' || p.locality || '%') THEN 1
      WHEN p.district IS NOT NULL AND p.district <> '' AND lower(COALESCE(a.district,'')) = lower(p.district) THEN 2
      WHEN p.city IS NOT NULL AND p.city <> '' AND (
             lower(COALESCE(a.city,'')) = lower(p.city)
             OR COALESCE(a.cities_served,'') ILIKE '%' || p.city || '%') THEN 3
      ELSE 4
    END,
    COALESCE(a.trust_score, 0) DESC,
    COALESCE(a.avg_rating, 0) DESC,
    COALESCE(a.sales_count, 0) DESC,
    (SELECT COUNT(*) FROM public.properties q
      WHERE q.assigned_agent_id = a.user_id
        AND q.lifecycle_status IN ('agent_assigned','agent_accepted','visit_scheduled','under_verification')) ASC
  LIMIT 1;

  RETURN pick;
END;
$function$;

-- Auto-assign the best matched agent (no holding-admin requirement).
CREATE OR REPLACE FUNCTION public.property_auto_assign_agent(_property_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE p record; cfg record; agent_uid uuid; dl timestamptz;
BEGIN
  SELECT * INTO p FROM public.properties WHERE id = _property_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','property_not_found'); END IF;
  IF p.assigned_agent_id IS NOT NULL THEN
    RETURN jsonb_build_object('skipped','already_assigned');
  END IF;

  agent_uid := public.property_best_matched_agent(_property_id);
  IF agent_uid IS NULL THEN
    RETURN jsonb_build_object('assigned', false, 'reason', 'no_matching_agent');
  END IF;

  SELECT * INTO cfg FROM public.workflow_settings LIMIT 1;
  dl := now() + make_interval(mins => COALESCE(cfg.agent_response_minutes, 120));

  UPDATE public.properties SET
    assigned_agent_id = agent_uid,
    agent_assignment_status = 'pending',
    agent_assigned_at = now(),
    agent_accepted_at = NULL,
    agent_rejected_at = NULL,
    agent_rejection_reason = NULL,
    agent_response_deadline = dl,
    lifecycle_status = 'agent_assigned',
    edit_locked = true,
    is_locked = false,
    hold_admin_id = NULL, hold_admin_role = NULL,
    hold_started_at = NULL, hold_expires_at = NULL
  WHERE id = _property_id;

  INSERT INTO public.property_hold_events(property_id, level, action, metadata)
    VALUES (_property_id, p.queue_level, 'agent_auto_assigned',
            jsonb_build_object('agent_user_id', agent_uid, 'deadline', dl,
                               'reason', 'All admin levels released — best matched nearby agent assigned'));

  INSERT INTO public.notifications(user_id, title, message, type, link)
  VALUES (agent_uid, 'New verification assignment',
    'You have been auto-assigned to verify "' || COALESCE(p.title,'a property')
    || '". Respond before ' || to_char(dl, 'DD Mon YYYY, HH12:MI AM') || '.',
    'info', '/agent-dashboard');

  IF p.submitted_by IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (p.submitted_by, 'Verification agent assigned',
      'A JAAGAX agent near your property has been assigned to verify "'
      || COALESCE(p.title,'your property') || '".', 'info', '/dashboard/customer');
  END IF;

  RETURN jsonb_build_object('assigned', true, 'agent_user_id', agent_uid, 'deadline', dl);
END;
$function$;

-- After the last level (district) releases/expires: auto-assign when the owner
-- asked for an agent, otherwise fall back to the Super Admin as before.
CREATE OR REPLACE FUNCTION public.property_escalate(_property_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE p record; nxt text; res jsonb;
BEGIN
  SELECT * INTO p FROM public.properties WHERE id = _property_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','property_not_found'); END IF;
  nxt := public.workflow_next_level(COALESCE(p.queue_level,'country'));
  UPDATE public.property_admin_timers SET status='expired'
   WHERE property_id=_property_id AND status IN ('running','paused');
  INSERT INTO public.property_hold_events(property_id, level, action, reason)
    VALUES (_property_id, p.queue_level, 'escalated', 'Queue completed without verification');

  IF nxt IS NULL THEN
    IF COALESCE(p.needs_agent, false) THEN
      res := public.property_auto_assign_agent(_property_id);
      IF COALESCE((res->>'assigned')::boolean, false) THEN
        UPDATE public.properties SET queue_level = NULL, queue_expires_at = NULL
         WHERE id = _property_id;
        RETURN jsonb_build_object('escalated_to','agent', 'agent', res);
      END IF;
    END IF;
    UPDATE public.properties SET lifecycle_status='pending_admin_review', queue_level=NULL,
      queue_expires_at=NULL, is_locked=false WHERE id=_property_id;
    RETURN jsonb_build_object('escalated_to','super_admin');
  END IF;

  RETURN public.property_enter_queue(_property_id, nxt);
END;
$function$;

-- Same rule when a level is skipped for having no eligible admins.
CREATE OR REPLACE FUNCTION public.property_enter_queue(_property_id uuid, _level text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p record; cfg record; mins integer; admin_ids uuid[]; expires timestamptz; nxt text; res jsonb;
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
      IF COALESCE(p.needs_agent, false) THEN
        res := public.property_auto_assign_agent(_property_id);
        IF COALESCE((res->>'assigned')::boolean, false) THEN
          UPDATE public.properties SET queue_level = NULL, queue_started_at = NULL, queue_expires_at = NULL
           WHERE id = _property_id;
          RETURN jsonb_build_object('escalated_to','agent', 'agent', res);
        END IF;
      END IF;
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
$function$;