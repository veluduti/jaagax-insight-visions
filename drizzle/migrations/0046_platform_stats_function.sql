CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'verified_properties', (SELECT count(*) FROM public.properties WHERE verified = true),
    'agents', (SELECT count(*) FROM public.agents),
    'users', (SELECT count(*) FROM public.profiles),
    'cities', (
      SELECT count(DISTINCT lower(trim(city)))
      FROM (
        SELECT city FROM public.properties WHERE city IS NOT NULL AND btrim(city) <> ''
        UNION
        SELECT city FROM public.partner_hotels WHERE city IS NOT NULL AND btrim(city) <> ''
      ) c
    ),
    'avg_rating', (SELECT round(avg(rating)::numeric, 1) FROM public.hotel_reviews WHERE rating > 0),
    'rating_count', (SELECT count(*) FROM public.hotel_reviews WHERE rating > 0)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO anon, authenticated;