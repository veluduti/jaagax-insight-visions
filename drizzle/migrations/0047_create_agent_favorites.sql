CREATE TABLE public.agent_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, agent_id)
);
GRANT SELECT, INSERT, DELETE ON public.agent_favorites TO authenticated;
GRANT ALL ON public.agent_favorites TO service_role;
ALTER TABLE public.agent_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own agent favorites" ON public.agent_favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add own agent favorites" ON public.agent_favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own agent favorites" ON public.agent_favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);