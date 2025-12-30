-- Create buyer_journey_events table to track buyer journey milestones
CREATE TABLE public.buyer_journey_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  reference_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for efficient querying by user
CREATE INDEX idx_buyer_journey_events_user_id ON public.buyer_journey_events(user_id);
CREATE INDEX idx_buyer_journey_events_created_at ON public.buyer_journey_events(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.buyer_journey_events ENABLE ROW LEVEL SECURITY;

-- Users can only view their own journey events
CREATE POLICY "Users can view own journey events"
ON public.buyer_journey_events
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own journey events
CREATE POLICY "Users can insert own journey events"
ON public.buyer_journey_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- System can insert journey events (for automated tracking)
CREATE POLICY "Service can insert journey events"
ON public.buyer_journey_events
FOR INSERT
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.buyer_journey_events IS 'Tracks buyer journey milestones for personalized timeline display';