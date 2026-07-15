
-- Registrations
CREATE TABLE public.nl_land_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Owner
  owner_name TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  -- Location text
  village TEXT,
  mandal TEXT,
  district TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  -- Master location IDs (autofilled by resolve_location_ids trigger if present)
  country_id UUID,
  state_id UUID,
  district_id UUID,
  city_id UUID,
  locality_id UUID,
  -- Geo
  google_map_url TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  -- Land
  total_area NUMERIC,
  area_unit TEXT, -- Acres/Hectares/Guntas/Cents
  survey_numbers TEXT,
  soil TEXT,
  terrain TEXT,
  current_status TEXT,
  available_from DATE,
  current_crop TEXT,
  last_crop TEXT,
  crop_history JSONB DEFAULT '[]'::jsonb,
  lease_reason TEXT,
  -- Water
  water_sources JSONB DEFAULT '[]'::jsonb,
  water_availability TEXT,
  borewell_count INT,
  -- Infrastructure & access
  infrastructure JSONB DEFAULT '[]'::jsonb,
  road_access TEXT,
  electricity TEXT,
  vehicle_access JSONB DEFAULT '[]'::jsonb,
  -- Environment
  local_environment JSONB DEFAULT '[]'::jsonb,
  nearby_attractions JSONB DEFAULT '[]'::jsonb,
  nearby_facilities JSONB DEFAULT '{}'::jsonb,
  -- Readiness / opportunities
  farming_readiness TEXT,
  opportunity_ratings JSONB DEFAULT '{}'::jsonb, -- {commercial:5, organic:4, ...}
  suitable_for JSONB DEFAULT '[]'::jsonb,
  school_activities JSONB DEFAULT '[]'::jsonb,
  -- Farm stay
  stay_accommodation JSONB DEFAULT '[]'::jsonb,
  stay_facilities JSONB DEFAULT '[]'::jsonb,
  stay_experience JSONB DEFAULT '[]'::jsonb,
  -- Project framing
  project_tenure TEXT,
  project_duration TEXT,
  project_age TEXT,
  -- Progress
  completion_pct INT NOT NULL DEFAULT 0,
  missing_fields JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft', -- draft|submitted|under_review|verified|rejected
  extra JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_land_registrations TO authenticated;
GRANT ALL ON public.nl_land_registrations TO service_role;

ALTER TABLE public.nl_land_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own land registrations"
  ON public.nl_land_registrations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all land registrations"
  ON public.nl_land_registrations FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins update all land registrations"
  ON public.nl_land_registrations FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_nl_land_reg_user ON public.nl_land_registrations(user_id);
CREATE INDEX idx_nl_land_reg_district ON public.nl_land_registrations(district_id);
CREATE INDEX idx_nl_land_reg_status ON public.nl_land_registrations(status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.nl_land_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_nl_land_reg_updated_at
  BEFORE UPDATE ON public.nl_land_registrations
  FOR EACH ROW EXECUTE FUNCTION public.nl_land_touch_updated_at();

-- Conversations
CREATE TABLE public.nl_land_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID NOT NULL REFERENCES public.nl_land_registrations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  extracted_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_land_conversations TO authenticated;
GRANT ALL ON public.nl_land_conversations TO service_role;
ALTER TABLE public.nl_land_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own land conversations"
  ON public.nl_land_conversations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all land conversations"
  ON public.nl_land_conversations FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_nl_land_conv_reg ON public.nl_land_conversations(registration_id, created_at);

-- Uploads
CREATE TABLE public.nl_land_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID NOT NULL REFERENCES public.nl_land_registrations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- 'land_photo' | 'ownership_document' | 'other'
  file_url TEXT NOT NULL,
  file_name TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_land_uploads TO authenticated;
GRANT ALL ON public.nl_land_uploads TO service_role;
ALTER TABLE public.nl_land_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own land uploads"
  ON public.nl_land_uploads FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all land uploads"
  ON public.nl_land_uploads FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_nl_land_uploads_reg ON public.nl_land_uploads(registration_id);
