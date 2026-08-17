-- 1. FIX: assigned_agent_id references agents.id, but the matcher returned agents.user_id.
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

  SELECT a.id INTO pick
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
      WHERE q.assigned_agent_id = a.id
        AND q.lifecycle_status IN ('agent_assigned','agent_accepted','visit_scheduled','under_verification')) ASC
  LIMIT 1;

  RETURN pick;
END;
$function$;

CREATE OR REPLACE FUNCTION public.property_auto_assign_agent(_property_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  SELECT * INTO cfg FROM public.workflow_settings LIMIT 1;
  dl := now() + make_interval(mins => COALESCE(cfg.agent_response_minutes, 120));

  UPDATE public.properties SET
    assigned_agent_id = agent_id,
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
            jsonb_build_object('agent_id', agent_id, 'agent_user_id', agent_uid, 'deadline', dl,
                               'reason', 'All admin levels released — best matched nearby agent assigned'));

  IF agent_uid IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (agent_uid, 'New verification assignment',
      'You have been auto-assigned to verify "' || COALESCE(p.title,'a property')
      || '". Respond before ' || to_char(dl, 'DD Mon YYYY, HH12:MI AM') || '.',
      'info', '/agent-dashboard');
  END IF;

  IF p.submitted_by IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (p.submitted_by, 'Verification agent assigned',
      'A JAAGAX agent near your property has been assigned to verify "'
      || COALESCE(p.title,'your property') || '".', 'info', '/dashboard/customer');
  END IF;

  RETURN jsonb_build_object('assigned', true, 'agent_id', agent_id, 'agent_user_id', agent_uid, 'deadline', dl);
END;
$function$;

-- 2. End-to-end self test: needs_agent = true walks Country -> State -> District -> Agent.
CREATE OR REPLACE FUNCTION public.workflow_e2e_agent_assignment_test()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tag text := 'E2E-' || substr(gen_random_uuid()::text, 1, 8);
  admin_ids uuid[];
  owner_id uuid;
  agent_uid uuid;
  agent_id uuid;
  prop_id uuid;
  steps jsonb := '[]'::jsonb;
  failures text[] := '{}';
  r jsonb;
  st text;
  assigned uuid;
  ev_count int;

  PROCEDURE_NOOP boolean;
BEGIN
  SELECT array_agg(id) INTO admin_ids FROM (SELECT id FROM auth.users LIMIT 3) u;
  SELECT id INTO owner_id FROM auth.users LIMIT 1;
  SELECT id INTO agent_uid FROM auth.users OFFSET 1 LIMIT 1;
  IF admin_ids IS NULL OR array_length(admin_ids,1) < 3 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'need at least 3 auth users to run this test');
  END IF;

  -- Fixtures: one admin per level scoped to a throwaway geography
  INSERT INTO public.admin_scopes(user_id, role, country, state, district, is_active)
  VALUES (admin_ids[1], 'country_admin', tag || '-Country', NULL, NULL, true),
         (admin_ids[2], 'state_admin',   tag || '-Country', tag || '-State', NULL, true),
         (admin_ids[3], 'district_admin',tag || '-Country', tag || '-State', tag || '-District', true);

  -- Fixture verified agent living in the property's district
  INSERT INTO public.agents(user_id, name, phone, verified, country, state, district, city, locality,
                            cities_served, localities_served, trust_score)
  VALUES (agent_uid, tag || ' Agent', '+910000000000', true,
          tag || '-Country', tag || '-State', tag || '-District', tag || '-City', tag || '-Locality',
          tag || '-City', tag || '-Locality', 99)
  RETURNING id INTO agent_id;

  -- Fixture property owned by a real user, needing a JAAGAX agent
  INSERT INTO public.properties(title, submitted_by, owner_id, country, state, district, city, locality,
                                lifecycle_status, listing_status, needs_agent)
  VALUES (tag || ' Property', owner_id, owner_id,
          tag || '-Country', tag || '-State', tag || '-District', tag || '-City', tag || '-Locality',
          'draft', 'draft', true)
  RETURNING id INTO prop_id;

  -- Step 1: submit -> country queue
  r := public.property_submit_for_review(prop_id, true);
  SELECT lifecycle_status::text INTO st FROM public.properties WHERE id = prop_id;
  steps := steps || jsonb_build_object('step','submit','result',r,'lifecycle_status',st);
  IF st <> 'country_queue' THEN failures := failures || ('submit expected country_queue, got ' || st); END IF;

  -- Step 2: country expires -> state queue
  r := public.property_escalate(prop_id);
  SELECT lifecycle_status::text INTO st FROM public.properties WHERE id = prop_id;
  steps := steps || jsonb_build_object('step','escalate_country','result',r,'lifecycle_status',st);
  IF st <> 'state_queue' THEN failures := failures || ('country escalation expected state_queue, got ' || st); END IF;

  -- Step 3: state expires -> district queue
  r := public.property_escalate(prop_id);
  SELECT lifecycle_status::text INTO st FROM public.properties WHERE id = prop_id;
  steps := steps || jsonb_build_object('step','escalate_state','result',r,'lifecycle_status',st);
  IF st <> 'district_queue' THEN failures := failures || ('state escalation expected district_queue, got ' || st); END IF;

  -- Step 4: district expires -> auto assign best matched agent
  r := public.property_escalate(prop_id);
  SELECT lifecycle_status::text, assigned_agent_id INTO st, assigned FROM public.properties WHERE id = prop_id;
  steps := steps || jsonb_build_object('step','escalate_district','result',r,'lifecycle_status',st,'assigned_agent_id',assigned);
  IF r->>'escalated_to' <> 'agent' THEN failures := failures || ('district escalation expected escalated_to=agent, got ' || COALESCE(r->>'escalated_to','null')); END IF;
  IF st <> 'agent_assigned' THEN failures := failures || ('expected agent_assigned, got ' || st); END IF;
  IF assigned IS DISTINCT FROM agent_id THEN failures := failures || 'assigned_agent_id is not the best matched fixture agent'; END IF;

  SELECT count(*) INTO ev_count FROM public.property_hold_events
   WHERE property_id = prop_id AND action = 'agent_auto_assigned';
  IF ev_count <> 1 THEN failures := failures || 'missing agent_auto_assigned audit event'; END IF;

  SELECT count(*) INTO ev_count FROM public.notifications
   WHERE user_id IN (agent_uid, owner_id) AND title IN ('New verification assignment','Verification agent assigned');
  steps := steps || jsonb_build_object('step','notifications','count',ev_count);

  -- Cleanup
  DELETE FROM public.notifications WHERE message ILIKE '%' || tag || '%' OR title IN ('New verification assignment','Verification agent assigned') AND message ILIKE '%' || tag || '%';
  DELETE FROM public.property_admin_timers WHERE property_id = prop_id;
  DELETE FROM public.property_hold_events WHERE property_id = prop_id;
  DELETE FROM public.properties WHERE id = prop_id;
  DELETE FROM public.agents WHERE id = agent_id;
  DELETE FROM public.admin_scopes WHERE country = tag || '-Country';

  RETURN jsonb_build_object(
    'ok', array_length(failures,1) IS NULL,
    'failures', to_jsonb(failures),
    'steps', steps
  );
EXCEPTION WHEN OTHERS THEN
  BEGIN
    DELETE FROM public.property_admin_timers WHERE property_id = prop_id;
    DELETE FROM public.property_hold_events WHERE property_id = prop_id;
    DELETE FROM public.properties WHERE id = prop_id;
    DELETE FROM public.agents WHERE id = agent_id;
    DELETE FROM public.admin_scopes WHERE country = tag || '-Country';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM, 'steps', steps);
END;
$function$;

REVOKE ALL ON FUNCTION public.workflow_e2e_agent_assignment_test() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_e2e_agent_assignment_test() TO service_role;