-- Feature flags table for controlling feature visibility
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_name TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert natural_living feature flag (disabled by default)
INSERT INTO public.feature_flags (flag_name, enabled, description)
VALUES ('natural_living_enabled', false, 'Controls visibility of Farm Land & Natural Living module');

-- Land types enum/reference table
CREATE TABLE public.land_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  suitable_for TEXT[],
  min_area_acres NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seed land types
INSERT INTO public.land_types (name, description, suitable_for, min_area_acres) VALUES
('agricultural', 'Land suitable for crop cultivation', ARRAY['farming', 'orchards', 'vegetables'], 1),
('horticultural', 'Land for growing fruits, flowers, vegetables', ARRAY['orchards', 'nursery', 'floriculture'], 0.5),
('forest', 'Wooded land with natural vegetation', ARRAY['agroforestry', 'timber', 'eco-retreat'], 5),
('pasture', 'Grassland for grazing livestock', ARRAY['dairy', 'livestock', 'poultry'], 2),
('wetland', 'Water-rich land for aquaculture', ARRAY['fishery', 'rice', 'lotus'], 1),
('mixed_use', 'Multi-purpose agricultural land', ARRAY['integrated_farming', 'permaculture'], 2);

-- Ownership models
CREATE TABLE public.ownership_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  min_investment NUMERIC,
  revenue_share_percentage NUMERIC,
  lock_in_years INTEGER,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seed ownership models
INSERT INTO public.ownership_models (name, description, min_investment, revenue_share_percentage, lock_in_years, features) VALUES
('full_ownership', 'Complete land ownership with title transfer', 5000000, 100, 0, '["title_deed", "full_control", "resale_rights"]'),
('fractional', 'Shared ownership with proportional benefits', 500000, null, 3, '["shared_title", "proportional_yield", "exit_option"]'),
('lease_to_own', 'Long-term lease with ownership option', 100000, 60, 10, '["annual_lease", "purchase_option", "managed_farming"]'),
('cooperative', 'Community-owned farming collective', 250000, null, 5, '["voting_rights", "shared_resources", "community_access"]');

-- Farm land listings
CREATE TABLE public.farm_lands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  land_type_id UUID REFERENCES public.land_types(id),
  ownership_model_id UUID REFERENCES public.ownership_models(id),
  area_acres NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  price_per_acre NUMERIC GENERATED ALWAYS AS (price / NULLIF(area_acres, 0)) STORED,
  city TEXT NOT NULL,
  locality TEXT,
  state TEXT,
  lat NUMERIC,
  lng NUMERIC,
  soil_type TEXT,
  water_source TEXT[],
  road_access BOOLEAN DEFAULT false,
  electricity BOOLEAN DEFAULT false,
  fencing BOOLEAN DEFAULT false,
  images TEXT[],
  documents JSONB DEFAULT '[]'::jsonb,
  verified BOOLEAN DEFAULT false,
  submitted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Assisted farming programs
CREATE TABLE public.assisted_farming (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  provider_name TEXT NOT NULL,
  provider_contact JSONB,
  services TEXT[] NOT NULL,
  monthly_fee NUMERIC,
  revenue_share_percentage NUMERIC,
  min_land_acres NUMERIC DEFAULT 1,
  crops_supported TEXT[],
  equipment_provided TEXT[],
  training_included BOOLEAN DEFAULT false,
  organic_certified BOOLEAN DEFAULT false,
  regions_available TEXT[],
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seed assisted farming programs
INSERT INTO public.assisted_farming (name, description, provider_name, services, monthly_fee, revenue_share_percentage, crops_supported, training_included, organic_certified, regions_available) VALUES
('Full Farm Management', 'End-to-end farming operations management', 'AgriCare Services', ARRAY['soil_prep', 'sowing', 'irrigation', 'harvesting', 'marketing'], 15000, 20, ARRAY['rice', 'wheat', 'vegetables', 'pulses'], true, false, ARRAY['Telangana', 'Andhra Pradesh', 'Karnataka']),
('Organic Transition Program', 'Convert conventional to organic farming', 'Green Earth Organics', ARRAY['soil_testing', 'organic_inputs', 'certification', 'training'], 20000, 25, ARRAY['vegetables', 'fruits', 'millets'], true, true, ARRAY['Maharashtra', 'Karnataka', 'Tamil Nadu']),
('Weekend Farmer Support', 'Assistance for part-time farmers', 'Rural Connect', ARRAY['weekly_visits', 'crop_monitoring', 'harvest_help'], 8000, 15, ARRAY['vegetables', 'fruits'], false, false, ARRAY['Telangana', 'Maharashtra']);

-- Long-term yield projections
CREATE TABLE public.long_term_yield (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farm_land_id UUID REFERENCES public.farm_lands(id) ON DELETE CASCADE,
  crop_type TEXT NOT NULL,
  year_number INTEGER NOT NULL,
  projected_yield_kg NUMERIC,
  projected_revenue NUMERIC,
  projected_expenses NUMERIC,
  net_profit NUMERIC GENERATED ALWAYS AS (projected_revenue - projected_expenses) STORED,
  assumptions JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User farm land interests/bookings
CREATE TABLE public.farm_land_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  farm_land_id UUID REFERENCES public.farm_lands(id) ON DELETE CASCADE,
  ownership_model_id UUID REFERENCES public.ownership_models(id),
  assisted_farming_id UUID REFERENCES public.assisted_farming(id),
  investment_amount NUMERIC,
  status TEXT DEFAULT 'inquiry',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.land_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ownership_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_lands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assisted_farming ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.long_term_yield ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_land_interests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Feature flags: Anyone can read, only admins can modify
CREATE POLICY "Anyone can view feature flags"
ON public.feature_flags FOR SELECT USING (true);

CREATE POLICY "Admins can manage feature flags"
ON public.feature_flags FOR ALL
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Land types: Public read
CREATE POLICY "Anyone can view land types"
ON public.land_types FOR SELECT USING (true);

-- Ownership models: Public read
CREATE POLICY "Anyone can view ownership models"
ON public.ownership_models FOR SELECT USING (true);

-- Farm lands: Public read for verified, owners can manage their own
CREATE POLICY "Anyone can view verified farm lands"
ON public.farm_lands FOR SELECT USING (verified = true);

CREATE POLICY "Owners can view their own farm lands"
ON public.farm_lands FOR SELECT USING (auth.uid() = submitted_by);

CREATE POLICY "Authenticated users can submit farm lands"
ON public.farm_lands FOR INSERT WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Owners can update their farm lands"
ON public.farm_lands FOR UPDATE USING (auth.uid() = submitted_by);

-- Assisted farming: Public read for active programs
CREATE POLICY "Anyone can view active assisted farming"
ON public.assisted_farming FOR SELECT USING (active = true);

-- Long-term yield: Viewable if farm land is viewable
CREATE POLICY "Anyone can view yield projections for verified lands"
ON public.long_term_yield FOR SELECT
USING (EXISTS (SELECT 1 FROM farm_lands WHERE id = farm_land_id AND verified = true));

-- Farm land interests: Users can manage their own
CREATE POLICY "Users can view own interests"
ON public.farm_land_interests FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create interests"
ON public.farm_land_interests FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interests"
ON public.farm_land_interests FOR UPDATE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_farm_lands_land_type ON public.farm_lands(land_type_id);
CREATE INDEX idx_farm_lands_city ON public.farm_lands(city);
CREATE INDEX idx_farm_lands_verified ON public.farm_lands(verified);
CREATE INDEX idx_long_term_yield_farm_land ON public.long_term_yield(farm_land_id);
CREATE INDEX idx_farm_land_interests_user ON public.farm_land_interests(user_id);

-- Comments for documentation
COMMENT ON TABLE public.feature_flags IS 'Controls feature visibility across the platform';
COMMENT ON TABLE public.land_types IS 'Reference table for farm land categories';
COMMENT ON TABLE public.ownership_models IS 'Investment and ownership options for farm lands';
COMMENT ON TABLE public.farm_lands IS 'Farm land listings for natural living module';
COMMENT ON TABLE public.assisted_farming IS 'Managed farming service providers';
COMMENT ON TABLE public.long_term_yield IS 'Projected yields and returns for farm investments';
COMMENT ON TABLE public.farm_land_interests IS 'User inquiries and bookings for farm lands';