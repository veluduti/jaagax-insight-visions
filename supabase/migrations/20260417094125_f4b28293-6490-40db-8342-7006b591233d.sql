CREATE TABLE public.saved_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  last_count INTEGER NOT NULL DEFAULT 0,
  last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own saved searches" ON public.saved_searches
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own saved searches" ON public.saved_searches
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own saved searches" ON public.saved_searches
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users delete own saved searches" ON public.saved_searches
FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_saved_searches_updated_at
BEFORE UPDATE ON public.saved_searches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_saved_searches_user ON public.saved_searches(user_id);