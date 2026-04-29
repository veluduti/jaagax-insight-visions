ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS listing_status TEXT NOT NULL DEFAULT 'complete';

CREATE INDEX IF NOT EXISTS idx_properties_listing_status ON public.properties(listing_status);
CREATE INDEX IF NOT EXISTS idx_properties_assigned_agent ON public.properties(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_status ON public.agent_tasks(agent_id, status);