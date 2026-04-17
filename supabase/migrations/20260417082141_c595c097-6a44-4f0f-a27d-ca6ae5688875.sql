
CREATE TABLE public.buyer_journey_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id UUID NOT NULL,
  stage TEXT NOT NULL DEFAULT 'viewed',
  notes TEXT,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  shortlisted_at TIMESTAMPTZ,
  contacted_at TIMESTAMPTZ,
  visit_scheduled_at TIMESTAMPTZ,
  visited_at TIMESTAMPTZ,
  booked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, property_id)
);

ALTER TABLE public.buyer_journey_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own journey"
ON public.buyer_journey_events FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own journey"
ON public.buyer_journey_events FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own journey"
ON public.buyer_journey_events FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own journey"
ON public.buyer_journey_events FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_buyer_journey_user ON public.buyer_journey_events(user_id, stage);

CREATE TRIGGER update_buyer_journey_updated_at
BEFORE UPDATE ON public.buyer_journey_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
