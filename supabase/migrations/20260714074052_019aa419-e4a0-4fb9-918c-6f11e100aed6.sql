
CREATE TABLE IF NOT EXISTS public.location_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_normalized text NOT NULL UNIQUE,
  city_display text NOT NULL,
  district text NOT NULL,
  state text NOT NULL,
  country text NOT NULL DEFAULT 'India',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.location_hierarchy TO anon, authenticated;
GRANT ALL ON public.location_hierarchy TO service_role;
ALTER TABLE public.location_hierarchy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "location_hierarchy readable" ON public.location_hierarchy;
CREATE POLICY "location_hierarchy readable" ON public.location_hierarchy FOR SELECT USING (true);
DROP POLICY IF EXISTS "location_hierarchy admin write" ON public.location_hierarchy;
CREATE POLICY "location_hierarchy admin write" ON public.location_hierarchy
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.location_hierarchy (city_normalized, city_display, district, state, country) VALUES
  ('hyderabad','Hyderabad','Hyderabad','Telangana','India'),
  ('secunderabad','Secunderabad','Hyderabad','Telangana','India'),
  ('nanakramguda','Nanakramguda','Hyderabad','Telangana','India'),
  ('hyderad','Hyderabad','Hyderabad','Telangana','India'),
  ('warangal','Warangal','Warangal','Telangana','India'),
  ('karimnagar','Karimnagar','Karimnagar','Telangana','India'),
  ('nizamabad','Nizamabad','Nizamabad','Telangana','India'),
  ('khammam','Khammam','Khammam','Telangana','India'),
  ('vijayawada','Vijayawada','Krishna','Andhra Pradesh','India'),
  ('visakhapatnam','Visakhapatnam','Visakhapatnam','Andhra Pradesh','India'),
  ('guntur','Guntur','Guntur','Andhra Pradesh','India'),
  ('tirupati','Tirupati','Tirupati','Andhra Pradesh','India'),
  ('nellore','Nellore','Nellore','Andhra Pradesh','India'),
  ('kurnool','Kurnool','Kurnool','Andhra Pradesh','India'),
  ('rajahmundry','Rajahmundry','East Godavari','Andhra Pradesh','India'),
  ('kakinada','Kakinada','East Godavari','Andhra Pradesh','India'),
  ('bengaluru','Bengaluru','Bengaluru Urban','Karnataka','India'),
  ('bangalore','Bengaluru','Bengaluru Urban','Karnataka','India'),
  ('mysuru','Mysuru','Mysuru','Karnataka','India'),
  ('mysore','Mysuru','Mysuru','Karnataka','India'),
  ('mangaluru','Mangaluru','Dakshina Kannada','Karnataka','India'),
  ('hubballi','Hubballi','Dharwad','Karnataka','India'),
  ('belagavi','Belagavi','Belagavi','Karnataka','India'),
  ('chennai','Chennai','Chennai','Tamil Nadu','India'),
  ('coimbatore','Coimbatore','Coimbatore','Tamil Nadu','India'),
  ('madurai','Madurai','Madurai','Tamil Nadu','India'),
  ('tiruchirappalli','Tiruchirappalli','Tiruchirappalli','Tamil Nadu','India'),
  ('salem','Salem','Salem','Tamil Nadu','India'),
  ('kochi','Kochi','Ernakulam','Kerala','India'),
  ('thiruvananthapuram','Thiruvananthapuram','Thiruvananthapuram','Kerala','India'),
  ('kozhikode','Kozhikode','Kozhikode','Kerala','India'),
  ('mumbai','Mumbai','Mumbai','Maharashtra','India'),
  ('navi mumbai','Navi Mumbai','Thane','Maharashtra','India'),
  ('thane','Thane','Thane','Maharashtra','India'),
  ('pune','Pune','Pune','Maharashtra','India'),
  ('nagpur','Nagpur','Nagpur','Maharashtra','India'),
  ('nashik','Nashik','Nashik','Maharashtra','India'),
  ('aurangabad','Aurangabad','Aurangabad','Maharashtra','India'),
  ('delhi','New Delhi','New Delhi','Delhi','India'),
  ('new delhi','New Delhi','New Delhi','Delhi','India'),
  ('noida','Noida','Gautam Buddha Nagar','Uttar Pradesh','India'),
  ('greater noida','Greater Noida','Gautam Buddha Nagar','Uttar Pradesh','India'),
  ('ghaziabad','Ghaziabad','Ghaziabad','Uttar Pradesh','India'),
  ('lucknow','Lucknow','Lucknow','Uttar Pradesh','India'),
  ('kanpur','Kanpur','Kanpur Nagar','Uttar Pradesh','India'),
  ('varanasi','Varanasi','Varanasi','Uttar Pradesh','India'),
  ('agra','Agra','Agra','Uttar Pradesh','India'),
  ('gurugram','Gurugram','Gurugram','Haryana','India'),
  ('gurgaon','Gurugram','Gurugram','Haryana','India'),
  ('faridabad','Faridabad','Faridabad','Haryana','India'),
  ('chandigarh','Chandigarh','Chandigarh','Chandigarh','India'),
  ('mohali','Mohali','SAS Nagar','Punjab','India'),
  ('ludhiana','Ludhiana','Ludhiana','Punjab','India'),
  ('amritsar','Amritsar','Amritsar','Punjab','India'),
  ('jaipur','Jaipur','Jaipur','Rajasthan','India'),
  ('jodhpur','Jodhpur','Jodhpur','Rajasthan','India'),
  ('udaipur','Udaipur','Udaipur','Rajasthan','India'),
  ('ahmedabad','Ahmedabad','Ahmedabad','Gujarat','India'),
  ('surat','Surat','Surat','Gujarat','India'),
  ('vadodara','Vadodara','Vadodara','Gujarat','India'),
  ('rajkot','Rajkot','Rajkot','Gujarat','India'),
  ('gandhinagar','Gandhinagar','Gandhinagar','Gujarat','India'),
  ('bhopal','Bhopal','Bhopal','Madhya Pradesh','India'),
  ('indore','Indore','Indore','Madhya Pradesh','India'),
  ('gwalior','Gwalior','Gwalior','Madhya Pradesh','India'),
  ('kolkata','Kolkata','Kolkata','West Bengal','India'),
  ('howrah','Howrah','Howrah','West Bengal','India'),
  ('siliguri','Siliguri','Darjeeling','West Bengal','India'),
  ('bhubaneswar','Bhubaneswar','Khordha','Odisha','India'),
  ('cuttack','Cuttack','Cuttack','Odisha','India'),
  ('patna','Patna','Patna','Bihar','India'),
  ('ranchi','Ranchi','Ranchi','Jharkhand','India'),
  ('jamshedpur','Jamshedpur','East Singhbhum','Jharkhand','India'),
  ('raipur','Raipur','Raipur','Chhattisgarh','India'),
  ('dehradun','Dehradun','Dehradun','Uttarakhand','India'),
  ('shimla','Shimla','Shimla','Himachal Pradesh','India'),
  ('srinagar','Srinagar','Srinagar','Jammu and Kashmir','India'),
  ('jammu','Jammu','Jammu','Jammu and Kashmir','India'),
  ('guwahati','Guwahati','Kamrup Metropolitan','Assam','India'),
  ('panaji','Panaji','North Goa','Goa','India'),
  ('goa','Panaji','North Goa','Goa','India')
ON CONFLICT (city_normalized) DO NOTHING;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS district text;

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS district text;

CREATE INDEX IF NOT EXISTS idx_properties_scope ON public.properties (country, state, district);
CREATE INDEX IF NOT EXISTS idx_profiles_scope ON public.profiles (country, state, district);
CREATE INDEX IF NOT EXISTS idx_agents_scope ON public.agents (country, state, district);

CREATE OR REPLACE FUNCTION public.resolve_location_hierarchy(_city text)
RETURNS TABLE(country text, state text, district text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT lh.country, lh.state, lh.district
  FROM public.location_hierarchy lh
  WHERE lh.city_normalized = lower(trim(COALESCE(_city, '')))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.autofill_location_scope()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_country text; v_state text; v_district text; v_city text;
BEGIN
  v_city := lower(trim(COALESCE(NEW.city, '')));
  IF v_city = '' THEN RETURN NEW; END IF;
  IF NEW.country IS NULL OR NEW.state IS NULL OR NEW.district IS NULL THEN
    SELECT lh.country, lh.state, lh.district INTO v_country, v_state, v_district
      FROM public.location_hierarchy lh WHERE lh.city_normalized = v_city LIMIT 1;
    IF v_country IS NOT NULL THEN
      NEW.country := COALESCE(NEW.country, v_country);
      NEW.state   := COALESCE(NEW.state,   v_state);
      NEW.district:= COALESCE(NEW.district,v_district);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_properties_autofill_scope ON public.properties;
CREATE TRIGGER trg_properties_autofill_scope
  BEFORE INSERT OR UPDATE OF city, country, state, district ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.autofill_location_scope();

DROP TRIGGER IF EXISTS trg_profiles_autofill_scope ON public.profiles;
CREATE TRIGGER trg_profiles_autofill_scope
  BEFORE INSERT OR UPDATE OF city, country, state, district ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.autofill_location_scope();

DROP TRIGGER IF EXISTS trg_agents_autofill_scope ON public.agents;
CREATE TRIGGER trg_agents_autofill_scope
  BEFORE INSERT OR UPDATE OF city, country, state, district ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.autofill_location_scope();

UPDATE public.properties p
  SET country = lh.country, state = lh.state, district = lh.district
  FROM public.location_hierarchy lh
  WHERE p.city IS NOT NULL
    AND lh.city_normalized = lower(trim(p.city))
    AND (p.country IS NULL OR p.state IS NULL OR p.district IS NULL);

UPDATE public.agents a
  SET country = lh.country, state = lh.state, district = lh.district
  FROM public.location_hierarchy lh
  WHERE a.city IS NOT NULL
    AND lh.city_normalized = lower(trim(a.city))
    AND (a.country IS NULL OR a.state IS NULL OR a.district IS NULL);

CREATE OR REPLACE FUNCTION public.admin_can_view(_country text, _state text, _district text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_scopes s
    WHERE s.user_id = auth.uid()
      AND COALESCE(s.is_active, true) = true
      AND (
        s.role = 'global_admin'
        OR (s.role = 'country_admin'  AND s.country  IS NOT DISTINCT FROM _country)
        OR (s.role = 'state_admin'    AND s.country  IS NOT DISTINCT FROM _country AND s.state IS NOT DISTINCT FROM _state)
        OR (s.role = 'district_admin' AND s.country  IS NOT DISTINCT FROM _country AND s.state IS NOT DISTINCT FROM _state AND s.district IS NOT DISTINCT FROM _district)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_district_admin_for(_country text, _state text, _district text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.user_id FROM public.admin_scopes s
    WHERE s.role = 'district_admin'
      AND COALESCE(s.is_active, true) = true
      AND s.country IS NOT DISTINCT FROM _country
      AND s.state IS NOT DISTINCT FROM _state
      AND s.district IS NOT DISTINCT FROM _district
    ORDER BY s.created_at ASC
    LIMIT 1;
$$;

DROP POLICY IF EXISTS "scoped admins can view properties" ON public.properties;
CREATE POLICY "scoped admins can view properties" ON public.properties
  FOR SELECT TO authenticated
  USING (public.admin_can_view(country, state, district));

DROP POLICY IF EXISTS "scoped admins can view profiles" ON public.profiles;
CREATE POLICY "scoped admins can view profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.admin_can_view(country, state, district));

DROP POLICY IF EXISTS "scoped admins can view agents" ON public.agents;
CREATE POLICY "scoped admins can view agents" ON public.agents
  FOR SELECT TO authenticated
  USING (public.admin_can_view(country, state, district));
