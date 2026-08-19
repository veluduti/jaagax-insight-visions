CREATE OR REPLACE FUNCTION public.is_valid_property_transition(_from property_lifecycle_status, _to property_lifecycle_status)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT _from IS NULL
      OR _from = _to
      OR _to::text ~ '^(country|state|district)_(queue|hold|verified)$'
      OR _from::text ~ '^(country|state|district)_(queue|hold|verified)$'
      OR _to = 'owner_review'
      OR _from = 'owner_review'
      OR (_from, _to) IN (
        ('draft','submitted'),
        ('draft','cancelled_by_owner'),
        ('submitted','pending_admin_review'),
        ('submitted','cancelled_by_owner'),
        ('pending_admin_review','live'),
        ('pending_admin_review','agent_assigned'),
        ('pending_admin_review','rejected'),
        ('pending_admin_review','cancelled_by_owner'),
        ('agent_assigned','agent_accepted'),
        ('agent_assigned','agent_rejected'),
        ('agent_assigned','pending_admin_review'),
        ('agent_assigned','cancelled_by_owner'),
        ('agent_rejected','pending_admin_review'),
        ('agent_accepted','visit_scheduled'),
        ('agent_accepted','cancelled_by_owner'),
        ('visit_scheduled','visit_confirmed'),
        ('visit_scheduled','visit_reschedule_requested'),
        ('visit_scheduled','under_verification'),
        ('visit_scheduled','cancelled_by_owner'),
        ('visit_reschedule_requested','visit_scheduled'),
        ('visit_reschedule_requested','visit_confirmed'),
        ('visit_reschedule_requested','cancelled_by_owner'),
        ('visit_confirmed','under_verification'),
        ('visit_confirmed','cancelled_by_owner'),
        ('under_verification','verification_submitted'),
        ('verification_submitted','pending_final_approval'),
        ('pending_final_approval','live_verified'),
        ('pending_final_approval','rejected'),
        ('live','expired'),
        ('live','cancelled_by_owner'),
        ('live','sold'),
        ('live_verified','expired'),
        ('live_verified','cancelled_by_owner'),
        ('live_verified','sold'),
        ('expired','renewed'),
        ('renewed','live'),
        ('renewed','live_verified'),
        ('renewed','pending_admin_review'),
        ('rejected','pending_admin_review')
      );
$$;

CREATE OR REPLACE FUNCTION public.workflow_tick()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record; released int := 0; escalated int := 0; agent_timeouts int := 0;
  failures int := 0; cfg record;
BEGIN
  SELECT * INTO cfg FROM public.workflow_settings LIMIT 1;

  -- 1. Agent response timeouts (each row isolated)
  FOR r IN SELECT id, title, queue_level, hold_admin_id, assigned_agent_id
             FROM public.properties
            WHERE agent_assignment_status = 'pending'
              AND agent_response_deadline IS NOT NULL
              AND agent_response_deadline < now() LOOP
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      failures := failures + 1;
      RAISE WARNING 'workflow_tick agent timeout failed for %: %', r.id, SQLERRM;
    END;
  END LOOP;

  -- 2. Expired holds
  IF COALESCE(cfg.auto_release_enabled, true) THEN
    FOR r IN SELECT id FROM public.properties
             WHERE is_locked = true AND hold_expires_at IS NOT NULL AND hold_expires_at < now()
               AND COALESCE(agent_assignment_status::text,'') NOT IN ('pending','accepted') LOOP
      BEGIN
        PERFORM public.property_release(r.id, 'Hold expired automatically');
        released := released + 1;
      EXCEPTION WHEN OTHERS THEN
        failures := failures + 1;
        RAISE WARNING 'workflow_tick release failed for %: %', r.id, SQLERRM;
      END;
    END LOOP;
  END IF;

  -- 3. Expire admin timers whose window has passed
  UPDATE public.property_admin_timers SET status='expired'
   WHERE status='running' AND expires_at < now();

  -- 4. Escalate queues where every timer at the level is done
  FOR r IN SELECT p.id FROM public.properties p
           WHERE p.queue_level IS NOT NULL AND p.is_locked = false
             AND COALESCE(p.agent_assignment_status::text,'') NOT IN ('pending','accepted')
             AND (p.queue_expires_at IS NULL OR p.queue_expires_at < now())
             AND NOT EXISTS (SELECT 1 FROM public.property_admin_timers t
                             WHERE t.property_id = p.id AND t.level = p.queue_level AND t.status='running') LOOP
    BEGIN
      PERFORM public.property_escalate(r.id);
      escalated := escalated + 1;
    EXCEPTION WHEN OTHERS THEN
      failures := failures + 1;
      RAISE WARNING 'workflow_tick escalate failed for %: %', r.id, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object('released', released, 'escalated', escalated,
                            'agent_timeouts', agent_timeouts, 'failures', failures);
END;
$$;