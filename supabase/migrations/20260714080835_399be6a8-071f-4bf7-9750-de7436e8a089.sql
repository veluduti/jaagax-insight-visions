
-- Fix pre-existing broken trigger on projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Reusable full autofill trigger
CREATE OR REPLACE FUNCTION public.autofill_location_scope_full()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_country text; v_state text; v_district text; v_city text;
BEGIN
  v_city := lower(trim(COALESCE(NEW.city, '')));
  IF v_city <> '' AND (NEW.country IS NULL OR NEW.state IS NULL OR NEW.district IS NULL) THEN
    SELECT lh.country, lh.state, lh.district
      INTO v_country, v_state, v_district
      FROM public.location_hierarchy lh
      WHERE lh.city_normalized = v_city
      LIMIT 1;
    IF v_country IS NOT NULL THEN
      NEW.country  := COALESCE(NEW.country,  v_country);
      NEW.state    := COALESCE(NEW.state,    v_state);
      NEW.district := COALESCE(NEW.district, v_district);
    END IF;
  END IF;

  IF (to_jsonb(NEW) ? 'district_admin_id')
     AND (to_jsonb(NEW) ->> 'district_admin_id') IS NULL
     AND NEW.country IS NOT NULL AND NEW.state IS NOT NULL AND NEW.district IS NOT NULL
  THEN
    NEW.district_admin_id := public.get_district_admin_for(NEW.country, NEW.state, NEW.district);
  END IF;

  RETURN NEW;
END;
$$;

-- Scope columns
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS district_admin_id uuid;

ALTER TABLE public.visit_bookings
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS district_admin_id uuid;

ALTER TABLE public.weekend_bookings
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS district_admin_id uuid;

ALTER TABLE public.partner_hotels
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS district_admin_id uuid;

ALTER TABLE public.hotel_partner_applications
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS district_admin_id uuid;

ALTER TABLE public.financial_leads
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS district_admin_id uuid;

ALTER TABLE public.signup_requests
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS district_admin_id uuid;

ALTER TABLE public.hotel_bookings
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS district_admin_id uuid;

ALTER TABLE public.property_reports
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS district_admin_id uuid;

-- City-based autofill triggers
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'projects','visit_bookings','weekend_bookings','partner_hotels',
    'hotel_partner_applications','financial_leads','signup_requests'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_autofill_scope ON public.%1$s', t);
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_autofill_scope BEFORE INSERT OR UPDATE OF city,country,state,district ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.autofill_location_scope_full()',
      t
    );
  END LOOP;
END $$;

-- Inheritance triggers
CREATE OR REPLACE FUNCTION public.inherit_scope_from_hotel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
BEGIN
  IF NEW.country IS NULL OR NEW.state IS NULL OR NEW.district IS NULL THEN
    SELECT country, state, district, district_admin_id
      INTO NEW.country, NEW.state, NEW.district, NEW.district_admin_id
      FROM public.partner_hotels WHERE id = NEW.hotel_id;
  END IF;
  IF NEW.district_admin_id IS NULL AND NEW.country IS NOT NULL AND NEW.state IS NOT NULL AND NEW.district IS NOT NULL THEN
    NEW.district_admin_id := public.get_district_admin_for(NEW.country, NEW.state, NEW.district);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_hotel_bookings_inherit_scope ON public.hotel_bookings;
CREATE TRIGGER trg_hotel_bookings_inherit_scope
  BEFORE INSERT OR UPDATE OF hotel_id ON public.hotel_bookings
  FOR EACH ROW EXECUTE FUNCTION public.inherit_scope_from_hotel();

CREATE OR REPLACE FUNCTION public.inherit_scope_from_property()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
BEGIN
  IF NEW.country IS NULL OR NEW.state IS NULL OR NEW.district IS NULL THEN
    SELECT country, state, district, district_admin_id
      INTO NEW.country, NEW.state, NEW.district, NEW.district_admin_id
      FROM public.properties WHERE id = NEW.property_id;
  END IF;
  IF NEW.district_admin_id IS NULL AND NEW.country IS NOT NULL AND NEW.state IS NOT NULL AND NEW.district IS NOT NULL THEN
    NEW.district_admin_id := public.get_district_admin_for(NEW.country, NEW.state, NEW.district);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_property_reports_inherit_scope ON public.property_reports;
CREATE TRIGGER trg_property_reports_inherit_scope
  BEFORE INSERT OR UPDATE OF property_id ON public.property_reports
  FOR EACH ROW EXECUTE FUNCTION public.inherit_scope_from_property();

CREATE OR REPLACE FUNCTION public.visit_bookings_inherit_scope()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
BEGIN
  IF (NEW.country IS NULL OR NEW.state IS NULL OR NEW.district IS NULL) AND NEW.property_id IS NOT NULL THEN
    SELECT country, state, district, district_admin_id
      INTO NEW.country, NEW.state, NEW.district, NEW.district_admin_id
      FROM public.properties WHERE id = NEW.property_id;
  END IF;
  IF NEW.district_admin_id IS NULL AND NEW.country IS NOT NULL AND NEW.state IS NOT NULL AND NEW.district IS NOT NULL THEN
    NEW.district_admin_id := public.get_district_admin_for(NEW.country, NEW.state, NEW.district);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_visit_bookings_inherit_scope ON public.visit_bookings;
CREATE TRIGGER trg_visit_bookings_inherit_scope
  BEFORE INSERT ON public.visit_bookings
  FOR EACH ROW EXECUTE FUNCTION public.visit_bookings_inherit_scope();

-- Backfills
UPDATE public.projects p SET country=lh.country, state=lh.state, district=lh.district
  FROM public.location_hierarchy lh
  WHERE lower(trim(p.city))=lh.city_normalized AND (p.country IS NULL OR p.state IS NULL OR p.district IS NULL);
UPDATE public.projects SET district_admin_id = public.get_district_admin_for(country,state,district)
  WHERE district_admin_id IS NULL AND country IS NOT NULL;

UPDATE public.partner_hotels p SET country=lh.country, state=lh.state, district=lh.district
  FROM public.location_hierarchy lh
  WHERE lower(trim(p.city))=lh.city_normalized AND (p.country IS NULL OR p.state IS NULL OR p.district IS NULL);
UPDATE public.partner_hotels SET district_admin_id = public.get_district_admin_for(country,state,district)
  WHERE district_admin_id IS NULL AND country IS NOT NULL;

UPDATE public.weekend_bookings b SET country=lh.country, state=lh.state, district=lh.district
  FROM public.location_hierarchy lh
  WHERE lower(trim(b.city))=lh.city_normalized AND (b.country IS NULL OR b.state IS NULL OR b.district IS NULL);
UPDATE public.weekend_bookings SET district_admin_id = public.get_district_admin_for(country,state,district)
  WHERE district_admin_id IS NULL AND country IS NOT NULL;

UPDATE public.visit_bookings v
  SET country=p.country, state=p.state, district=p.district, district_admin_id=p.district_admin_id
  FROM public.properties p
  WHERE v.property_id=p.id AND v.country IS NULL AND p.country IS NOT NULL;

UPDATE public.hotel_bookings h SET country=ph.country, state=ph.state, district=ph.district, district_admin_id=ph.district_admin_id
  FROM public.partner_hotels ph
  WHERE h.hotel_id=ph.id AND h.country IS NULL AND ph.country IS NOT NULL;

UPDATE public.property_reports r SET country=p.country, state=p.state, district=p.district, district_admin_id=p.district_admin_id
  FROM public.properties p
  WHERE r.property_id=p.id AND r.country IS NULL AND p.country IS NOT NULL;

UPDATE public.hotel_partner_applications a SET district=lh.district, country=COALESCE(a.country,lh.country), state=COALESCE(a.state,lh.state)
  FROM public.location_hierarchy lh
  WHERE lower(trim(a.city))=lh.city_normalized AND a.district IS NULL;
UPDATE public.hotel_partner_applications SET district_admin_id = public.get_district_admin_for(country,state,district)
  WHERE district_admin_id IS NULL AND country IS NOT NULL AND state IS NOT NULL AND district IS NOT NULL;

UPDATE public.financial_leads f SET country=lh.country, state=lh.state, district=lh.district
  FROM public.location_hierarchy lh
  WHERE lower(trim(f.city))=lh.city_normalized AND f.country IS NULL;
UPDATE public.financial_leads SET district_admin_id = public.get_district_admin_for(country,state,district)
  WHERE district_admin_id IS NULL AND country IS NOT NULL;

UPDATE public.signup_requests s SET country=lh.country, state=lh.state, district=lh.district
  FROM public.location_hierarchy lh
  WHERE lower(trim(s.city))=lh.city_normalized AND s.country IS NULL;
UPDATE public.signup_requests SET district_admin_id = public.get_district_admin_for(country,state,district)
  WHERE district_admin_id IS NULL AND country IS NOT NULL;

-- Scoped admin visibility (additive)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'projects','visit_bookings','weekend_bookings','partner_hotels',
    'hotel_partner_applications','financial_leads','signup_requests',
    'hotel_bookings','property_reports'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admins view within scope" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Admins view within scope" ON public.%I FOR SELECT TO authenticated USING (public.admin_can_view(country, state, district))',
      t
    );
  END LOOP;
END $$;
