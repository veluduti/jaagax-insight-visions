ALTER TABLE public.smart_visit_bookings ADD COLUMN IF NOT EXISTS customer_hidden boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.smart_visit_plan_lifecycle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status = 'completed' THEN
    -- picked-up / confirmed travellers become completed (customer gets "rate your agent" via booking guard)
    UPDATE public.smart_visit_bookings SET status = 'completed'
      WHERE plan_id = NEW.id AND status IN ('confirmed','picked_up');
    UPDATE public.smart_visit_bookings SET status = 'no_show'
      WHERE plan_id = NEW.id AND status = 'booked';
    INSERT INTO public.notifications(user_id, type, title, message, link, metadata)
    SELECT ur.user_id, 'smart_visit_admin', 'Smart Visit completed',
      '"' || NEW.title || '" on ' || NEW.visit_date || ' was marked completed by the agent.',
      '/admin', jsonb_build_object('plan_id', NEW.id)
    FROM public.user_roles ur WHERE ur.role::text = 'admin';
  ELSIF NEW.status = 'cancelled' THEN
    INSERT INTO public.notifications(user_id, type, title, message, link, metadata)
    SELECT ur.user_id, 'smart_visit_admin', 'Smart Visit cancelled — check refunds',
      '"' || NEW.title || '" on ' || NEW.visit_date || ' was cancelled. Paid bookings: ' ||
      (SELECT count(*) FROM public.smart_visit_bookings b WHERE b.plan_id = NEW.id AND b.payment_status = 'paid') || '.',
      '/admin', jsonb_build_object('plan_id', NEW.id)
    FROM public.user_roles ur WHERE ur.role::text = 'admin';
    INSERT INTO public.notifications(user_id, type, title, message, link, metadata)
    VALUES (NEW.agent_user_id, 'smart_visit', 'You cancelled a Smart Visit',
      '"' || NEW.title || '" was cancelled. All booked customers have been notified.',
      '/dashboard/agent/smart-visits', jsonb_build_object('plan_id', NEW.id));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_smart_visit_plan_lifecycle ON public.smart_visit_plans;
CREATE TRIGGER trg_smart_visit_plan_lifecycle AFTER UPDATE OF status ON public.smart_visit_plans
FOR EACH ROW EXECUTE FUNCTION public.smart_visit_plan_lifecycle();

CREATE OR REPLACE FUNCTION public.smart_visit_booking_paid_cancel_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t text;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' AND NEW.payment_status = 'paid' THEN
    SELECT title INTO t FROM public.smart_visit_plans WHERE id = NEW.plan_id;
    INSERT INTO public.notifications(user_id, type, title, message, link, metadata)
    SELECT ur.user_id, 'smart_visit_admin', 'Paid Smart Visit booking cancelled',
      COALESCE(NEW.customer_name,'A customer') || ' (₹' || NEW.total_amount || ') — "' || COALESCE(t,'Smart Visit') || '". Refund review needed.',
      '/admin', jsonb_build_object('plan_id', NEW.plan_id, 'booking_id', NEW.id)
    FROM public.user_roles ur WHERE ur.role::text = 'admin';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_smart_visit_booking_paid_cancel ON public.smart_visit_bookings;
CREATE TRIGGER trg_smart_visit_booking_paid_cancel AFTER UPDATE OF status ON public.smart_visit_bookings
FOR EACH ROW EXECUTE FUNCTION public.smart_visit_booking_paid_cancel_notify();