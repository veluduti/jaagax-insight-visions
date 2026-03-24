
-- Advertisements table
CREATE TABLE public.advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id uuid,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  project_id uuid,
  ad_type text NOT NULL DEFAULT 'property',
  title text NOT NULL,
  tagline text,
  description text,
  images text[] DEFAULT '{}',
  highlights text[] DEFAULT '{}',
  offer_text text,
  cta_text text DEFAULT 'View Details',
  status text NOT NULL DEFAULT 'active',
  featured boolean DEFAULT false,
  priority integer DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  saves integer DEFAULT 0,
  contacts integer DEFAULT 0,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ad interactions tracking
CREATE TABLE public.ad_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid REFERENCES public.advertisements(id) ON DELETE CASCADE NOT NULL,
  user_id uuid,
  interaction_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_interactions ENABLE ROW LEVEL SECURITY;

-- Public read for active ads
CREATE POLICY "Anyone can view active advertisements"
  ON public.advertisements FOR SELECT
  USING (status = 'active');

-- Anyone can insert interactions
CREATE POLICY "Anyone can track ad interactions"
  ON public.ad_interactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view ad interactions"
  ON public.ad_interactions FOR SELECT
  USING (true);
