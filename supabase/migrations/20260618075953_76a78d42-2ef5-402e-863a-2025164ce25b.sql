
CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('search','visit','posting','wallet','enquiry','favorite','view')),
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_created ON public.user_activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON public.user_activities(user_id, activity_type, created_at DESC);

GRANT SELECT, INSERT ON public.user_activities TO authenticated;
GRANT ALL ON public.user_activities TO service_role;

ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_activities_select" ON public.user_activities
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_activities_insert" ON public.user_activities
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
