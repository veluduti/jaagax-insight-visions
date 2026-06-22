
ALTER TABLE public.agent_ratings ALTER COLUMN booking_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS agent_ratings_unique_verification
  ON public.agent_ratings (buyer_id, agent_id, property_id)
  WHERE booking_id IS NULL;
