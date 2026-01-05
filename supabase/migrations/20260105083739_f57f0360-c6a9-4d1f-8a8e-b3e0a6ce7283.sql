-- Add delivery tracking columns to whatsapp_logs
ALTER TABLE public.whatsapp_logs 
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_code TEXT;

-- Add reminder tracking to visit_bookings
ALTER TABLE public.visit_bookings
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Create index for faster queries on whatsapp_logs
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON public.whatsapp_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON public.whatsapp_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_booking_id ON public.whatsapp_logs(booking_id);

-- Create index for reminder queries
CREATE INDEX IF NOT EXISTS idx_visit_bookings_reminder ON public.visit_bookings(visit_date, status) WHERE reminder_sent_at IS NULL;