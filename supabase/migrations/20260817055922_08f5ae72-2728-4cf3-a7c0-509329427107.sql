CREATE OR REPLACE FUNCTION public.workflow_tick()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r record; released int := 0; escalated int := 0; agent_timeouts int := 0; cfg record;
BEGIN
  SELECT * INTO cfg FROM public.workflow_settings LIMIT 1;

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
               AND COALESCE(agent_assignment_status::text,'') NOT IN ('pending','accepted') LOOP
      PERFORM public.property_release(r.id, 'Hold expired automatically');
      released := released + 1;
    END LOOP;
  END IF;

  UPDATE public.property_admin_timers SET status='expired'
   WHERE status='running' AND expires_at < now();

  FOR r IN SELECT p.id FROM public.properties p
           WHERE p.queue_level IS NOT NULL AND p.is_locked = false
             AND COALESCE(p.agent_assignment_status::text,'') NOT IN ('pending','accepted')
             AND (p.queue_expires_at IS NULL OR p.queue_expires_at < now())
             AND NOT EXISTS (SELECT 1 FROM public.property_admin_timers t
                             WHERE t.property_id = p.id AND t.level = p.queue_level AND t.status='running') LOOP
    PERFORM public.property_escalate(r.id);
    escalated := escalated + 1;
  END LOOP;

  RETURN jsonb_build_object('released', released, 'escalated', escalated, 'agent_timeouts', agent_timeouts);
END;
$function$;

SELECT public.workflow_tick();