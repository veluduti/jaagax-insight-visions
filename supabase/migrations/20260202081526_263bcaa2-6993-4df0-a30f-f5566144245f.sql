-- Phase 1: Add missing columns and tables for the Real Estate Platform

-- 1. Add missing columns to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS locality text,
ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS bhk integer,
ADD COLUMN IF NOT EXISTS type text,
ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending';

-- 2. Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  builder_name text NOT NULL,
  builder_id uuid REFERENCES public.builders(id),
  city text NOT NULL,
  locality text NOT NULL,
  address text,
  description text,
  avg_price numeric DEFAULT 0,
  min_price numeric DEFAULT 0,
  max_price numeric DEFAULT 0,
  image text,
  images jsonb DEFAULT '[]'::jsonb,
  verified boolean DEFAULT false,
  rera_id text,
  trust_score numeric DEFAULT 50,
  completion_date date,
  launch_date date,
  total_units integer,
  available_units integer,
  amenities jsonb DEFAULT '[]'::jsonb,
  configurations jsonb DEFAULT '[]'::jsonb,
  documents jsonb DEFAULT '[]'::jsonb,
  latitude numeric,
  longitude numeric,
  status text DEFAULT 'upcoming',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create feature_flags table
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name text UNIQUE NOT NULL,
  enabled boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Create visit_bookings table (enhanced visits)
CREATE TABLE IF NOT EXISTS public.visit_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id),
  project_id uuid REFERENCES public.projects(id),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  agent_id uuid REFERENCES public.agents(id),
  visit_date date NOT NULL,
  visit_time text NOT NULL,
  status text DEFAULT 'pending',
  verification_code text,
  otp_code text,
  notes text,
  agent_location jsonb,
  vehicle_location jsonb,
  buyer_name text,
  buyer_phone text,
  buyer_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Create favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  property_id uuid REFERENCES public.properties(id),
  project_id uuid REFERENCES public.projects(id),
  created_at timestamptz DEFAULT now()
);

-- 6. Extend agents table with location and performance fields
ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS photo_url text,
ADD COLUMN IF NOT EXISTS agency_name text,
ADD COLUMN IF NOT EXISTS cities_served text[],
ADD COLUMN IF NOT EXISTS languages text[],
ADD COLUMN IF NOT EXISTS current_latitude numeric,
ADD COLUMN IF NOT EXISTS current_longitude numeric,
ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_location_update timestamptz,
ADD COLUMN IF NOT EXISTS acceptance_rate numeric DEFAULT 100,
ADD COLUMN IF NOT EXISTS avg_response_time_seconds integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_assignments integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS trust_score numeric DEFAULT 50,
ADD COLUMN IF NOT EXISTS sales_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS rent_count integer DEFAULT 0;

-- 7. Create property_verifications table for agent field verification
CREATE TABLE IF NOT EXISTS public.property_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) NOT NULL,
  agent_id uuid REFERENCES public.agents(id) NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text DEFAULT 'assigned',
  verification_type text DEFAULT 'initial',
  location_verified boolean DEFAULT false,
  documents_verified boolean DEFAULT false,
  photos_match boolean DEFAULT false,
  agent_notes text,
  verification_photos jsonb DEFAULT '[]'::jsonb,
  gps_coordinates jsonb,
  admin_reviewed_by uuid REFERENCES auth.users(id),
  admin_reviewed_at timestamptz,
  admin_notes text,
  final_status text DEFAULT 'pending_review',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 8. Create agent_assignment_requests table for cascade logic
CREATE TABLE IF NOT EXISTS public.agent_assignment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_booking_id uuid REFERENCES public.visit_bookings(id) NOT NULL,
  agent_id uuid REFERENCES public.agents(id) NOT NULL,
  requested_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  status text DEFAULT 'pending',
  rejection_reason text,
  cascade_order integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- 9. Create agent_activity_log table for FRM
CREATE TABLE IF NOT EXISTS public.agent_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) NOT NULL,
  activity_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 10. Create agent_performance_daily table for aggregated stats
CREATE TABLE IF NOT EXISTS public.agent_performance_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) NOT NULL,
  date date NOT NULL,
  total_visits integer DEFAULT 0,
  completed_visits integer DEFAULT 0,
  cancelled_visits integer DEFAULT 0,
  avg_rating numeric DEFAULT 0,
  total_earnings numeric DEFAULT 0,
  acceptance_rate numeric DEFAULT 100,
  avg_response_time_seconds integer DEFAULT 0,
  online_hours numeric DEFAULT 0,
  distance_traveled_km numeric DEFAULT 0,
  UNIQUE(agent_id, date)
);

-- 11. Create agent_earnings table
CREATE TABLE IF NOT EXISTS public.agent_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) NOT NULL,
  visit_booking_id uuid REFERENCES public.visit_bookings(id),
  amount numeric NOT NULL,
  type text DEFAULT 'visit_fee',
  status text DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 12. Create visit_locations table for tracking history
CREATE TABLE IF NOT EXISTS public.visit_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.visit_bookings(id) NOT NULL,
  location_type text NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 13. Create agent_availability table
CREATE TABLE IF NOT EXISTS public.agent_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) NOT NULL,
  date date NOT NULL,
  is_available boolean DEFAULT true,
  time_slots jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(agent_id, date)
);

-- Enable RLS on all new tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_assignment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_performance_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Anyone can view verified projects" ON public.projects
  FOR SELECT USING (verified = true);

CREATE POLICY "Builders can manage their projects" ON public.projects
  FOR ALL USING (builder_id = get_builder_id(auth.uid()));

-- RLS Policies for feature_flags (read-only for all)
CREATE POLICY "Anyone can view feature flags" ON public.feature_flags
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage feature flags" ON public.feature_flags
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for visit_bookings
CREATE POLICY "Users can view their bookings" ON public.visit_bookings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create bookings" ON public.visit_bookings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their bookings" ON public.visit_bookings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Agents can view assigned bookings" ON public.visit_bookings
  FOR SELECT USING (agent_id = get_agent_id(auth.uid()));

CREATE POLICY "Agents can update assigned bookings" ON public.visit_bookings
  FOR UPDATE USING (agent_id = get_agent_id(auth.uid()));

-- RLS Policies for favorites
CREATE POLICY "Users can manage their favorites" ON public.favorites
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for property_verifications
CREATE POLICY "Agents can view assigned verifications" ON public.property_verifications
  FOR SELECT USING (agent_id = get_agent_id(auth.uid()));

CREATE POLICY "Agents can update their verifications" ON public.property_verifications
  FOR UPDATE USING (agent_id = get_agent_id(auth.uid()));

CREATE POLICY "Admins can manage verifications" ON public.property_verifications
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for agent_assignment_requests
CREATE POLICY "Agents can view their requests" ON public.agent_assignment_requests
  FOR SELECT USING (agent_id = get_agent_id(auth.uid()));

CREATE POLICY "Agents can update their requests" ON public.agent_assignment_requests
  FOR UPDATE USING (agent_id = get_agent_id(auth.uid()));

-- RLS Policies for agent_activity_log
CREATE POLICY "Agents can view their activity" ON public.agent_activity_log
  FOR SELECT USING (agent_id = get_agent_id(auth.uid()));

CREATE POLICY "Agents can log their activity" ON public.agent_activity_log
  FOR INSERT WITH CHECK (agent_id = get_agent_id(auth.uid()));

CREATE POLICY "Admins can view all activity" ON public.agent_activity_log
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for agent_performance_daily
CREATE POLICY "Agents can view their performance" ON public.agent_performance_daily
  FOR SELECT USING (agent_id = get_agent_id(auth.uid()));

CREATE POLICY "Admins can view all performance" ON public.agent_performance_daily
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for agent_earnings
CREATE POLICY "Agents can view their earnings" ON public.agent_earnings
  FOR SELECT USING (agent_id = get_agent_id(auth.uid()));

CREATE POLICY "Admins can manage earnings" ON public.agent_earnings
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for visit_locations
CREATE POLICY "Users can view their visit locations" ON public.visit_locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.visit_bookings vb 
      WHERE vb.id = booking_id AND vb.user_id = auth.uid()
    )
  );

CREATE POLICY "Agents can manage visit locations" ON public.visit_locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.visit_bookings vb 
      WHERE vb.id = booking_id AND vb.agent_id = get_agent_id(auth.uid())
    )
  );

-- RLS Policies for agent_availability
CREATE POLICY "Anyone can view availability" ON public.agent_availability
  FOR SELECT USING (true);

CREATE POLICY "Agents can manage their availability" ON public.agent_availability
  FOR ALL USING (agent_id = get_agent_id(auth.uid()));

-- Insert default feature flags
INSERT INTO public.feature_flags (flag_name, enabled, description)
VALUES 
  ('natural_living_enabled', false, 'Enable Natural Living section'),
  ('ai_recommendations', true, 'Enable AI property recommendations'),
  ('live_tracking', true, 'Enable live visit tracking')
ON CONFLICT (flag_name) DO NOTHING;

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add updated_at triggers to new tables
DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_visit_bookings_updated_at ON public.visit_bookings;
CREATE TRIGGER set_visit_bookings_updated_at
  BEFORE UPDATE ON public.visit_bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_property_verifications_updated_at ON public.property_verifications;
CREATE TRIGGER set_property_verifications_updated_at
  BEFORE UPDATE ON public.property_verifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();