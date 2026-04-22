-- Create property_events table for analytics tracking
CREATE TABLE IF NOT EXISTS public.property_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  user_id UUID,
  event_type TEXT NOT NULL,
  source TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for fast aggregation
CREATE INDEX IF NOT EXISTS idx_property_events_property ON public.property_events(property_id);
CREATE INDEX IF NOT EXISTS idx_property_events_event_type ON public.property_events(event_type);
CREATE INDEX IF NOT EXISTS idx_property_events_created_at ON public.property_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_events_source ON public.property_events(source);
CREATE INDEX IF NOT EXISTS idx_property_events_property_created ON public.property_events(property_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.property_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (anonymous + authenticated)
CREATE POLICY "Anyone can insert property events"
  ON public.property_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Builders can view events for their own properties
CREATE POLICY "Builders view own property events"
  ON public.property_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_events.property_id
        AND (p.submitted_by = auth.uid() OR p.builder_id = auth.uid())
    )
  );

-- Admins can manage everything
CREATE POLICY "Admins manage all property events"
  ON public.property_events
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));