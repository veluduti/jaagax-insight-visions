CREATE OR REPLACE FUNCTION public.get_nearby_agents_for_property(_property_id uuid, _radius_km numeric DEFAULT 20, _limit integer DEFAULT 25)
 RETURNS TABLE(agent_id uuid, agent_name text, agent_phone text, agent_city text, distance_km numeric, active_tasks integer, pending_tasks integer, completed_verifications integer, avg_rating numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_city text; v_locality text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  SELECT city, locality INTO v_city, v_locality
  FROM public.properties WHERE id = _property_id;

  RETURN QUERY
  SELECT
    a.id AS agent_id,
    a.name AS agent_name,
    a.phone AS agent_phone,
    COALESCE(NULLIF(a.cities_served, ''), '') AS agent_city,
    NULL::numeric AS distance_km,
    (SELECT COUNT(*)::INT FROM public.properties p
       WHERE p.assigned_agent_id = a.id
         AND p.lifecycle_status IN ('agent_accepted','visit_scheduled','under_verification'))   AS active_tasks,
    (SELECT COUNT(*)::INT FROM public.properties p
       WHERE p.assigned_agent_id = a.id
         AND p.lifecycle_status = 'agent_assigned')                                              AS pending_tasks,
    (SELECT COUNT(*)::INT FROM public.property_verifications v
       WHERE v.agent_id = a.id AND v.status IN ('submitted','approved'))                        AS completed_verifications,
    COALESCE(a.avg_rating, 0)::NUMERIC AS avg_rating
  FROM public.agents a
  WHERE a.verified = true
    AND (
      v_city IS NULL
      OR v_city = ''
      OR a.cities_served ILIKE '%' || v_city || '%'
      OR (v_locality IS NOT NULL AND v_locality <> '' AND (
           a.cities_served ILIKE '%' || v_locality || '%'
        OR a.localities_served ILIKE '%' || v_locality || '%'
      ))
    )
  ORDER BY COALESCE(a.avg_rating,0) DESC, a.sales_count DESC NULLS LAST
  LIMIT _limit;
END;
$function$;