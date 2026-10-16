CREATE OR REPLACE FUNCTION public.property_auto_assign_agent(_property_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p record; cfg record; agent_id uuid; agent_uid uuid; dl timestamptz;
BEGIN
  SELECT * INTO p FROM public.properties WHERE id = _property_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','property_not_found'); END IF;
  IF p.assigned_agent_id IS NOT NULL THEN
    RETURN jsonb_build_object('skipped','already_assigned');
  END IF;
  agent_id := public.property_best_matched_agent(_property_id);
  IF agent_id IS NULL THEN
    RETURN jsonb_build_object('assigned', false, 'reason', 'no_matching_agent');
  END IF;
  SELECT user_id INTO agent_uid FROM public.agents WHERE id = agent_id;
  IF agent_uid IS NULL THEN
    RETURN jsonb_build_object('assigned', false, 'reason', 'agent_has_no_login');
  END IF;
  SELECT * INTO cfg FROM public.workflow_settings LIMIT 1;
  dl := now() + make_interval(mins => COALESCE(cfg.agent_response_minutes, 120));
  UPDATE public.properties SET
    assigned_agent_id = agent_uid, agent_assignment_status = 'pending', agent_assigned_at = now(),
    agent_accepted_at = NULL, agent_rejected_at = NULL, agent_rejection_reason = NULL,
    agent_response_deadline = dl, lifecycle_status = 'agent_assigned', edit_locked = true, is_locked = false,
    hold_admin_id = NULL, hold_admin_role = NULL, hold_started_at = NULL, hold_expires_at = NULL
  WHERE id = _property_id;
  INSERT INTO public.property_hold_events(property_id, level, action, metadata)
    VALUES (_property_id, p.queue_level, 'agent_auto_assigned',
            jsonb_build_object('agent_id', agent_id, 'agent_user_id', agent_uid, 'deadline', dl,
                               'reason', 'All admin levels released — best matched nearby agent assigned'));
  INSERT INTO public.notifications(user_id, title, message, type, link)
  VALUES (agent_uid, 'New verification assignment',
    'You have been auto-assigned to verify "' || COALESCE(p.title,'a property')
    || '". Respond before ' || to_char(dl, 'DD Mon YYYY, HH12:MI AM') || '.', 'info', '/dashboard/agent');
  IF p.submitted_by IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (p.submitted_by, 'Verification agent assigned',
      'A JAAGAX agent near your property has been assigned to verify "'
      || COALESCE(p.title,'your property') || '".', 'info', '/dashboard/customer');
  END IF;
  RETURN jsonb_build_object('assigned', true, 'agent_id', agent_id, 'agent_user_id', agent_uid, 'deadline', dl);
END;
$function$;

CREATE OR REPLACE FUNCTION public.property_agent_respond(_property_id uuid, _accept boolean, _reason text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p record; uid uuid := auth.uid();
BEGIN
  SELECT * INTO p FROM public.properties WHERE id=_property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF p.assigned_agent_id IS DISTINCT FROM uid THEN RAISE EXCEPTION 'You are not the assigned agent'; END IF;
  IF p.agent_assignment_status <> 'pending' THEN RAISE EXCEPTION 'This assignment has already been answered'; END IF;
  IF _accept THEN
    UPDATE public.properties SET agent_assignment_status='accepted', agent_accepted_at=now(), lifecycle_status='agent_accepted'
    WHERE id=_property_id;
    INSERT INTO public.property_hold_events(property_id, admin_id, level, action)
      VALUES (_property_id, uid, p.queue_level, 'agent_accepted');
    IF p.hold_admin_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, title, message, type, link)
      VALUES (p.hold_admin_id, 'Agent accepted the assignment',
        'The agent accepted the verification for "' || COALESCE(p.title,'') || '".', 'success', '/admin');
    END IF;
    IF p.submitted_by IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, title, message, type, link)
      VALUES (p.submitted_by, 'Agent accepted your property',
        COALESCE((SELECT name FROM public.agents WHERE user_id = uid LIMIT 1), 'A JAAGAX agent')
        || ' accepted the verification of "' || COALESCE(p.title,'your property') || '" and will schedule a site visit soon.',
        'success', '/dashboard/customer');
    END IF;
    RETURN jsonb_build_object('status','accepted');
  END IF;
  UPDATE public.properties SET agent_assignment_status='rejected', agent_rejected_at=now(), agent_rejection_reason=_reason,
    assigned_agent_id = NULL, agent_response_deadline = NULL,
    lifecycle_status = COALESCE(NULLIF(p.queue_level,'') || '_hold', 'pending_admin_review')::property_lifecycle_status
  WHERE id=_property_id;
  INSERT INTO public.property_hold_events(property_id, admin_id, level, action, reason)
    VALUES (_property_id, uid, p.queue_level, 'agent_declined', _reason);
  IF p.hold_admin_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (p.hold_admin_id, 'Agent declined the assignment',
      'The agent declined "' || COALESCE(p.title,'') || '". Reason: ' || COALESCE(_reason,'Not specified')
      || '. Please assign another agent.', 'alert', '/admin');
  END IF;
  RETURN jsonb_build_object('status','declined');
END;
$function$;