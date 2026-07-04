
ALTER TABLE public.hotel_bookings
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS razorpay_refund_id text,
  ADD COLUMN IF NOT EXISTS refunded_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS actual_check_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS actual_check_out_at timestamptz;

-- Status-change notifications for guest + hotel staff + admins
CREATE OR REPLACE FUNCTION public.notify_on_hotel_booking_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_title text; v_msg text; v_type text := 'info';
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'checked_in' THEN
    v_title := 'Checked in ✅';
    v_msg := 'You are checked in at ' || COALESCE(NEW.hotel_name, 'the hotel') || '. Have a great stay!';
    v_type := 'success';
    NEW.actual_check_in_at := COALESCE(NEW.actual_check_in_at, now());
  ELSIF NEW.status = 'checked_out' THEN
    v_title := 'Thanks for staying with us';
    v_msg := 'Your check-out for ' || COALESCE(NEW.hotel_name, 'the hotel') || ' is complete. Please share a review!';
    v_type := 'success';
    NEW.actual_check_out_at := COALESCE(NEW.actual_check_out_at, now());
  ELSIF NEW.status = 'cancelled' THEN
    v_title := 'Booking cancelled';
    v_msg := 'Your booking ' || COALESCE(NEW.booking_reference, '') ||
             ' at ' || COALESCE(NEW.hotel_name, 'the hotel') || ' is cancelled.' ||
             CASE WHEN COALESCE(NEW.refunded_amount,0) > 0
                  THEN ' ₹' || NEW.refunded_amount::text || ' will be refunded to your original payment method.'
                  ELSE '' END;
    v_type := 'alert';
  ELSE
    RETURN NEW;
  END IF;

  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, message, link, is_read)
    VALUES (NEW.user_id, v_type, v_title, v_msg, '/dashboard/buyer?tab=bookings', false);
  END IF;

  INSERT INTO public.notifications(user_id, type, title, message, link, is_read)
  SELECT s.user_id, 'info',
    'Booking ' || NEW.status,
    NEW.guest_name || ' · ' || COALESCE(NEW.booking_reference, '') || ' · ' || NEW.check_in || ' → ' || NEW.check_out,
    '/partners/reservations', false
  FROM public.hotel_staff s WHERE s.hotel_id = NEW.hotel_id;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_hotel_booking_status ON public.hotel_bookings;
CREATE TRIGGER trg_notify_hotel_booking_status
BEFORE UPDATE OF status ON public.hotel_bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_on_hotel_booking_status_change();
