-- 1. Release = the whole level declines -> escalate immediately to the next level
CREATE OR REPLACE FUNCTION public.property_release(_property_id uuid, _reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE p record; lvl text; uid uuid := auth.uid();
BEGIN
  SELECT * INTO p FROM public.properties WHERE id = _property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF p.hold_admin_id IS DISTINCT FROM uid AND NOT public.is_admin(uid) THEN
    RAISE EXCEPTION 'Only the holding admin can release this property';
  END IF;
  lvl := COALESCE(p.queue_level, 'country');

  -- the level is done: close every timer at this level
  UPDATE public.property_admin_timers SET status='expired', remaining_seconds=0, paused_at=NULL
   WHERE property_id=_property_id AND level=lvl AND status IN ('running','paused','held');

  UPDATE public.properties SET
    is_locked=false, hold_admin_id=NULL, hold_admin_role=NULL,
    hold_started_at=NULL, hold_expires_at=NULL, edit_locked=false,
    queue_expires_at=now()
  WHERE id=_property_id;

  INSERT INTO public.property_hold_events(property_id, admin_id, level, action, reason)
    VALUES (_property_id, uid, lvl, 'release', COALESCE(_reason, 'Level released — escalating to next level'));

  RETURN public.property_escalate(_property_id);
END;
$function$;

-- 2. Ladder exhausted (district done) -> always try the best matched nearby agent first
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
   WHERE property_id=_property_id AND status IN ('running','paused','held');
  INSERT INTO public.property_hold_events(property_id, level, action, reason)
    VALUES (_property_id, p.queue_level, 'escalated', 'Level completed without verification');

  IF nxt IS NULL THEN
    res := public.property_auto_assign_agent(_property_id);
    IF COALESCE((res->>'assigned')::boolean, false) THEN
      UPDATE public.properties SET queue_level = NULL, queue_expires_at = NULL
       WHERE id = _property_id;
      RETURN jsonb_build_object('escalated_to','agent', 'agent', res);
    END IF;
    UPDATE public.properties SET lifecycle_status='pending_admin_review', queue_level=NULL,
      queue_expires_at=NULL, is_locked=false WHERE id=_property_id;
    RETURN jsonb_build_object('escalated_to','super_admin', 'agent', res);
  END IF;

  RETURN public.property_enter_queue(_property_id, nxt);
END;
$function$;

-- 3. Same rule when a level has no eligible admins at all
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
      res := public.property_auto_assign_agent(_property_id);
      IF COALESCE((res->>'assigned')::boolean, false) THEN
        UPDATE public.properties SET queue_level = NULL, queue_started_at = NULL, queue_expires_at = NULL
         WHERE id = _property_id;
        RETURN jsonb_build_object('escalated_to','agent', 'agent', res);
      END IF;
      UPDATE public.properties
        SET lifecycle_status = 'pending_admin_review', queue_level = NULL,
            queue_started_at = NULL, queue_expires_at = NULL
        WHERE id = _property_id;
      RETURN jsonb_build_object('escalated_to','super_admin', 'agent', res);
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