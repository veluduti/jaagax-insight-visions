-- Add saved location to user profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_data jsonb;

COMMENT ON COLUMN public.profiles.location_data IS
  'Saved location preference: { latitude, longitude, city, area, last_updated }';

-- Helpful index for radius queries on properties (lat/lng filtering)
CREATE INDEX IF NOT EXISTS idx_properties_lat_lng
  ON public.properties (latitude, longitude)
  WHERE verified = true AND is_live = true;

-- RPC: search public live properties within radius_km of a point.
-- Uses haversine distance (no PostGIS dependency).
CREATE OR REPLACE FUNCTION public.search_properties_nearby(
  _lat double precision,
  _lng double precision,
  _radius_km double precision DEFAULT 10,
  _page integer DEFAULT 1,
  _limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  city text,
  locality text,
  address text,
  latitude numeric,
  longitude numeric,
  price numeric,
  area_sqft numeric,
  type text,
  bhk integer,
  bedrooms integer,
  bathrooms integer,
  images text[],
  verified boolean,
  is_live boolean,
  trust_score numeric,
  listing_type text,
  furnishing text,
  created_at timestamptz,
  distance_km double precision,
  total_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT p.*,
      (
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(_lat)) * cos(radians(p.latitude::double precision))
            * cos(radians(p.longitude::double precision) - radians(_lng))
            + sin(radians(_lat)) * sin(radians(p.latitude::double precision))
          ))
        )
      ) AS distance_km
    FROM public.properties p
    WHERE p.verified = true
      AND p.is_live = true
      AND p.latitude IS NOT NULL
      AND p.longitude IS NOT NULL
  ),
  filtered AS (
    SELECT * FROM base WHERE distance_km <= _radius_km
  ),
  counted AS (
    SELECT count(*) AS total_count FROM filtered
  )
  SELECT
    f.id, f.title, f.description, f.city, f.locality, f.address,
    f.latitude, f.longitude, f.price, f.area_sqft, f.type, f.bhk,
    f.bedrooms, f.bathrooms, f.images, f.verified, f.is_live,
    f.trust_score, f.listing_type, f.furnishing, f.created_at,
    f.distance_km,
    (SELECT total_count FROM counted) AS total_count
  FROM filtered f
  ORDER BY f.distance_km ASC
  LIMIT GREATEST(_limit, 1)
  OFFSET GREATEST(_page - 1, 0) * GREATEST(_limit, 1);
$$;

-- RPC: search public live properties within map bounds (lat/lng box)
CREATE OR REPLACE FUNCTION public.search_properties_in_bounds(
  _sw_lat double precision,
  _sw_lng double precision,
  _ne_lat double precision,
  _ne_lng double precision,
  _limit integer DEFAULT 200
)
RETURNS TABLE (
  id uuid,
  title text,
  city text,
  locality text,
  latitude numeric,
  longitude numeric,
  price numeric,
  area_sqft numeric,
  type text,
  bhk integer,
  images text[],
  verified boolean,
  is_live boolean,
  listing_type text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.title, p.city, p.locality, p.latitude, p.longitude,
         p.price, p.area_sqft, p.type, p.bhk, p.images, p.verified, p.is_live, p.listing_type
  FROM public.properties p
  WHERE p.verified = true
    AND p.is_live = true
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND p.latitude::double precision BETWEEN _sw_lat AND _ne_lat
    AND p.longitude::double precision BETWEEN _sw_lng AND _ne_lng
  LIMIT GREATEST(_limit, 1);
$$;

-- Allow these RPCs to be called by anon and authenticated
GRANT EXECUTE ON FUNCTION public.search_properties_nearby(double precision, double precision, double precision, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_properties_in_bounds(double precision, double precision, double precision, double precision, integer) TO anon, authenticated;