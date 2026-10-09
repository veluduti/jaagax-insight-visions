ALTER TABLE public.smart_visit_bookings ADD COLUMN IF NOT EXISTS cancel_reason text;

CREATE OR REPLACE FUNCTION public.smart_visit_booking_customer_cancel_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; _left int;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    SELECT * INTO p FROM public.smart_visit_plans WHERE id = NEW.plan_id;
    IF p.id IS NULL OR p.status = 'cancelled' THEN RETURN NEW; END IF;
    _left := p.max_seats - public.smart_visit_seats_taken(p.id);
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (p.agent_user_id, 'smart_visit', 'Customer cancelled a Smart Visit booking',
      COALESCE(NEW.customer_name, 'A customer') || ' cancelled ' || NEW.seats || ' seat(s) for "' || p.title || '" on ' || p.visit_date ||
      COALESCE('. Reason: ' || NULLIF(trim(NEW.cancel_reason), ''), '') || '. ' || _left || ' of ' || p.max_seats || ' seats are now available.',
      jsonb_build_object('plan_id', p.id, 'booking_id', NEW.id, 'seats_left', _left, 'link', '/agent/smart-visits'));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_smart_visit_booking_customer_cancel ON public.smart_visit_bookings;
CREATE TRIGGER trg_smart_visit_booking_customer_cancel AFTER UPDATE OF status ON public.smart_visit_bookings
FOR EACH ROW EXECUTE FUNCTION public.smart_visit_booking_customer_cancel_notify();