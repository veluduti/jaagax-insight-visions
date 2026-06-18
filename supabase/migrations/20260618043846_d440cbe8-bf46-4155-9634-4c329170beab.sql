
-- Extend preferred_locations
ALTER TABLE public.preferred_locations
  ADD COLUMN IF NOT EXISTS builder_profile_id UUID,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS locality TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS property_id UUID;

CREATE INDEX IF NOT EXISTS idx_preferred_locations_builder ON public.preferred_locations(builder_profile_id);

DROP POLICY IF EXISTS "Builders manage their preferred locations" ON public.preferred_locations;
CREATE POLICY "Builders manage their preferred locations"
ON public.preferred_locations FOR ALL
TO authenticated
USING (
  builder_profile_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.builder_profiles bp WHERE bp.id = preferred_locations.builder_profile_id AND bp.user_id = auth.uid()
  )
)
WITH CHECK (
  builder_profile_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.builder_profiles bp WHERE bp.id = preferred_locations.builder_profile_id AND bp.user_id = auth.uid()
  )
);

-- Agent Success Scores
CREATE TABLE IF NOT EXISTS public.agent_success_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  builder_profile_id UUID NOT NULL,
  response_time NUMERIC NOT NULL DEFAULT 0,
  conversion_rate NUMERIC NOT NULL DEFAULT 0,
  verified_listings INTEGER NOT NULL DEFAULT 0,
  customer_rating NUMERIC NOT NULL DEFAULT 0,
  visit_success_rate NUMERIC NOT NULL DEFAULT 0,
  overall_score NUMERIC NOT NULL DEFAULT 0,
  last_calculated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_success_scores TO authenticated;
GRANT ALL ON public.agent_success_scores TO service_role;

ALTER TABLE public.agent_success_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Builders manage their success scores" ON public.agent_success_scores;
CREATE POLICY "Builders manage their success scores"
ON public.agent_success_scores FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.builder_profiles bp WHERE bp.id = agent_success_scores.builder_profile_id AND bp.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.builder_profiles bp WHERE bp.id = agent_success_scores.builder_profile_id AND bp.user_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_agent_success_scores_builder ON public.agent_success_scores(builder_profile_id);

CREATE OR REPLACE FUNCTION public.update_agent_success_scores_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_agent_success_scores_updated ON public.agent_success_scores;
CREATE TRIGGER trg_agent_success_scores_updated
BEFORE UPDATE ON public.agent_success_scores
FOR EACH ROW EXECUTE FUNCTION public.update_agent_success_scores_updated_at();
