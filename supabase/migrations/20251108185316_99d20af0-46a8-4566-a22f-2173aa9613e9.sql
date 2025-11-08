-- Create enum types
CREATE TYPE public.user_role AS ENUM ('buyer', 'seller', 'builder', 'admin');
CREATE TYPE public.property_type AS ENUM ('apartment', 'villa', 'plot', 'commercial');
CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE public.amenity_type AS ENUM ('gym', 'pool', 'parking', 'garden', 'clubhouse', 'playground', 'security');
CREATE TYPE public.poi_type AS ENUM ('metro', 'school', 'hospital', 'mall', 'office', 'airport');

-- Users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'buyer',
  verified BOOLEAN DEFAULT FALSE,
  city TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  locality TEXT NOT NULL,
  builder_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  rera_id TEXT,
  overview TEXT,
  avg_price NUMERIC,
  image TEXT,
  verified BOOLEAN DEFAULT FALSE,
  trust_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Properties table
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  price NUMERIC NOT NULL,
  type public.property_type NOT NULL,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  images TEXT[],
  verified BOOLEAN DEFAULT FALSE,
  trust_score INTEGER DEFAULT 0,
  city TEXT NOT NULL,
  locality TEXT NOT NULL,
  bhk INTEGER,
  area NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Towers table
CREATE TABLE public.towers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  floors INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Units table
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tower_id UUID REFERENCES public.towers(id) ON DELETE CASCADE,
  bhk INTEGER NOT NULL,
  area NUMERIC NOT NULL,
  facing TEXT,
  price NUMERIC NOT NULL,
  plan_svg TEXT,
  plan_3d TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Amenities table
CREATE TABLE public.amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  type public.amenity_type NOT NULL,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- POI (Points of Interest) table
CREATE TABLE public.poi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.poi_type NOT NULL,
  name TEXT NOT NULL,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  rating NUMERIC,
  city TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verifications table
CREATE TABLE public.verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  rera_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  status public.verification_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favorites table
CREATE TABLE public.favorites (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, property_id)
);

-- Analytics table
CREATE TABLE public.analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  impressions INTEGER DEFAULT 0,
  favorites INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chats table
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.towers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view all profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for properties
CREATE POLICY "Anyone can view verified properties" ON public.properties FOR SELECT USING (verified = true OR owner_id = auth.uid());
CREATE POLICY "Owners can insert properties" ON public.properties FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update own properties" ON public.properties FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete own properties" ON public.properties FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for projects
CREATE POLICY "Anyone can view verified projects" ON public.projects FOR SELECT USING (verified = true OR builder_id = auth.uid());
CREATE POLICY "Builders can insert projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = builder_id);
CREATE POLICY "Builders can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = builder_id);

-- RLS Policies for favorites
CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for chats
CREATE POLICY "Users can view own chats" ON public.chats FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send chats" ON public.chats FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Public read access for reference data
CREATE POLICY "Anyone can view POI" ON public.poi FOR SELECT USING (true);
CREATE POLICY "Anyone can view amenities" ON public.amenities FOR SELECT USING (true);
CREATE POLICY "Anyone can view units" ON public.units FOR SELECT USING (true);
CREATE POLICY "Anyone can view towers" ON public.towers FOR SELECT USING (true);

-- Analytics public read
CREATE POLICY "Anyone can view analytics" ON public.analytics FOR SELECT USING (true);

-- Verifications viewable by builders and admins
CREATE POLICY "Builders can view own verifications" ON public.verifications FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = verifications.project_id 
    AND projects.builder_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_properties_city ON public.properties(city);
CREATE INDEX idx_properties_locality ON public.properties(locality);
CREATE INDEX idx_properties_verified ON public.properties(verified);
CREATE INDEX idx_projects_city ON public.projects(city);
CREATE INDEX idx_poi_city ON public.poi(city);
CREATE INDEX idx_chats_sender ON public.chats(sender_id);
CREATE INDEX idx_chats_receiver ON public.chats(receiver_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_analytics_updated_at BEFORE UPDATE ON public.analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();