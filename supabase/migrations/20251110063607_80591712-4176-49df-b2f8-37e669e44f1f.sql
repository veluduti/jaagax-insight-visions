-- Create community_profiles table for AI-generated locality insights
CREATE TABLE IF NOT EXISTS public.community_profiles (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  city text NOT NULL,
  locality text NOT NULL,
  avg_price numeric,
  appreciation_rate numeric,
  verified_projects integer DEFAULT 0,
  verified_properties integer DEFAULT 0,
  ai_summary text,
  ai_recommendation text,
  ai_rating integer CHECK (ai_rating >= 1 AND ai_rating <= 5),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(city, locality)
);

-- Enable RLS
ALTER TABLE public.community_profiles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read community profiles
CREATE POLICY "Anyone can view community profiles"
ON public.community_profiles
FOR SELECT
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_community_profiles_city_locality ON public.community_profiles(city, locality);
CREATE INDEX idx_community_profiles_rating ON public.community_profiles(ai_rating DESC);

-- Add trigger to update updated_at
CREATE TRIGGER update_community_profiles_updated_at
BEFORE UPDATE ON public.community_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();