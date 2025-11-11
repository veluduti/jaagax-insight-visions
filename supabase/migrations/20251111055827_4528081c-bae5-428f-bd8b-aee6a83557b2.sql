-- Create table for project amenities with web-sourced data
CREATE TABLE IF NOT EXISTS public.project_amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id INTEGER NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'Available',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, name)
);

-- Create table for project floor plans
CREATE TABLE IF NOT EXISTS public.project_floor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id INTEGER NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  bhk INTEGER NOT NULL,
  area NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  facing TEXT,
  description TEXT,
  features JSONB,
  plan_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for project specifications
CREATE TABLE IF NOT EXISTS public.project_specifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id INTEGER NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  specification TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for project highlights
CREATE TABLE IF NOT EXISTS public.project_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id INTEGER NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  highlight TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create table to track web data fetch status
CREATE TABLE IF NOT EXISTS public.project_web_data_status (
  project_id INTEGER PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  last_fetched_at TIMESTAMPTZ,
  fetch_status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.project_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_web_data_status ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access
CREATE POLICY "Anyone can view project amenities"
  ON public.project_amenities FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view project floor plans"
  ON public.project_floor_plans FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view project specifications"
  ON public.project_specifications FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view project highlights"
  ON public.project_highlights FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view project web data status"
  ON public.project_web_data_status FOR SELECT
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_amenities_project_id ON public.project_amenities(project_id);
CREATE INDEX IF NOT EXISTS idx_project_floor_plans_project_id ON public.project_floor_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_project_specifications_project_id ON public.project_specifications(project_id);
CREATE INDEX IF NOT EXISTS idx_project_highlights_project_id ON public.project_highlights(project_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_project_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_amenities_updated_at
  BEFORE UPDATE ON public.project_amenities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_data_updated_at();

CREATE TRIGGER update_project_floor_plans_updated_at
  BEFORE UPDATE ON public.project_floor_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_data_updated_at();

CREATE TRIGGER update_project_specifications_updated_at
  BEFORE UPDATE ON public.project_specifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_data_updated_at();

CREATE TRIGGER update_project_web_data_status_updated_at
  BEFORE UPDATE ON public.project_web_data_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_data_updated_at();