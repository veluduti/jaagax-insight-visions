-- Create visit_story_updates table for live visit story feed
CREATE TABLE IF NOT EXISTS public.visit_story_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES visit_bookings(id) ON DELETE CASCADE,
  agent_id INTEGER REFERENCES agents(id),
  update_type TEXT NOT NULL CHECK (update_type IN ('photo', 'text', 'status')),
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create index for faster queries
CREATE INDEX idx_visit_story_booking ON visit_story_updates(booking_id);
CREATE INDEX idx_visit_story_expires ON visit_story_updates(expires_at);

-- Enable RLS
ALTER TABLE public.visit_story_updates ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view story updates for their booking
CREATE POLICY "Users can view stories for their visit"
ON public.visit_story_updates FOR SELECT
USING (
  booking_id IN (
    SELECT id FROM visit_bookings WHERE user_id = auth.uid() OR user_email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
  OR 
  agent_id IN (
    SELECT id FROM agents WHERE user_id = auth.uid()
  )
);

-- Policy: Agents can insert stories for their assigned visits
CREATE POLICY "Agents can create stories for their visits"
ON public.visit_story_updates FOR INSERT
WITH CHECK (
  agent_id IN (
    SELECT id FROM agents WHERE user_id = auth.uid()
  )
  AND
  booking_id IN (
    SELECT id FROM visit_bookings WHERE agent_id = visit_story_updates.agent_id
  )
);

-- Create visit_summaries table for AI-generated post-visit summaries
CREATE TABLE IF NOT EXISTS public.visit_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES visit_bookings(id) ON DELETE CASCADE,
  highlights TEXT[],
  buyer_liked TEXT[],
  concerns TEXT[],
  next_steps TEXT[],
  recommended_properties JSONB,
  ai_insights TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.visit_summaries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view summaries for their bookings
CREATE POLICY "Users can view their visit summaries"
ON public.visit_summaries FOR SELECT
USING (
  booking_id IN (
    SELECT id FROM visit_bookings WHERE user_id = auth.uid() OR user_email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
);

-- Policy: Service role can manage summaries
CREATE POLICY "Service can manage summaries"
ON public.visit_summaries FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Add XP system columns to agents table
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS xp_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS completed_visits INTEGER DEFAULT 0;

-- Create function to auto-delete expired stories
CREATE OR REPLACE FUNCTION delete_expired_stories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.visit_story_updates
  WHERE expires_at < NOW();
END;
$$;

-- Create trigger to update agent XP when visit completes
CREATE OR REPLACE FUNCTION update_agent_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE agents
    SET 
      xp_points = xp_points + 10,
      completed_visits = completed_visits + 1,
      level = FLOOR((xp_points + 10) / 100) + 1
    WHERE id = NEW.agent_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_agent_xp
AFTER UPDATE ON visit_bookings
FOR EACH ROW
EXECUTE FUNCTION update_agent_xp();