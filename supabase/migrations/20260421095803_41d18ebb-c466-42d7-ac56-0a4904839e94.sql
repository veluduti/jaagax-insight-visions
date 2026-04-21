-- Add booking_kind to weekend_bookings to support both Weekend Explorer and Quick Visit flows
ALTER TABLE public.weekend_bookings
  ADD COLUMN IF NOT EXISTS booking_kind text NOT NULL DEFAULT 'weekend';

-- Constrain to known kinds
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'weekend_bookings_booking_kind_check'
  ) THEN
    ALTER TABLE public.weekend_bookings
      ADD CONSTRAINT weekend_bookings_booking_kind_check
      CHECK (booking_kind IN ('weekend', 'quick_visit'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_weekend_bookings_kind ON public.weekend_bookings(booking_kind);