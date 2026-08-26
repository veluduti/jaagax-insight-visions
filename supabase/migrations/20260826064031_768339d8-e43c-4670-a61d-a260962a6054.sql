
-- 1) Agent public code
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS agent_code text;

CREATE OR REPLACE FUNCTION public.generate_agent_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_code text; v_exists boolean;
BEGIN
  LOOP
    v_code := 'AGX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.agents WHERE agent_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

UPDATE public.agents SET agent_code = public.generate_agent_code() WHERE agent_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS agents_agent_code_key ON public.agents(agent_code);

CREATE OR REPLACE FUNCTION public.agents_set_agent_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.agent_code IS NULL OR NEW.agent_code = '' THEN
    NEW.agent_code := public.generate_agent_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agents_set_agent_code ON public.agents;
CREATE TRIGGER trg_agents_set_agent_code
BEFORE INSERT ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.agents_set_agent_code();

-- 2) Languages spoken (structured)
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS languages_spoken text[] NOT NULL DEFAULT '{}';

UPDATE public.agents
SET languages_spoken = (
  SELECT COALESCE(array_agg(DISTINCT btrim(x)) FILTER (WHERE btrim(x) <> ''), '{}')
  FROM unnest(string_to_array(COALESCE(languages, ''), ',')) AS x
)
WHERE (languages_spoken IS NULL OR cardinality(languages_spoken) = 0)
  AND COALESCE(languages, '') <> '';

-- 3) Customer preferred language
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_language text;

-- 4) Agent suggestions include code + languages and prefer language match
DROP FUNCTION IF EXISTS public.get_nearby_agents_for_property(uuid, numeric, integer);
CREATE OR REPLACE FUNCTION public.get_nearby_agents_for_property(_property_id uuid, _radius_km numeric DEFAULT 20, _limit integer DEFAULT 25)
RETURNS TABLE(agent_id uuid, agent_code text, agent_name text, agent_phone text, agent_city text, languages_spoken text[], language_match boolean, distance_km numeric, active_tasks integer, pending_tasks integer, completed_verifications integer, avg_rating numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_city text; v_locality text; v_owner uuid; v_lang text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  SELECT city, locality, submitted_by INTO v_city, v_locality, v_owner
  FROM public.properties WHERE id = _property_id;

  SELECT p.preferred_language INTO v_lang
  FROM public.profiles p WHERE p.user_id = v_owner LIMIT 1;

  RETURN QUERY
  SELECT
    a.id AS agent_id,
    a.agent_code,
    a.name AS agent_name,
    a.phone AS agent_phone,
    COALESCE(NULLIF(a.cities_served, ''), '') AS agent_city,
    a.languages_spoken,
    (v_lang IS NOT NULL AND v_lang <> '' AND EXISTS (
       SELECT 1 FROM unnest(a.languages_spoken) l WHERE lower(btrim(l)) = lower(btrim(v_lang))
    )) AS language_match,
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
  ORDER BY
    (v_lang IS NOT NULL AND v_lang <> '' AND EXISTS (
       SELECT 1 FROM unnest(a.languages_spoken) l WHERE lower(btrim(l)) = lower(btrim(v_lang))
    )) DESC,
    COALESCE(a.avg_rating,0) DESC, a.sales_count DESC NULLS LAST
  LIMIT _limit;
END;
$function$;
