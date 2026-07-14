
-- MASTER LOCATION HIERARCHY (Phase 1) --

CREATE TABLE IF NOT EXISTS public.loc_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  iso2 TEXT UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.loc_countries TO anon, authenticated;
GRANT ALL ON public.loc_countries TO service_role;
ALTER TABLE public.loc_countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loc_countries_public_read" ON public.loc_countries FOR SELECT USING (true);
CREATE POLICY "loc_countries_admin_write" ON public.loc_countries FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.loc_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.loc_countries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_id, name),
  UNIQUE (country_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_loc_states_country ON public.loc_states(country_id);
GRANT SELECT ON public.loc_states TO anon, authenticated;
GRANT ALL ON public.loc_states TO service_role;
ALTER TABLE public.loc_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loc_states_public_read" ON public.loc_states FOR SELECT USING (true);
CREATE POLICY "loc_states_admin_write" ON public.loc_states FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.loc_districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id UUID NOT NULL REFERENCES public.loc_states(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (state_id, name),
  UNIQUE (state_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_loc_districts_state ON public.loc_districts(state_id);
GRANT SELECT ON public.loc_districts TO anon, authenticated;
GRANT ALL ON public.loc_districts TO service_role;
ALTER TABLE public.loc_districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loc_districts_public_read" ON public.loc_districts FOR SELECT USING (true);
CREATE POLICY "loc_districts_admin_write" ON public.loc_districts FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.loc_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID NOT NULL REFERENCES public.loc_districts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (district_id, name),
  UNIQUE (district_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_loc_cities_district ON public.loc_cities(district_id);
GRANT SELECT ON public.loc_cities TO anon, authenticated;
GRANT ALL ON public.loc_cities TO service_role;
ALTER TABLE public.loc_cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loc_cities_public_read" ON public.loc_cities FOR SELECT USING (true);
CREATE POLICY "loc_cities_admin_write" ON public.loc_cities FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.loc_localities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.loc_cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  pincode TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (city_id, name),
  UNIQUE (city_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_loc_localities_city ON public.loc_localities(city_id);
GRANT SELECT ON public.loc_localities TO anon, authenticated;
GRANT ALL ON public.loc_localities TO service_role;
ALTER TABLE public.loc_localities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loc_localities_public_read" ON public.loc_localities FOR SELECT USING (true);
CREATE POLICY "loc_localities_admin_write" ON public.loc_localities FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- SEED
DO $$
DECLARE
  v_country UUID; v_state UUID; v_district UUID; v_district_hyd UUID; v_district_rr UUID;
  v_city UUID; v_state_ka UUID; v_state_mh UUID; v_state_tn UUID;
BEGIN
  INSERT INTO public.loc_countries(name, iso2, slug) VALUES ('India','IN','india')
    ON CONFLICT (name) DO UPDATE SET updated_at=now() RETURNING id INTO v_country;

  INSERT INTO public.loc_states(country_id, name, slug) VALUES (v_country,'Telangana','telangana')
    ON CONFLICT (country_id, name) DO UPDATE SET updated_at=now() RETURNING id INTO v_state;
  INSERT INTO public.loc_states(country_id, name, slug) VALUES (v_country,'Karnataka','karnataka')
    ON CONFLICT (country_id, name) DO UPDATE SET updated_at=now() RETURNING id INTO v_state_ka;
  INSERT INTO public.loc_states(country_id, name, slug) VALUES (v_country,'Maharashtra','maharashtra')
    ON CONFLICT (country_id, name) DO UPDATE SET updated_at=now() RETURNING id INTO v_state_mh;
  INSERT INTO public.loc_states(country_id, name, slug) VALUES (v_country,'Tamil Nadu','tamil-nadu')
    ON CONFLICT (country_id, name) DO UPDATE SET updated_at=now() RETURNING id INTO v_state_tn;

  INSERT INTO public.loc_districts(state_id, name, slug) VALUES (v_state,'Medchal-Malkajgiri','medchal-malkajgiri')
    ON CONFLICT (state_id, name) DO UPDATE SET updated_at=now() RETURNING id INTO v_district;
  INSERT INTO public.loc_cities(district_id, name, slug)
  SELECT v_district, c, lower(replace(c,' ','-'))
  FROM unnest(ARRAY['Kukatpally','Miyapur','Bachupally','Kompally','Jeedimetla','Dundigal','Medchal']) AS c
  ON CONFLICT (district_id, name) DO NOTHING;

  SELECT id INTO v_city FROM public.loc_cities WHERE district_id=v_district AND name='Kukatpally';
  INSERT INTO public.loc_localities(city_id, name, slug)
  SELECT v_city, l, lower(replace(l,' ','-'))
  FROM unnest(ARRAY['KPHB Phase-1','KPHB Phase-2','KPHB Phase-5','Vivekananda Nagar','Bhagya Nagar Colony','Pragathi Nagar','Nizampet']) AS l
  ON CONFLICT (city_id, name) DO NOTHING;

  SELECT id INTO v_city FROM public.loc_cities WHERE district_id=v_district AND name='Miyapur';
  INSERT INTO public.loc_localities(city_id, name, slug)
  SELECT v_city, l, lower(replace(l,' ','-'))
  FROM unnest(ARRAY['Alwyn Colony','Chandanagar','Hafeezpet','Madinaguda']) AS l
  ON CONFLICT (city_id, name) DO NOTHING;

  INSERT INTO public.loc_districts(state_id, name, slug) VALUES (v_state,'Hyderabad','hyderabad')
    ON CONFLICT (state_id, name) DO UPDATE SET updated_at=now() RETURNING id INTO v_district_hyd;
  INSERT INTO public.loc_cities(district_id, name, slug)
  SELECT v_district_hyd, c, lower(replace(c,' ','-'))
  FROM unnest(ARRAY['Hyderabad','Secunderabad','Charminar','Malakpet']) AS c
  ON CONFLICT (district_id, name) DO NOTHING;
  SELECT id INTO v_city FROM public.loc_cities WHERE district_id=v_district_hyd AND name='Hyderabad';
  INSERT INTO public.loc_localities(city_id, name, slug)
  SELECT v_city, l, lower(replace(l,' ','-'))
  FROM unnest(ARRAY['Banjara Hills','Jubilee Hills','Somajiguda','Begumpet','Ameerpet']) AS l
  ON CONFLICT (city_id, name) DO NOTHING;

  INSERT INTO public.loc_districts(state_id, name, slug) VALUES (v_state,'Rangareddy','rangareddy')
    ON CONFLICT (state_id, name) DO UPDATE SET updated_at=now() RETURNING id INTO v_district_rr;
  INSERT INTO public.loc_cities(district_id, name, slug)
  SELECT v_district_rr, c, lower(replace(c,' ','-'))
  FROM unnest(ARRAY['Gachibowli','Kondapur','Madhapur','Hitech City','Financial District','Kokapet','Narsingi','Shamshabad']) AS c
  ON CONFLICT (district_id, name) DO NOTHING;
  SELECT id INTO v_city FROM public.loc_cities WHERE district_id=v_district_rr AND name='Gachibowli';
  INSERT INTO public.loc_localities(city_id, name, slug)
  SELECT v_city, l, lower(replace(l,' ','-'))
  FROM unnest(ARRAY['Financial District','Nanakramguda','DLF','Wipro Circle','Raidurg']) AS l
  ON CONFLICT (city_id, name) DO NOTHING;
  SELECT id INTO v_city FROM public.loc_cities WHERE district_id=v_district_rr AND name='Madhapur';
  INSERT INTO public.loc_localities(city_id, name, slug)
  SELECT v_city, l, lower(replace(l,' ','-'))
  FROM unnest(ARRAY['Ayyappa Society','Kavuri Hills','Image Gardens','Cyber Hills Colony','Patrika Nagar']) AS l
  ON CONFLICT (city_id, name) DO NOTHING;

  INSERT INTO public.loc_districts(state_id, name, slug) VALUES (v_state,'Warangal','warangal')
    ON CONFLICT (state_id, name) DO NOTHING;

  INSERT INTO public.loc_districts(state_id, name, slug) VALUES (v_state_ka,'Bangalore Urban','bangalore-urban')
    ON CONFLICT (state_id, name) DO UPDATE SET updated_at=now() RETURNING id INTO v_district;
  INSERT INTO public.loc_cities(district_id, name, slug)
  SELECT v_district, c, lower(replace(c,' ','-'))
  FROM unnest(ARRAY['Bangalore','Whitefield','Electronic City','Yelahanka']) AS c
  ON CONFLICT (district_id, name) DO NOTHING;
  SELECT id INTO v_city FROM public.loc_cities WHERE district_id=v_district AND name='Bangalore';
  INSERT INTO public.loc_localities(city_id, name, slug)
  SELECT v_city, l, lower(replace(l,' ','-'))
  FROM unnest(ARRAY['Indiranagar','HSR Layout','Koramangala','Jayanagar','JP Nagar']) AS l
  ON CONFLICT (city_id, name) DO NOTHING;

  INSERT INTO public.loc_districts(state_id, name, slug) VALUES (v_state_mh,'Mumbai','mumbai')
    ON CONFLICT (state_id, name) DO UPDATE SET updated_at=now() RETURNING id INTO v_district;
  INSERT INTO public.loc_cities(district_id, name, slug)
  SELECT v_district, c, lower(replace(c,' ','-'))
  FROM unnest(ARRAY['Mumbai','Andheri','Bandra','Powai']) AS c
  ON CONFLICT (district_id, name) DO NOTHING;

  INSERT INTO public.loc_districts(state_id, name, slug) VALUES (v_state_mh,'Pune','pune')
    ON CONFLICT (state_id, name) DO UPDATE SET updated_at=now() RETURNING id INTO v_district;
  INSERT INTO public.loc_cities(district_id, name, slug)
  SELECT v_district, c, lower(replace(c,' ','-'))
  FROM unnest(ARRAY['Pune','Hinjewadi','Wakad','Kharadi']) AS c
  ON CONFLICT (district_id, name) DO NOTHING;

  INSERT INTO public.loc_districts(state_id, name, slug) VALUES (v_state_tn,'Chennai','chennai')
    ON CONFLICT (state_id, name) DO UPDATE SET updated_at=now() RETURNING id INTO v_district;
  INSERT INTO public.loc_cities(district_id, name, slug)
  SELECT v_district, c, lower(replace(c,' ','-'))
  FROM unnest(ARRAY['Chennai','OMR','Velachery','Adyar']) AS c
  ON CONFLICT (district_id, name) DO NOTHING;
END $$;

-- Add master-ID columns
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES public.loc_countries(id),
  ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES public.loc_states(id),
  ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.loc_districts(id),
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.loc_cities(id),
  ADD COLUMN IF NOT EXISTS locality_id UUID REFERENCES public.loc_localities(id);
CREATE INDEX IF NOT EXISTS idx_properties_district_id ON public.properties(district_id);
CREATE INDEX IF NOT EXISTS idx_properties_city_id ON public.properties(city_id);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES public.loc_countries(id),
  ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES public.loc_states(id),
  ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.loc_districts(id),
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.loc_cities(id),
  ADD COLUMN IF NOT EXISTS locality_id UUID REFERENCES public.loc_localities(id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES public.loc_countries(id),
  ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES public.loc_states(id),
  ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.loc_districts(id),
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.loc_cities(id),
  ADD COLUMN IF NOT EXISTS locality_id UUID REFERENCES public.loc_localities(id);

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES public.loc_countries(id),
  ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES public.loc_states(id),
  ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.loc_districts(id),
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.loc_cities(id),
  ADD COLUMN IF NOT EXISTS locality_id UUID REFERENCES public.loc_localities(id);

ALTER TABLE public.builder_profiles
  ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES public.loc_countries(id),
  ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES public.loc_states(id),
  ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.loc_districts(id),
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.loc_cities(id),
  ADD COLUMN IF NOT EXISTS locality_id UUID REFERENCES public.loc_localities(id);

ALTER TABLE public.visit_bookings
  ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES public.loc_countries(id),
  ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES public.loc_states(id),
  ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.loc_districts(id),
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.loc_cities(id),
  ADD COLUMN IF NOT EXISTS locality_id UUID REFERENCES public.loc_localities(id);

ALTER TABLE public.admin_scopes
  ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES public.loc_countries(id),
  ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES public.loc_states(id),
  ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.loc_districts(id);

-- Resolver
CREATE OR REPLACE FUNCTION public.resolve_location_ids(
  _country TEXT, _state TEXT, _district TEXT, _city TEXT, _locality TEXT
) RETURNS TABLE (country_id UUID, state_id UUID, district_id UUID, city_id UUID, locality_id UUID)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c_id UUID; s_id UUID; d_id UUID; ct_id UUID; l_id UUID;
BEGIN
  SELECT id INTO c_id FROM public.loc_countries WHERE lower(name)=lower(COALESCE(_country,'India')) LIMIT 1;
  IF c_id IS NULL THEN SELECT id INTO c_id FROM public.loc_countries WHERE name='India' LIMIT 1; END IF;
  IF _state IS NOT NULL THEN
    SELECT id INTO s_id FROM public.loc_states WHERE country_id=c_id AND lower(name)=lower(_state) LIMIT 1;
  END IF;
  IF _district IS NOT NULL AND s_id IS NOT NULL THEN
    SELECT id INTO d_id FROM public.loc_districts WHERE state_id=s_id AND lower(name)=lower(_district) LIMIT 1;
  END IF;
  IF _city IS NOT NULL THEN
    IF d_id IS NOT NULL THEN
      SELECT id INTO ct_id FROM public.loc_cities WHERE district_id=d_id AND lower(name)=lower(_city) LIMIT 1;
    END IF;
    IF ct_id IS NULL AND s_id IS NOT NULL THEN
      SELECT ci.id, ci.district_id INTO ct_id, d_id
        FROM public.loc_cities ci JOIN public.loc_districts di ON di.id=ci.district_id
        WHERE di.state_id=s_id AND lower(ci.name)=lower(_city) LIMIT 1;
    END IF;
    IF ct_id IS NULL THEN
      SELECT ci.id, ci.district_id, di.state_id, st.country_id INTO ct_id, d_id, s_id, c_id
        FROM public.loc_cities ci
        JOIN public.loc_districts di ON di.id=ci.district_id
        JOIN public.loc_states st ON st.id=di.state_id
        WHERE lower(ci.name)=lower(_city) LIMIT 1;
    END IF;
  END IF;
  IF _locality IS NOT NULL AND ct_id IS NOT NULL THEN
    SELECT id INTO l_id FROM public.loc_localities WHERE city_id=ct_id AND lower(name)=lower(_locality) LIMIT 1;
  END IF;
  RETURN QUERY SELECT c_id, s_id, d_id, ct_id, l_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_location_ids(TEXT,TEXT,TEXT,TEXT,TEXT) TO anon, authenticated, service_role;

-- Autofill trigger
CREATE OR REPLACE FUNCTION public.autofill_master_location_ids()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; admin_id UUID;
BEGIN
  IF NEW.district_id IS NULL OR NEW.city_id IS NULL THEN
    SELECT * INTO r FROM public.resolve_location_ids(NEW.country, NEW.state, NEW.district, NEW.city, NEW.locality);
    NEW.country_id  := COALESCE(NEW.country_id,  r.country_id);
    NEW.state_id    := COALESCE(NEW.state_id,    r.state_id);
    NEW.district_id := COALESCE(NEW.district_id, r.district_id);
    NEW.city_id     := COALESCE(NEW.city_id,     r.city_id);
    NEW.locality_id := COALESCE(NEW.locality_id, r.locality_id);
  END IF;
  IF NEW.country_id IS NOT NULL AND (NEW.country IS NULL OR NEW.country='') THEN
    SELECT name INTO NEW.country FROM public.loc_countries WHERE id=NEW.country_id;
  END IF;
  IF NEW.state_id IS NOT NULL AND (NEW.state IS NULL OR NEW.state='') THEN
    SELECT name INTO NEW.state FROM public.loc_states WHERE id=NEW.state_id;
  END IF;
  IF NEW.district_id IS NOT NULL AND (NEW.district IS NULL OR NEW.district='') THEN
    SELECT name INTO NEW.district FROM public.loc_districts WHERE id=NEW.district_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_autofill_master_loc_properties ON public.properties;
CREATE TRIGGER trg_autofill_master_loc_properties
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.autofill_master_location_ids();

DROP TRIGGER IF EXISTS trg_autofill_master_loc_projects ON public.projects;
CREATE TRIGGER trg_autofill_master_loc_projects
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.autofill_master_location_ids();

DROP TRIGGER IF EXISTS trg_autofill_master_loc_visits ON public.visit_bookings;
CREATE TRIGGER trg_autofill_master_loc_visits
  BEFORE INSERT OR UPDATE ON public.visit_bookings
  FOR EACH ROW EXECUTE FUNCTION public.autofill_master_location_ids();

DROP TRIGGER IF EXISTS trg_autofill_master_loc_profiles ON public.profiles;
CREATE TRIGGER trg_autofill_master_loc_profiles
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.autofill_master_location_ids();

DROP TRIGGER IF EXISTS trg_autofill_master_loc_agents ON public.agents;
CREATE TRIGGER trg_autofill_master_loc_agents
  BEFORE INSERT OR UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.autofill_master_location_ids();

-- updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $fn$ BEGIN NEW.updated_at = now(); RETURN NEW; END $fn$;

DROP TRIGGER IF EXISTS trg_touch_loc_countries ON public.loc_countries;
CREATE TRIGGER trg_touch_loc_countries BEFORE UPDATE ON public.loc_countries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_touch_loc_states ON public.loc_states;
CREATE TRIGGER trg_touch_loc_states BEFORE UPDATE ON public.loc_states FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_touch_loc_districts ON public.loc_districts;
CREATE TRIGGER trg_touch_loc_districts BEFORE UPDATE ON public.loc_districts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_touch_loc_cities ON public.loc_cities;
CREATE TRIGGER trg_touch_loc_cities BEFORE UPDATE ON public.loc_cities FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_touch_loc_localities ON public.loc_localities;
CREATE TRIGGER trg_touch_loc_localities BEFORE UPDATE ON public.loc_localities FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
