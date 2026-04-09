
CREATE TABLE public.builder_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  builder_name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'standard',
  price_range_min NUMERIC,
  price_range_max NUMERIC,
  number_of_projects INTEGER DEFAULT 0,
  unit_types TEXT[] DEFAULT '{}',
  locations TEXT[] DEFAULT '{}',
  amenities TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  videos TEXT[] DEFAULT '{}',
  phone TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  years_of_experience INTEGER,
  certifications TEXT,
  rera_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view builder profiles"
ON public.builder_profiles
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create profiles"
ON public.builder_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profiles"
ON public.builder_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles"
ON public.builder_profiles
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
