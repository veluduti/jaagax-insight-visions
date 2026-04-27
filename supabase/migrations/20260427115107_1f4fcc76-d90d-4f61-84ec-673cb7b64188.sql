-- Agent tasks (work items shown in agent dashboard)
CREATE TABLE IF NOT EXISTS public.agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  agent_user_id UUID,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL DEFAULT 'property_assigned',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'normal',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent ON public.agent_tasks(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user ON public.agent_tasks(agent_user_id, status);

ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all tasks"
  ON public.agent_tasks FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Agents view own tasks"
  ON public.agent_tasks FOR SELECT
  TO authenticated
  USING (
    auth.uid() = agent_user_id
    OR agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Agents update own tasks"
  ON public.agent_tasks FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = agent_user_id
    OR agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated can create tasks"
  ON public.agent_tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE TRIGGER trg_agent_tasks_updated
  BEFORE UPDATE ON public.agent_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();