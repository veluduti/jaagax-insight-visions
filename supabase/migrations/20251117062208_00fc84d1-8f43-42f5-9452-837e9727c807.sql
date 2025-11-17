-- Add new columns to visit_bookings table
ALTER TABLE visit_bookings 
ADD COLUMN IF NOT EXISTS builder_id integer REFERENCES builders(id),
ADD COLUMN IF NOT EXISTS otp_code text,
ADD COLUMN IF NOT EXISTS qr_code_url text,
ADD COLUMN IF NOT EXISTS whatsapp_thread_id text,
ADD COLUMN IF NOT EXISTS agent_location jsonb,
ADD COLUMN IF NOT EXISTS vehicle_location jsonb,
ADD COLUMN IF NOT EXISTS builder_notes text,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Update status column to support new statuses
ALTER TABLE visit_bookings 
DROP CONSTRAINT IF EXISTS visit_bookings_status_check;

ALTER TABLE visit_bookings 
ADD CONSTRAINT visit_bookings_status_check 
CHECK (status IN ('requested', 'builder_pending', 'builder_rejected', 'agent_pending', 'confirmed', 'in_progress', 'completed', 'cancelled'));

-- Create visit_locations table for tracking history
CREATE TABLE IF NOT EXISTS visit_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES visit_bookings(id) ON DELETE CASCADE,
  location_type text NOT NULL CHECK (location_type IN ('agent', 'vehicle')),
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create whatsapp_logs table for debugging
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES visit_bookings(id) ON DELETE SET NULL,
  recipient text NOT NULL,
  message text NOT NULL,
  template_type text,
  status text DEFAULT 'sent',
  error_message text,
  twilio_sid text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE visit_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for visit_locations
CREATE POLICY "Anyone can view visit locations"
  ON visit_locations FOR SELECT
  USING (true);

CREATE POLICY "Agents can update visit locations"
  ON visit_locations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM visit_bookings
      WHERE visit_bookings.id = booking_id
      AND visit_bookings.agent_id IN (
        SELECT id FROM agents WHERE user_id = auth.uid()
      )
    )
  );

-- RLS policies for whatsapp_logs
CREATE POLICY "Admins can view whatsapp logs"
  ON whatsapp_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Service can insert whatsapp logs"
  ON whatsapp_logs FOR INSERT
  WITH CHECK (true);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_visit_locations_booking ON visit_locations(booking_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_booking ON whatsapp_logs(booking_id);

-- Update visit_bookings RLS to allow builders to view their properties' visits
CREATE POLICY "Builders can view visits for their properties"
  ON visit_bookings FOR SELECT
  USING (
    builder_id IN (
      SELECT id FROM builders WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Builders can update their property visits"
  ON visit_bookings FOR UPDATE
  USING (
    builder_id IN (
      SELECT id FROM builders WHERE user_id = auth.uid()
    )
  );

-- Enable realtime for visit_bookings
ALTER PUBLICATION supabase_realtime ADD TABLE visit_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE visit_locations;