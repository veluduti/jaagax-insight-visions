ALTER TABLE public.hotel_bookings
  ADD COLUMN IF NOT EXISTS room_number text,
  ADD COLUMN IF NOT EXISTS extra_charges numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS housekeeping_status text,
  ADD COLUMN IF NOT EXISTS housekeeping_staff text,
  ADD COLUMN IF NOT EXISTS room_cleaned_at timestamptz;