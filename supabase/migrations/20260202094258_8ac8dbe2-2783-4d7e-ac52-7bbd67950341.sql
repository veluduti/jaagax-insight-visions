-- Fix permissive RLS policy on event_rsvps
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view event RSVPs" ON public.event_rsvps;

-- Create a more restrictive policy - users can see RSVPs for events they're interested in
CREATE POLICY "Users can view RSVPs for their events"
ON public.event_rsvps
FOR SELECT
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.community_events e 
    WHERE e.id = event_rsvps.event_id 
    AND e.organizer_id = auth.uid()
  )
);