
-- 1) Track which agent booked a hotel stay (agent booking on behalf of a client)
ALTER TABLE public.hotel_bookings
  ADD COLUMN IF NOT EXISTS booked_by_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hotel_bookings_booked_by_agent
  ON public.hotel_bookings(booked_by_agent_id);

-- 2) Let agents see and update the bookings they created
DROP POLICY IF EXISTS "Agents can view their own hotel bookings" ON public.hotel_bookings;
CREATE POLICY "Agents can view their own hotel bookings"
  ON public.hotel_bookings
  FOR SELECT
  TO authenticated
  USING (
    booked_by_agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Agents can update their own hotel bookings" ON public.hotel_bookings;
CREATE POLICY "Agents can update their own hotel bookings"
  ON public.hotel_bookings
  FOR UPDATE
  TO authenticated
  USING (
    booked_by_agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

-- 3) Notify the agent when a booking they created changes status
CREATE OR REPLACE FUNCTION public.notify_agent_hotel_booking_change()
RETURNS TRIGGER AS $$
DECLARE
  agent_user_id UUID;
BEGIN
  IF NEW.booked_by_agent_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  SELECT user_id INTO agent_user_id FROM public.agents WHERE id = NEW.booked_by_agent_id;
  IF agent_user_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    agent_user_id,
    'Client hotel booking ' || NEW.status,
    'Booking ' || COALESCE(NEW.booking_reference, NEW.id::text) || ' for ' || COALESCE(NEW.guest_name, 'guest') || ' is now ' || NEW.status || '.',
    CASE WHEN NEW.status IN ('confirmed','checked_in','completed') THEN 'success'
         WHEN NEW.status = 'cancelled' THEN 'alert'
         ELSE 'info' END,
    '/agent/dashboard?tab=hotels'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_agent_on_hotel_booking ON public.hotel_bookings;
CREATE TRIGGER trg_notify_agent_on_hotel_booking
  AFTER INSERT OR UPDATE OF status ON public.hotel_bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_agent_hotel_booking_change();
