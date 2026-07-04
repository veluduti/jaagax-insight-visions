
ALTER TABLE public.hotel_bookings
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS razorpay_signature text,
  ADD COLUMN IF NOT EXISTS payment_attempted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_hotel_bookings_rzp_order ON public.hotel_bookings(razorpay_order_id);

-- Auto-generate a short booking reference on insert if missing
CREATE OR REPLACE FUNCTION public.set_hotel_booking_reference()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.booking_reference IS NULL OR NEW.booking_reference = '' THEN
    NEW.booking_reference := 'JX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_hotel_booking_reference ON public.hotel_bookings;
CREATE TRIGGER trg_set_hotel_booking_reference
BEFORE INSERT ON public.hotel_bookings
FOR EACH ROW EXECUTE FUNCTION public.set_hotel_booking_reference();
