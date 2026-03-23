CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  city text NOT NULL,
  locality text NOT NULL,
  address text,
  latitude numeric,
  longitude numeric,
  price numeric NOT NULL DEFAULT 0,
  area_sqft numeric,
  type text DEFAULT 'Apartment',
  bhk integer,
  bedrooms integer,
  bathrooms integer,
  completion_stage text DEFAULT 'Ready',
  verified boolean DEFAULT false,
  trust_score numeric,
  images text[] DEFAULT '{}',
  video_urls text[] DEFAULT '{}',
  builder_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view verified properties"
  ON public.properties FOR SELECT
  TO public
  USING (verified = true);

CREATE POLICY "Anon can view properties for testing"
  ON public.properties FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert properties for testing"
  ON public.properties FOR INSERT
  TO anon
  WITH CHECK (true);