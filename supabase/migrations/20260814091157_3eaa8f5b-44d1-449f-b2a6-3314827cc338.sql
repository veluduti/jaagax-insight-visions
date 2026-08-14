-- Phase 2: agent verification lane

ALTER TABLE public.workflow_settings
  ADD COLUMN IF NOT EXISTS agent_response_minutes integer NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS agent_visit_days integer NOT NULL DEFAULT 3;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS agent_response_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS agent_visit_at timestamptz,
  ADD COLUMN IF NOT EXISTS agent_visit_completed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_properties_assigned_agent ON public.properties(assigned_agent_id);

-- Assign an agent (holding admin or super admin)
CREATE OR REPLACE FUNCTION public.property_assign_agent(_property_id uuid, _agent_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; cfg record; uid uuid := auth.uid(); dl timestamptz;
BEGIN
  SELECT * INTO p FROM public.properties WHERE id=_property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF p.hold_admin_id IS DISTINCT FROM uid AND NOT public.is_admin(uid) THEN
    RAISE EXCEPTION 'Only the holding admin can assign an agent';
  END IF;
  SELECT * INTO cfg FROM public.workflow_settings LIMIT 1;
  dl := now() + make_interval(mins => cfg.agent_response_minutes);

  UPDATE public.properties SET
    assigned_agent_id = _agent_user_id,
    agent_assignment_status = 'pending',
    agent_assigned_at = now(),
    agent_accepted_at = NULL,
    agent_rejected_at = NULL,
    agent_rejection_reason = NULL,
    agent_response_deadline = dl,
    lifecycle_status = 'agent_assigned',
    edit_locked = true
  WHERE id=_property_id;

  INSERT INTO public.property_hold_events(property_id, admin_id, level, action, metadata)
    VALUES (_property_id, uid, p.queue_level, 'agent_assigned',
            jsonb_build_object('agent_user_id', _agent_user_id, 'deadline', dl));

  INSERT INTO public.notifications(user_id, title, message, type, link)
  VALUES (_agent_user_id, 'New verification assignment',
    'You have been assigned to verify "' || COALESCE(p.title,'a property') || '". Respond before '
    || to_char(dl, 'DD Mon YYYY, HH12:MI AM') || '.', 'info', '/agent-dashboard');

  IF p.submitted_by IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (p.submitted_by, 'Verification agent assigned',
      'A JAAGAX agent has been assigned to verify "' || COALESCE(p.title,'your property') || '".',
      'info', '/dashboard/customer');
  END IF;

  RETURN jsonb_build_object('assigned_to', _agent_user_id, 'deadline', dl);
END;
$$;

-- Agent accepts or declines
CREATE OR REPLACE FUNCTION public.property_agent_respond(_property_id uuid, _accept boolean, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; uid uuid := auth.uid();
BEGIN
  SELECT * INTO p FROM public.properties WHERE id=_property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF p.assigned_agent_id IS DISTINCT FROM uid THEN
    RAISE EXCEPTION 'You are not the assigned agent';
  END IF;
  IF p.agent_assignment_status <> 'pending' THEN
    RAISE EXCEPTION 'This assignment has already been answered';
  END IF;

  IF _accept THEN
    UPDATE public.properties SET
      agent_assignment_status='accepted', agent_accepted_at=now(),
      lifecycle_status='agent_accepted'
    WHERE id=_property_id;

    INSERT INTO public.property_hold_events(property_id, admin_id, level, action)
      VALUES (_property_id, uid, p.queue_level, 'agent_accepted');

    IF p.hold_admin_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, title, message, type, link)
      VALUES (p.hold_admin_id, 'Agent accepted the assignment',
        'The agent accepted the verification for "' || COALESCE(p.title,'') || '".', 'success', '/admin');
    END IF;
    RETURN jsonb_build_object('status','accepted');
  END IF;

  UPDATE public.properties SET
    agent_assignment_status='rejected', agent_rejected_at=now(), agent_rejection_reason=_reason,
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
$$;

-- Agent schedules the site visit
CREATE OR REPLACE FUNCTION public.property_agent_schedule_visit(_property_id uuid, _visit_at timestamptz, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; cfg record; uid uuid := auth.uid(); deadline timestamptz;
BEGIN
  SELECT * INTO p FROM public.properties WHERE id=_property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF p.assigned_agent_id IS DISTINCT FROM uid AND NOT public.is_admin(uid) THEN
    RAISE EXCEPTION 'Only the assigned agent can schedule the visit';
  END IF;
  SELECT * INTO cfg FROM public.workflow_settings LIMIT 1;
  deadline := COALESCE(p.agent_accepted_at, now()) + make_interval(days => cfg.agent_visit_days);
  IF _visit_at < now() - interval '5 minutes' THEN RAISE EXCEPTION 'Visit date cannot be in the past'; END IF;
  IF _visit_at > deadline THEN
    RAISE EXCEPTION 'Visit must happen within % day(s) of accepting the assignment', cfg.agent_visit_days;
  END IF;

  UPDATE public.properties SET
    agent_visit_at=_visit_at, agent_notes=COALESCE(_notes, agent_notes),
    lifecycle_status='visit_scheduled'
  WHERE id=_property_id;

  INSERT INTO public.property_hold_events(property_id, admin_id, level, action, reason, metadata)
    VALUES (_property_id, uid, p.queue_level, 'agent_visit_scheduled', _notes, jsonb_build_object('visit_at', _visit_at));

  IF p.submitted_by IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (p.submitted_by, 'Site visit scheduled',
      'The JAAGAX agent will visit "' || COALESCE(p.title,'your property') || '" on '
      || to_char(_visit_at, 'DD Mon YYYY, HH12:MI AM') || '.', 'info', '/dashboard/customer');
  END IF;
  RETURN jsonb_build_object('visit_at', _visit_at, 'deadline', deadline);
END;
$$;

-- Agent starts the on-site verification
CREATE OR REPLACE FUNCTION public.property_agent_start_verification(_property_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; uid uuid := auth.uid();
BEGIN
  SELECT * INTO p FROM public.properties WHERE id=_property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF p.assigned_agent_id IS DISTINCT FROM uid THEN RAISE EXCEPTION 'You are not the assigned agent'; END IF;
  UPDATE public.properties SET lifecycle_status='under_verification' WHERE id=_property_id;
  INSERT INTO public.property_hold_events(property_id, admin_id, level, action)
    VALUES (_property_id, uid, p.queue_level, 'verification_started');
  RETURN jsonb_build_object('status','under_verification');
END;
$$;

-- Agent submits the verification report
CREATE OR REPLACE FUNCTION public.property_agent_submit_report(
  _property_id uuid, _photos text[] DEFAULT '{}', _geo_photos jsonb DEFAULT '[]'::jsonb,
  _video_url text DEFAULT NULL, _remarks text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; uid uuid := auth.uid(); vid uuid;
BEGIN
  SELECT * INTO p FROM public.properties WHERE id=_property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF p.assigned_agent_id IS DISTINCT FROM uid THEN RAISE EXCEPTION 'You are not the assigned agent'; END IF;
  IF COALESCE(array_length(_photos,1),0) = 0 THEN RAISE EXCEPTION 'At least one site photo is required'; END IF;

  INSERT INTO public.property_verifications(property_id, agent_id, photos, geo_photos, video_url, remarks, submitted_at)
  VALUES (_property_id, uid, _photos, _geo_photos, _video_url, _remarks, now())
  RETURNING id INTO vid;

  UPDATE public.properties SET
    lifecycle_status='verification_submitted',
    agent_submitted_at=now(),
    agent_visit_completed_at=now(),
    agent_notes=COALESCE(_remarks, agent_notes)
  WHERE id=_property_id;

  INSERT INTO public.property_hold_events(property_id, admin_id, level, action, reason, metadata)
    VALUES (_property_id, uid, p.queue_level, 'verification_submitted', _remarks,
            jsonb_build_object('verification_id', vid, 'photo_count', COALESCE(array_length(_photos,1),0)));

  IF p.hold_admin_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (p.hold_admin_id, 'Verification report submitted',
      'The agent submitted the verification report for "' || COALESCE(p.title,'') || '". Please review.',
      'info', '/admin');
  END IF;
  RETURN jsonb_build_object('verification_id', vid);
END;
$$;

-- Admin reviews the agent report
CREATE OR REPLACE FUNCTION public.property_admin_review_verification(_property_id uuid, _approve boolean, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; uid uuid := auth.uid();
BEGIN
  SELECT * INTO p FROM public.properties WHERE id=_property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF p.hold_admin_id IS DISTINCT FROM uid AND NOT public.is_admin(uid) THEN
    RAISE EXCEPTION 'Only the reviewing admin can review this report';
  END IF;

  UPDATE public.property_verifications
     SET reviewed_by=uid, reviewed_at=now(), review_notes=_notes
   WHERE property_id=_property_id AND reviewed_at IS NULL;

  IF _approve THEN
    UPDATE public.properties SET
      lifecycle_status='owner_review', owner_review_requested_at=now()
    WHERE id=_property_id;

    INSERT INTO public.property_hold_events(property_id, admin_id, level, action, reason)
      VALUES (_property_id, uid, p.queue_level, 'verification_approved', _notes);

    IF p.submitted_by IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, title, message, type, link)
      VALUES (p.submitted_by, 'Verification complete - your approval needed',
        'The verification of "' || COALESCE(p.title,'your property') || '" is complete. Please review and approve to go live.',
        'success', '/dashboard/customer');
    END IF;
    RETURN jsonb_build_object('status','owner_review');
  END IF;

  UPDATE public.properties SET lifecycle_status='under_verification' WHERE id=_property_id;
  INSERT INTO public.property_hold_events(property_id, admin_id, level, action, reason)
    VALUES (_property_id, uid, p.queue_level, 'verification_rework', _notes);

  IF p.assigned_agent_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (p.assigned_agent_id, 'Verification report needs rework',
      'The admin requested changes for "' || COALESCE(p.title,'') || '". ' || COALESCE(_notes,''),
      'alert', '/agent-dashboard');
  END IF;
  RETURN jsonb_build_object('status','rework');
END;
$$;

-- Automation: cancel assignments the agent never answered
CREATE OR REPLACE FUNCTION public.workflow_tick()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; released int := 0; escalated int := 0; agent_timeouts int := 0; cfg record;
BEGIN
  SELECT * INTO cfg FROM public.workflow_settings LIMIT 1;

  -- agent response timeouts
  FOR r IN SELECT id, title, queue_level, hold_admin_id, assigned_agent_id
             FROM public.properties
            WHERE agent_assignment_status = 'pending'
              AND agent_response_deadline IS NOT NULL
              AND agent_response_deadline < now() LOOP
    UPDATE public.properties SET
      agent_assignment_status='rejected', agent_rejected_at=now(),
      agent_rejection_reason='No response before deadline',
      assigned_agent_id=NULL, agent_response_deadline=NULL,
      lifecycle_status = COALESCE(NULLIF(r.queue_level,'') || '_hold', 'pending_admin_review')::property_lifecycle_status
    WHERE id=r.id;
    INSERT INTO public.property_hold_events(property_id, admin_id, level, action, reason)
      VALUES (r.id, r.assigned_agent_id, r.queue_level, 'agent_timeout', 'No response before deadline');
    IF r.hold_admin_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, title, message, type, link)
      VALUES (r.hold_admin_id, 'Agent did not respond',
        'The assigned agent did not respond for "' || COALESCE(r.title,'') || '". Please assign another agent.',
        'alert', '/admin');
    END IF;
    agent_timeouts := agent_timeouts + 1;
  END LOOP;

  IF cfg.auto_release_enabled THEN
    FOR r IN SELECT id FROM public.properties
             WHERE is_locked = true AND hold_expires_at IS NOT NULL AND hold_expires_at < now()
               AND assigned_agent_id IS NULL LOOP
      PERFORM public.property_release(r.id, 'Hold expired automatically');
      released := released + 1;
    END LOOP;
  END IF;

  UPDATE public.property_admin_timers SET status='expired'
   WHERE status='running' AND expires_at < now();

  FOR r IN SELECT p.id FROM public.properties p
           WHERE p.queue_level IS NOT NULL AND p.is_locked = false
             AND p.assigned_agent_id IS NULL
             AND NOT EXISTS (SELECT 1 FROM public.property_admin_timers t
                             WHERE t.property_id = p.id AND t.level = p.queue_level AND t.status='running') LOOP
    PERFORM public.property_escalate(r.id);
    escalated := escalated + 1;
  END LOOP;

  RETURN jsonb_build_object('released', released, 'escalated', escalated, 'agent_timeouts', agent_timeouts);
END;
$$;

GRANT EXECUTE ON FUNCTION public.property_assign_agent(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.property_agent_respond(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.property_agent_schedule_visit(uuid, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.property_agent_start_verification(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.property_agent_submit_report(uuid, text[], jsonb, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.property_admin_review_verification(uuid, boolean, text) TO authenticated;