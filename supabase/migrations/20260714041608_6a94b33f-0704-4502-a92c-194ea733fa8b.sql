
-- 1. New columns on properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS responsible_district_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_properties_country_state_district
  ON public.properties (country, state, district);
CREATE INDEX IF NOT EXISTS idx_properties_responsible_district_admin
  ON public.properties (responsible_district_admin_id);

-- 2. Helper: find the district admin responsible for a (country,state,district) tuple
CREATE OR REPLACE FUNCTION public.resolve_district_admin(_country TEXT, _state TEXT, _district TEXT)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM public.admin_scopes
  WHERE role = 'district_admin'
    AND is_active = true
    AND lower(country) = lower(_country)
    AND lower(state)   = lower(_state)
    AND lower(district)= lower(_district)
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- 3. Trigger to auto-assign the responsible district admin
CREATE OR REPLACE FUNCTION public.assign_property_district_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.country IS NOT NULL
     AND NEW.state IS NOT NULL
     AND NEW.district IS NOT NULL
  THEN
    NEW.responsible_district_admin_id := public.resolve_district_admin(NEW.country, NEW.state, NEW.district);
  ELSE
    NEW.responsible_district_admin_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_properties_assign_district_admin ON public.properties;
CREATE TRIGGER trg_properties_assign_district_admin
  BEFORE INSERT OR UPDATE OF country, state, district
  ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.assign_property_district_admin();

-- 4. Scope predicate for sub-admins on any (country, state, district) tuple
CREATE OR REPLACE FUNCTION public.admin_can_view_scope(_user_id UUID, _country TEXT, _state TEXT, _district TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_scopes s
    WHERE s.user_id = _user_id
      AND s.is_active = true
      AND (
        s.role = 'global_admin'
        OR (s.role = 'country_admin'  AND lower(s.country)  = lower(_country))
        OR (s.role = 'state_admin'    AND lower(s.country)  = lower(_country) AND lower(s.state) = lower(_state))
        OR (s.role = 'district_admin' AND lower(s.country)  = lower(_country) AND lower(s.state) = lower(_state) AND lower(s.district) = lower(_district))
      )
  );
$$;

-- 5. RLS policy: sub-admins can view properties inside their assigned territory
DROP POLICY IF EXISTS "Sub-admins view scoped properties" ON public.properties;
CREATE POLICY "Sub-admins view scoped properties" ON public.properties
  FOR SELECT TO authenticated
  USING (
    country IS NOT NULL AND state IS NOT NULL AND district IS NOT NULL
    AND public.admin_can_view_scope(auth.uid(), country, state, district)
  );

-- 6. Backfill responsible admin for any existing rows that already have country/state/district
UPDATE public.properties
SET responsible_district_admin_id = public.resolve_district_admin(country, state, district)
WHERE country IS NOT NULL AND state IS NOT NULL AND district IS NOT NULL
  AND responsible_district_admin_id IS NULL;
