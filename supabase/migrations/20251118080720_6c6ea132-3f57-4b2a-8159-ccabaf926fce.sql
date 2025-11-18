-- Create storage bucket for visit feedback photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'visit-feedback-photos',
  'visit-feedback-photos',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- RLS policies for visit feedback photos
CREATE POLICY "Users can upload their visit feedback photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'visit-feedback-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own feedback photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'visit-feedback-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Agents can view feedback photos for their visits"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'visit-feedback-photos' AND
  EXISTS (
    SELECT 1 FROM visit_feedback vf
    JOIN visit_bookings vb ON vf.booking_id = vb.id
    JOIN agents a ON vb.agent_id = a.id
    WHERE 
      vf.id::text = (storage.foldername(name))[2] AND
      a.user_id = auth.uid()
  )
);

-- Add photo_urls column to visit_feedback table
ALTER TABLE visit_feedback
ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add visit completion timestamp
ALTER TABLE visit_bookings
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster analytics queries
CREATE INDEX IF NOT EXISTS idx_visit_bookings_status_completed ON visit_bookings(status, completed_at) 
WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_visit_feedback_booking_rating ON visit_feedback(booking_id, rating, created_at);

-- Function to automatically send WhatsApp when visit is confirmed
CREATE OR REPLACE FUNCTION send_whatsapp_on_visit_confirmed()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  tracking_url TEXT;
  message TEXT;
BEGIN
  -- Only send when status changes to confirmed
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Construct tracking URL (will be replaced with actual domain in edge function)
    tracking_url := 'TRACKING_URL_PLACEHOLDER/visit/live/' || NEW.id;
    
    -- Construct message
    message := 'Your property visit has been confirmed! 🎉' || E'\n\n' ||
               'Date: ' || TO_CHAR(NEW.visit_date, 'DD Mon YYYY') || E'\n' ||
               'Time: ' || NEW.visit_time || E'\n\n' ||
               'Track your visit in real-time: ' || tracking_url || E'\n\n' ||
               'Please save this link for live tracking on the day of your visit.';
    
    -- Queue WhatsApp notification (will be sent by edge function)
    INSERT INTO visit_notifications (
      booking_id,
      notification_type,
      recipient,
      message,
      status,
      metadata
    ) VALUES (
      NEW.id,
      'whatsapp',
      NEW.user_phone,
      message,
      'pending',
      jsonb_build_object(
        'template_type', 'visit_confirmed',
        'tracking_url', tracking_url
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for WhatsApp notifications
DROP TRIGGER IF EXISTS trigger_send_whatsapp_on_visit_confirmed ON visit_bookings;
CREATE TRIGGER trigger_send_whatsapp_on_visit_confirmed
AFTER INSERT OR UPDATE ON visit_bookings
FOR EACH ROW
EXECUTE FUNCTION send_whatsapp_on_visit_confirmed();

-- Update RLS policies for visit_feedback to allow users to submit feedback
CREATE POLICY "Users can submit feedback for their visits" ON visit_feedback
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM visit_bookings vb
    WHERE vb.id = visit_feedback.booking_id
    AND vb.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view feedback for their visits" ON visit_feedback
FOR SELECT
TO authenticated
USING (
  visit_feedback.user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM visit_bookings vb
    JOIN agents a ON vb.agent_id = a.id
    WHERE vb.id = visit_feedback.booking_id AND a.user_id = auth.uid()
  )
);