-- Add assigned agent + listed_by to properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS assigned_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS listed_by text DEFAULT 'seller';

CREATE INDEX IF NOT EXISTS idx_properties_assigned_agent ON public.properties(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_city_locality ON public.properties(city, locality);
CREATE INDEX IF NOT EXISTS idx_agents_cities_verified ON public.agents(verified) WHERE verified = true;