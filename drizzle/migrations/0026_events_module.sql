CREATE OR REPLACE FUNCTION public.can_organize_events(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND (
    public.is_global_admin(_uid)
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role::text IN ('agent','builder','admin'))
    OR EXISTS (SELECT 1 FROM public.agents WHERE user_id = _uid)
    OR EXISTS (SELECT 1 FROM public.builder_profiles WHERE user_id = _uid)
  )
$$;

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL,
  organizer_name text,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 150),
  description text CHECK (char_length(description) <= 5000),
  event_type text NOT NULL DEFAULT 'property_launch',
  event_date date NOT NULL,
  start_time time NOT NULL,
  end_time time,
  venue text NOT NULL,
  address text,
  city text,
  latitude double precision,
  longitude double precision,
  image_urls text[] NOT NULL DEFAULT '{}',
  property_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('draft','pending_approval','approved','rejected','cancelled','completed')),
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_status_date_idx ON public.events(status, event_date);
CREATE INDEX events_organizer_idx ON public.events(organizer_id);

CREATE TABLE public.event_ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('free','paid','vip')),
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  quantity integer NOT NULL CHECK (quantity > 0 AND quantity <= 100000),
  sold integer NOT NULL DEFAULT 0 CHECK (sold >= 0),
  sales_start timestamptz,
  sales_end timestamptz,
  benefits text[] NOT NULL DEFAULT '{}',
  requires_payment boolean NOT NULL DEFAULT true,
  max_per_booking integer NOT NULL DEFAULT 10 CHECK (max_per_booking BETWEEN 1 AND 50),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ticket_sold_le_qty CHECK (sold <= quantity),
  CONSTRAINT ticket_price_rules CHECK (
    (kind = 'free' AND price = 0) OR (kind = 'paid' AND price >= 1) OR (kind = 'vip' AND (price >= 1 OR NOT requires_payment))
  )
);
CREATE INDEX event_ticket_types_event_idx ON public.event_ticket_types(event_id);

CREATE TABLE public.event_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_type_id uuid NOT NULL REFERENCES public.event_ticket_types(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL,
  customer_name text,
  customer_email text,
  customer_phone text,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment','confirmed','failed','cancelled')),
  payment_status text NOT NULL DEFAULT 'not_required' CHECK (payment_status IN ('not_required','pending','paid','failed','refund_pending','refunded')),
  booking_reference text NOT NULL UNIQUE DEFAULT ('EVT-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  razorpay_order_id text,
  razorpay_payment_id text,
  paid_at timestamptz,
  confirmed_at timestamptz,
  checked_in_count integer NOT NULL DEFAULT 0,
  checked_in_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX event_bookings_one_active_per_customer ON public.event_bookings(event_id, customer_id) WHERE status IN ('pending_payment','confirmed');
CREATE INDEX event_bookings_customer_idx ON public.event_bookings(customer_id);
CREATE INDEX event_bookings_event_idx ON public.event_bookings(event_id);

GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
GRANT SELECT ON public.event_ticket_types TO anon, authenticated;
GRANT INSERT (event_id, kind, name, price, quantity, sales_start, sales_end, benefits, requires_payment, max_per_booking) ON public.event_ticket_types TO authenticated;
GRANT UPDATE (kind, name, price, quantity, sales_start, sales_end, benefits, requires_payment, max_per_booking) ON public.event_ticket_types TO authenticated;
GRANT DELETE ON public.event_ticket_types TO authenticated;
GRANT ALL ON public.event_ticket_types TO service_role;
GRANT SELECT ON public.event_bookings TO authenticated;
GRANT ALL ON public.event_bookings TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_bookings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_event_organizer(_event_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND organizer_id = _uid)
$$;

CREATE POLICY "events_public_read" ON public.events FOR SELECT TO anon, authenticated
  USING (status IN ('approved','completed') OR organizer_id = auth.uid() OR public.is_global_admin(auth.uid()));
CREATE POLICY "events_organizer_insert" ON public.events FOR INSERT TO authenticated
  WITH CHECK (organizer_id = auth.uid() AND public.can_organize_events(auth.uid()));
CREATE POLICY "events_organizer_update" ON public.events FOR UPDATE TO authenticated
  USING (organizer_id = auth.uid() OR public.is_global_admin(auth.uid()))
  WITH CHECK (organizer_id = auth.uid() OR public.is_global_admin(auth.uid()));
CREATE POLICY "events_organizer_delete" ON public.events FOR DELETE TO authenticated
  USING (organizer_id = auth.uid() AND status IN ('draft','pending_approval','rejected')
         AND NOT EXISTS (SELECT 1 FROM public.event_bookings b WHERE b.event_id = events.id));

CREATE POLICY "tickets_read" ON public.event_ticket_types FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id));
CREATE POLICY "tickets_organizer_write" ON public.event_ticket_types FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid() AND e.status IN ('draft','pending_approval','rejected')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid() AND e.status IN ('draft','pending_approval','rejected')));

CREATE POLICY "bookings_read" ON public.event_bookings FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.is_event_organizer(event_id, auth.uid()) OR public.is_global_admin(auth.uid()));

-- Status guard: only global admins approve/reject; organizer edits after rejection resubmit.
CREATE OR REPLACE FUNCTION public.events_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin boolean := public.is_global_admin(auth.uid());
BEGIN
  NEW.updated_at := now();
  IF auth.uid() IS NULL THEN RETURN NEW; END IF; -- service role
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('draft','pending_approval') THEN NEW.status := 'pending_approval'; END IF;
    NEW.reviewed_by := NULL; NEW.reviewed_at := NULL; NEW.rejection_reason := NULL;
    IF NEW.event_date < (now() AT TIME ZONE 'Asia/Kolkata')::date THEN RAISE EXCEPTION 'Event date must be today or later'; END IF;
    IF NEW.end_time IS NOT NULL AND NEW.end_time <= NEW.start_time THEN RAISE EXCEPTION 'End time must be after start time'; END IF;
    RETURN NEW;
  END IF;
  NEW.organizer_id := OLD.organizer_id;
  IF NEW.end_time IS NOT NULL AND NEW.end_time <= NEW.start_time THEN RAISE EXCEPTION 'End time must be after start time'; END IF;
  IF NOT v_admin THEN
    NEW.reviewed_by := OLD.reviewed_by; NEW.reviewed_at := OLD.reviewed_at;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT ((OLD.status IN ('draft','rejected') AND NEW.status = 'pending_approval')
           OR (OLD.status = 'pending_approval' AND NEW.status = 'draft')) THEN
        RAISE EXCEPTION 'You cannot change the event status this way';
      END IF;
    END IF;
    IF NEW.status = 'pending_approval' AND OLD.status <> 'pending_approval' THEN
      NEW.submitted_at := now(); NEW.rejection_reason := NULL;
    ELSE
      NEW.rejection_reason := OLD.rejection_reason;
    END IF;
    IF OLD.status IN ('cancelled','completed') THEN RAISE EXCEPTION 'This event can no longer be edited'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER events_guard_trg BEFORE INSERT OR UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.events_guard();

CREATE OR REPLACE FUNCTION public.event_tickets_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.kind = 'free' THEN NEW.price := 0; NEW.requires_payment := false; END IF;
  IF NEW.kind = 'paid' THEN NEW.requires_payment := true; END IF;
  IF NEW.kind = 'vip' AND NEW.price = 0 THEN NEW.requires_payment := false; END IF;
  IF NEW.sales_start IS NOT NULL AND NEW.sales_end IS NOT NULL AND NEW.sales_end <= NEW.sales_start THEN
    RAISE EXCEPTION 'Ticket sales end must be after sales start';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER event_tickets_guard_trg BEFORE INSERT OR UPDATE ON public.event_ticket_types FOR EACH ROW EXECUTE FUNCTION public.event_tickets_guard();

-- Release seats held by unpaid bookings older than 15 minutes.
CREATE OR REPLACE FUNCTION public.event_release_stale_holds(_ticket_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, quantity, ticket_type_id FROM public.event_bookings
    WHERE ticket_type_id = _ticket_id AND status = 'pending_payment' AND created_at < now() - interval '15 minutes' FOR UPDATE
  LOOP
    UPDATE public.event_bookings SET status = 'failed', payment_status = 'failed', updated_at = now() WHERE id = r.id;
    UPDATE public.event_ticket_types SET sold = GREATEST(sold - r.quantity, 0) WHERE id = r.ticket_type_id;
  END LOOP;
END $$;

-- Reserve seats atomically (called by the backend with the customer's id).
CREATE OR REPLACE FUNCTION public.event_reserve(_uid uuid, _ticket_id uuid, _qty integer, _name text, _email text, _phone text)
RETURNS public.event_bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.event_ticket_types; e public.events; b public.event_bookings; v_pay boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF _qty IS NULL OR _qty < 1 THEN RAISE EXCEPTION 'Choose at least one ticket'; END IF;
  PERFORM public.event_release_stale_holds(_ticket_id);
  SELECT * INTO t FROM public.event_ticket_types WHERE id = _ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket type not found'; END IF;
  SELECT * INTO e FROM public.events WHERE id = t.event_id;
  IF e.status <> 'approved' THEN RAISE EXCEPTION 'This event is not open for booking'; END IF;
  IF (e.event_date + COALESCE(e.end_time, e.start_time)) < (now() AT TIME ZONE 'Asia/Kolkata') THEN RAISE EXCEPTION 'This event has already ended'; END IF;
  IF e.organizer_id = _uid THEN RAISE EXCEPTION 'Organizers cannot book their own event'; END IF;
  IF t.sales_start IS NOT NULL AND now() < t.sales_start THEN RAISE EXCEPTION 'Sales for this ticket have not started yet'; END IF;
  IF t.sales_end IS NOT NULL AND now() > t.sales_end THEN RAISE EXCEPTION 'Sales for this ticket have ended'; END IF;
  IF _qty > t.max_per_booking THEN RAISE EXCEPTION 'You can book at most % tickets of this type', t.max_per_booking; END IF;
  IF t.sold + _qty > t.quantity THEN RAISE EXCEPTION 'Only % seats left for this ticket', GREATEST(t.quantity - t.sold, 0); END IF;
  IF EXISTS (SELECT 1 FROM public.event_bookings WHERE event_id = e.id AND customer_id = _uid AND status = 'confirmed') THEN
    RAISE EXCEPTION 'You already have a booking for this event';
  END IF;
  -- Replace an older unpaid attempt by the same customer
  UPDATE public.event_ticket_types tt SET sold = GREATEST(tt.sold - x.quantity, 0)
    FROM public.event_bookings x WHERE x.event_id = e.id AND x.customer_id = _uid AND x.status = 'pending_payment' AND tt.id = x.ticket_type_id;
  UPDATE public.event_bookings SET status = 'failed', payment_status = 'failed', updated_at = now()
    WHERE event_id = e.id AND customer_id = _uid AND status = 'pending_payment';
  SELECT * INTO t FROM public.event_ticket_types WHERE id = _ticket_id;
  IF t.sold + _qty > t.quantity THEN RAISE EXCEPTION 'Only % seats left for this ticket', GREATEST(t.quantity - t.sold, 0); END IF;

  v_pay := t.requires_payment AND t.price > 0;
  UPDATE public.event_ticket_types SET sold = sold + _qty WHERE id = t.id;
  INSERT INTO public.event_bookings (event_id, ticket_type_id, customer_id, customer_name, customer_email, customer_phone,
    quantity, unit_price, total_amount, status, payment_status, confirmed_at)
  VALUES (e.id, t.id, _uid, left(_name,120), left(_email,255), left(_phone,20), _qty,
    CASE WHEN v_pay THEN t.price ELSE 0 END, CASE WHEN v_pay THEN t.price * _qty ELSE 0 END,
    CASE WHEN v_pay THEN 'pending_payment' ELSE 'confirmed' END,
    CASE WHEN v_pay THEN 'pending' ELSE 'not_required' END,
    CASE WHEN v_pay THEN NULL ELSE now() END)
  RETURNING * INTO b;
  RETURN b;
END $$;
REVOKE ALL ON FUNCTION public.event_reserve(uuid, uuid, integer, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_reserve(uuid, uuid, integer, text, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.event_release_stale_holds(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_release_stale_holds(uuid) TO service_role;

-- Organizer check-in
CREATE OR REPLACE FUNCTION public.event_check_in(_booking_id uuid, _count integer)
RETURNS public.event_bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.event_bookings;
BEGIN
  SELECT * INTO b FROM public.event_bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF NOT (public.is_event_organizer(b.event_id, auth.uid()) OR public.is_global_admin(auth.uid())) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF b.status <> 'confirmed' THEN RAISE EXCEPTION 'Only confirmed bookings can be checked in'; END IF;
  IF _count < 0 OR _count > b.quantity THEN RAISE EXCEPTION 'Invalid attendee count'; END IF;
  UPDATE public.event_bookings SET checked_in_count = _count,
    checked_in_at = CASE WHEN _count > 0 THEN COALESCE(checked_in_at, now()) ELSE NULL END, updated_at = now()
  WHERE id = _booking_id RETURNING * INTO b;
  RETURN b;
END $$;
GRANT EXECUTE ON FUNCTION public.event_check_in(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_organize_events(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_event_organizer(uuid, uuid) TO authenticated;