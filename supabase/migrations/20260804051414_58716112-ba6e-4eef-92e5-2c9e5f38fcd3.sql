CREATE TABLE public.agent_project_experience (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  project_name text NOT NULL,
  project_type text NOT NULL,
  experience_years numeric NOT NULL DEFAULT 0,
  project_location text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.agent_project_experience TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_project_experience TO authenticated;
GRANT ALL ON public.agent_project_experience TO service_role;

ALTER TABLE public.agent_project_experience ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project experience is publicly viewable"
  ON public.agent_project_experience FOR SELECT
  USING (true);

CREATE POLICY "Agents manage their own project experience"
  ON public.agent_project_experience FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.user_id = auth.uid()));

CREATE INDEX idx_agent_project_experience_agent ON public.agent_project_experience(agent_id, sort_order);

CREATE TRIGGER update_agent_project_experience_updated_at
  BEFORE UPDATE ON public.agent_project_experience
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();