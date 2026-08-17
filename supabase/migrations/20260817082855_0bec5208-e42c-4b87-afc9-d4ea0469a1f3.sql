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
BEGIN
  SELECT array_agg(id) INTO admin_ids FROM (SELECT id FROM auth.users LIMIT 3) u;
  SELECT id INTO owner_id FROM auth.users LIMIT 1;
  SELECT id INTO agent_uid FROM auth.users OFFSET 1 LIMIT 1;
  IF admin_ids IS NULL OR array_length(admin_ids,1) < 3 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'need at least 3 auth users to run this test');
  END IF;

  INSERT INTO public.admin_scopes(user_id, role, country, state, district, is_active)
  VALUES (admin_ids[1], 'country_admin', tag || '-Country', NULL, NULL, true),
         (admin_ids[2], 'state_admin',   tag || '-Country', tag || '-State', NULL, true),
         (admin_ids[3], 'district_admin',tag || '-Country', tag || '-State', tag || '-District', true);

  INSERT INTO public.agents(user_id, name, phone, verified, country, state, district, city, locality,
                            cities_served, localities_served, trust_score)
  VALUES (agent_uid, tag || ' Agent', '+910000000000', true,
          tag || '-Country', tag || '-State', tag || '-District', tag || '-City', tag || '-Locality',
          tag || '-City', tag || '-Locality', 99)
  RETURNING id INTO agent_id;

  INSERT INTO public.properties(title, submitted_by, country, state, district, city, locality,
                                lifecycle_status, listing_status, needs_agent)
  VALUES (tag || ' Property', owner_id,
          tag || '-Country', tag || '-State', tag || '-District', tag || '-City', tag || '-Locality',
          'draft', 'draft', true)
  RETURNING id INTO prop_id;

  r := public.property_submit_for_review(prop_id, true);
  SELECT lifecycle_status::text INTO st FROM public.properties WHERE id = prop_id;
  steps := steps || jsonb_build_object('step','submit','result',r,'lifecycle_status',st);
  IF st <> 'country_queue' THEN failures := failures || ('submit expected country_queue, got ' || st); END IF;

  r := public.property_escalate(prop_id);
  SELECT lifecycle_status::text INTO st FROM public.properties WHERE id = prop_id;
  steps := steps || jsonb_build_object('step','escalate_country','result',r,'lifecycle_status',st);
  IF st <> 'state_queue' THEN failures := failures || ('country escalation expected state_queue, got ' || st); END IF;

  r := public.property_escalate(prop_id);
  SELECT lifecycle_status::text INTO st FROM public.properties WHERE id = prop_id;
  steps := steps || jsonb_build_object('step','escalate_state','result',r,'lifecycle_status',st);
  IF st <> 'district_queue' THEN failures := failures || ('state escalation expected district_queue, got ' || st); END IF;

  r := public.property_escalate(prop_id);
  SELECT lifecycle_status::text, assigned_agent_id INTO st, assigned FROM public.properties WHERE id = prop_id;
  steps := steps || jsonb_build_object('step','escalate_district','result',r,'lifecycle_status',st,'assigned_agent_id',assigned);
  IF r->>'escalated_to' <> 'agent' THEN failures := failures || ('district escalation expected escalated_to=agent, got ' || COALESCE(r->>'escalated_to','null')); END IF;
  IF st <> 'agent_assigned' THEN failures := failures || ('expected agent_assigned, got ' || st); END IF;
  IF assigned IS DISTINCT FROM agent_id THEN failures := failures || 'assigned_agent_id is not the best matched fixture agent'; END IF;

  SELECT count(*) INTO ev_count FROM public.property_hold_events
   WHERE property_id = prop_id AND action = 'agent_auto_assigned';
  IF ev_count <> 1 THEN failures := failures || 'missing agent_auto_assigned audit event'; END IF;

  SELECT count(*) INTO ev_count FROM public.notifications WHERE message ILIKE '%' || tag || '%';
  steps := steps || jsonb_build_object('step','notifications','count',ev_count);
  IF ev_count < 2 THEN failures := failures || 'expected agent + owner notifications'; END IF;

  DELETE FROM public.notifications WHERE message ILIKE '%' || tag || '%';
  DELETE FROM public.property_admin_timers WHERE property_id = prop_id;
  DELETE FROM public.property_hold_events WHERE property_id = prop_id;
  DELETE FROM public.properties WHERE id = prop_id;
  DELETE FROM public.agents WHERE id = agent_id;
  DELETE FROM public.admin_scopes WHERE country = tag || '-Country';

  RETURN jsonb_build_object('ok', array_length(failures,1) IS NULL, 'failures', to_jsonb(failures), 'steps', steps);
EXCEPTION WHEN OTHERS THEN
  BEGIN
    DELETE FROM public.notifications WHERE message ILIKE '%' || tag || '%';
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