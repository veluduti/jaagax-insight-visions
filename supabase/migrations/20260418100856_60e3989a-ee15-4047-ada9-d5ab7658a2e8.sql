-- Agent ratings table
CREATE TABLE public.agent_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL UNIQUE,
  agent_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  property_id UUID,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_ratings_agent ON public.agent_ratings(agent_id);
CREATE INDEX idx_agent_ratings_buyer ON public.agent_ratings(buyer_id);

ALTER TABLE public.agent_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view agent ratings"
  ON public.agent_ratings FOR SELECT
  USING (true);

CREATE POLICY "Buyers can create own ratings"
  ON public.agent_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can update own ratings"
  ON public.agent_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id);

CREATE POLICY "Buyers can delete own ratings"
  ON public.agent_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = buyer_id);

CREATE POLICY "Admins manage all ratings"
  ON public.agent_ratings FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_agent_ratings_updated
  BEFORE UPDATE ON public.agent_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add summary columns to agents
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;

-- Recalc function + trigger
CREATE OR REPLACE FUNCTION public.recalc_agent_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_agent UUID;
BEGIN
  target_agent := COALESCE(NEW.agent_id, OLD.agent_id);
  UPDATE public.agents
  SET avg_rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.agent_ratings WHERE agent_id = target_agent), 0),
      total_ratings = COALESCE((SELECT COUNT(*) FROM public.agent_ratings WHERE agent_id = target_agent), 0)
  WHERE id = target_agent;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_recalc_agent_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.agent_ratings
  FOR EACH ROW EXECUTE FUNCTION public.recalc_agent_rating();