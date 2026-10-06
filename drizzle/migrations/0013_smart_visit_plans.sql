CREATE TABLE public.smart_visit_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  agent_user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  city text,
  visit_date date NOT NULL,
  start_time text NOT NULL,
  meeting_point text,
  price_meeting_point numeric NOT NULL DEFAULT 600,
  price_home_pickup numeric NOT NULL DEFAULT 800,
  max_seats integer NOT NULL DEFAULT 6,
  property_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending_review',
  rejection_reason text,
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  trip_details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.smart_visit_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smart_visit_plans TO authenticated;
GRANT ALL ON public.smart_visit_plans TO service_role;
ALTER TABLE public.smart_visit_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "svp read" ON public.smart_visit_plans FOR SELECT USING (status IN ('approved','completed') OR agent_user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "svp agent insert" ON public.smart_visit_plans FOR INSERT TO authenticated WITH CHECK (agent_user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.user_id = auth.uid()));
CREATE POLICY "svp update" ON public.smart_visit_plans FOR UPDATE TO authenticated USING (agent_user_id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (agent_user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "svp delete" ON public.smart_visit_plans FOR DELETE TO authenticated USING ((agent_user_id = auth.uid() AND status IN ('pending_review','rejected')) OR public.is_admin(auth.uid()));

CREATE TABLE public.smart_visit_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.smart_visit_plans(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  customer_name text,
  contact_phone text,
  seats integer NOT NULL DEFAULT 1,
  pickup_type text NOT NULL DEFAULT 'meeting_point',
  pickup_address text,
  pickup_lat double precision,
  pickup_lng double precision,
  drop_address text,
  price_per_person numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'booked',
  pickup_time text,
  agent_message text,
  rating integer,
  review text,
  rated_at timestamptz,
  interested_to_buy boolean NOT NULL DEFAULT false,
  interest_note text,
  interest_property_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.smart_visit_bookings TO authenticated;
GRANT ALL ON public.smart_visit_bookings TO service_role;
ALTER TABLE public.smart_visit_bookings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_smart_plan_agent(_plan uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.smart_visit_plans WHERE id = _plan AND agent_user_id = _uid)
$$;

CREATE POLICY "svb read" ON public.smart_visit_bookings FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.is_smart_plan_agent(plan_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "svb insert" ON public.smart_visit_bookings FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
CREATE POLICY "svb update" ON public.smart_visit_bookings FOR UPDATE TO authenticated USING (customer_id = auth.uid() OR public.is_smart_plan_agent(plan_id, auth.uid()) OR public.is_admin(auth.uid())) WITH CHECK (customer_id = auth.uid() OR public.is_smart_plan_agent(plan_id, auth.uid()) OR public.is_admin(auth.uid()));

-- Public seat counts
CREATE OR REPLACE FUNCTION public.smart_visit_seats_taken(_plan uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(seats),0)::int FROM public.smart_visit_bookings WHERE plan_id = _plan AND status <> 'cancelled'
$$;
GRANT EXECUTE ON FUNCTION public.smart_visit_seats_taken(uuid) TO anon, authenticated;

-- Agent public rating
CREATE OR REPLACE FUNCTION public.smart_visit_agent_rating(_agent uuid)
RETURNS TABLE(avg_rating numeric, rating_count integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ROUND(AVG(b.rating)::numeric,1), COUNT(b.rating)::int
  FROM public.smart_visit_bookings b JOIN public.smart_visit_plans p ON p.id = b.plan_id
  WHERE p.agent_id = _agent AND b.rating IS NOT NULL
$$;
GRANT EXECUTE ON FUNCTION public.smart_visit_agent_rating(uuid) TO anon, authenticated;

-- Plan guard + notifications
CREATE OR REPLACE FUNCTION public.smart_visit_plan_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin boolean := public.is_admin(auth.uid());
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT v_admin THEN
      NEW.status := 'pending_review'; NEW.reviewed_by := NULL; NEW.reviewed_at := NULL; NEW.rejection_reason := NULL;
    END IF;
    IF NEW.price_meeting_point < 0 OR NEW.price_home_pickup < 0 OR NEW.max_seats < 1 THEN
      RAISE EXCEPTION 'Invalid price or seats';
    END IF;
    INSERT INTO public.notifications(user_id, type, title, message, link, metadata)
    SELECT ur.user_id, 'smart_visit_review', 'New Smart Visit plan to review',
      'An agent submitted "' || NEW.title || '" on ' || NEW.visit_date || '. Please approve or reject.',
      '/admin?tab=smart-visits', jsonb_build_object('plan_id', NEW.id)
    FROM public.user_roles ur WHERE ur.role = 'admin';
    RETURN NEW;
  END IF;

  NEW.updated_at := now();
  IF NOT v_admin THEN
    -- agents cannot self-approve or alter review fields
    NEW.reviewed_by := OLD.reviewed_by; NEW.reviewed_at := OLD.reviewed_at;
    NEW.rejection_reason := OLD.rejection_reason; NEW.admin_notes := OLD.admin_notes;
    IF NEW.status IN ('approved','rejected') AND NEW.status <> OLD.status THEN
      RAISE EXCEPTION 'Only the global admin can approve or reject plans';
    END IF;
    IF OLD.status IN ('approved','completed') AND (
        NEW.price_meeting_point <> OLD.price_meeting_point OR NEW.price_home_pickup <> OLD.price_home_pickup
        OR NEW.property_ids <> OLD.property_ids OR NEW.visit_date <> OLD.visit_date) THEN
      RAISE EXCEPTION 'Approved plans cannot change prices, date or properties';
    END IF;
    IF OLD.status = 'rejected' AND NEW.status = 'pending_review' THEN
      INSERT INTO public.notifications(user_id, type, title, message, link, metadata)
      SELECT ur.user_id, 'smart_visit_review', 'Smart Visit plan resubmitted',
        '"' || NEW.title || '" was updated and resubmitted.', '/admin?tab=smart-visits', jsonb_build_object('plan_id', NEW.id)
      FROM public.user_roles ur WHERE ur.role = 'admin';
    END IF;
  ELSE
    IF NEW.status IN ('approved','rejected') AND NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.reviewed_by := auth.uid(); NEW.reviewed_at := now();
      INSERT INTO public.notifications(user_id, type, title, message, link, metadata) VALUES (
        NEW.agent_user_id, 'smart_visit_review',
        CASE WHEN NEW.status = 'approved' THEN 'Smart Visit plan approved' ELSE 'Smart Visit plan rejected' END,
        CASE WHEN NEW.status = 'approved'
          THEN '"' || NEW.title || '" is live for customers. Prices: ₹' || NEW.price_meeting_point || ' (meeting point) / ₹' || NEW.price_home_pickup || ' (home pickup) per person.'
          ELSE '"' || NEW.title || '" was rejected. Reason: ' || COALESCE(NEW.rejection_reason, 'Not specified') END,
        '/dashboard/agent/smart-visits', jsonb_build_object('plan_id', NEW.id));
    END IF;
  END IF;

  -- keep unpaid/active booking prices in sync with plan prices
  IF NEW.price_meeting_point <> OLD.price_meeting_point OR NEW.price_home_pickup <> OLD.price_home_pickup THEN
    UPDATE public.smart_visit_bookings b SET
      price_per_person = CASE WHEN b.pickup_type = 'home' THEN NEW.price_home_pickup ELSE NEW.price_meeting_point END,
      total_amount = b.seats * CASE WHEN b.pickup_type = 'home' THEN NEW.price_home_pickup ELSE NEW.price_meeting_point END
    WHERE b.plan_id = NEW.id AND b.status IN ('booked','confirmed');
  END IF;

  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    INSERT INTO public.notifications(user_id, type, title, message, link, metadata)
    SELECT DISTINCT b.customer_id, 'smart_visit', 'Smart Visit cancelled', '"' || NEW.title || '" was cancelled by the agent.', '/smart-visits', jsonb_build_object('plan_id', NEW.id)
    FROM public.smart_visit_bookings b WHERE b.plan_id = NEW.id AND b.status <> 'cancelled';
    UPDATE public.smart_visit_bookings SET status = 'cancelled' WHERE plan_id = NEW.id AND status IN ('booked','confirmed');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER smart_visit_plan_guard_trg BEFORE INSERT OR UPDATE ON public.smart_visit_plans FOR EACH ROW EXECUTE FUNCTION public.smart_visit_plan_guard();

-- Booking guard + notifications
CREATE OR REPLACE FUNCTION public.smart_visit_booking_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.smart_visit_plans%ROWTYPE; v_taken int; v_uid uuid := auth.uid(); v_is_agent boolean; v_admin boolean;
BEGIN
  SELECT * INTO p FROM public.smart_visit_plans WHERE id = NEW.plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found'; END IF;
  v_is_agent := p.agent_user_id = v_uid;
  v_admin := public.is_admin(v_uid);

  IF TG_OP = 'INSERT' THEN
    IF p.status <> 'approved' THEN RAISE EXCEPTION 'This visit is not open for booking'; END IF;
    IF p.visit_date < current_date THEN RAISE EXCEPTION 'This visit date has passed'; END IF;
    IF p.agent_user_id = NEW.customer_id THEN RAISE EXCEPTION 'You cannot book your own visit'; END IF;
    IF NEW.seats < 1 OR NEW.seats > 10 THEN RAISE EXCEPTION 'Seats must be between 1 and 10'; END IF;
    IF NEW.pickup_type NOT IN ('meeting_point','home') THEN RAISE EXCEPTION 'Invalid pickup type'; END IF;
    IF NEW.pickup_type = 'home' AND COALESCE(trim(NEW.pickup_address),'') = '' THEN RAISE EXCEPTION 'Pickup address is required for home pickup'; END IF;
    IF EXISTS (SELECT 1 FROM public.smart_visit_bookings WHERE plan_id = NEW.plan_id AND customer_id = NEW.customer_id AND status <> 'cancelled') THEN
      RAISE EXCEPTION 'You already booked this visit';
    END IF;
    PERFORM 1 FROM public.smart_visit_plans WHERE id = NEW.plan_id FOR UPDATE;
    SELECT COALESCE(SUM(seats),0) INTO v_taken FROM public.smart_visit_bookings WHERE plan_id = NEW.plan_id AND status <> 'cancelled';
    IF v_taken + NEW.seats > p.max_seats THEN RAISE EXCEPTION 'Only % seat(s) left', GREATEST(p.max_seats - v_taken, 0); END IF;
    NEW.status := 'booked'; NEW.rating := NULL; NEW.review := NULL; NEW.rated_at := NULL; NEW.agent_message := NULL; NEW.pickup_time := NULL;
    NEW.price_per_person := CASE WHEN NEW.pickup_type = 'home' THEN p.price_home_pickup ELSE p.price_meeting_point END;
    NEW.total_amount := NEW.price_per_person * NEW.seats;
    INSERT INTO public.notifications(user_id, type, title, message, link, metadata) VALUES (
      p.agent_user_id, 'smart_visit_booking', 'New Smart Visit booking',
      COALESCE(NEW.customer_name,'A customer') || ' booked ' || NEW.seats || ' seat(s) for "' || p.title || '" — ' ||
      CASE WHEN NEW.pickup_type = 'home' THEN 'home pickup at ' || NEW.pickup_address ELSE 'meeting point' END ||
      '. Please send the pickup time and trip details.', '/dashboard/agent/smart-visits', jsonb_build_object('plan_id', p.id, 'booking_id', NEW.id));
    RETURN NEW;
  END IF;

  NEW.updated_at := now();
  NEW.plan_id := OLD.plan_id; NEW.customer_id := OLD.customer_id;
  IF NOT v_admin THEN
    -- price/seat/pickup are fixed after booking
    NEW.seats := OLD.seats; NEW.pickup_type := OLD.pickup_type; NEW.pickup_address := OLD.pickup_address;
    NEW.price_per_person := OLD.price_per_person; NEW.total_amount := OLD.total_amount;
    IF TG_OP = 'UPDATE' AND (NEW.price_per_person IS DISTINCT FROM OLD.price_per_person) THEN NULL; END IF;
  END IF;

  IF v_is_agent AND NOT v_admin AND OLD.customer_id <> v_uid THEN
    NEW.rating := OLD.rating; NEW.review := OLD.review; NEW.rated_at := OLD.rated_at;
    NEW.interested_to_buy := OLD.interested_to_buy; NEW.interest_note := OLD.interest_note; NEW.interest_property_ids := OLD.interest_property_ids;
    IF NEW.status NOT IN ('booked','confirmed','picked_up','completed','no_show','cancelled') THEN RAISE EXCEPTION 'Invalid status'; END IF;
    IF NEW.agent_message IS DISTINCT FROM OLD.agent_message OR NEW.pickup_time IS DISTINCT FROM OLD.pickup_time OR NEW.status <> OLD.status THEN
      INSERT INTO public.notifications(user_id, type, title, message, link, metadata) VALUES (
        NEW.customer_id, 'smart_visit',
        CASE NEW.status WHEN 'confirmed' THEN 'Your Smart Visit is confirmed'
          WHEN 'picked_up' THEN 'Agent picked you up' WHEN 'completed' THEN 'Smart Visit completed — rate your agent'
          WHEN 'cancelled' THEN 'Smart Visit booking cancelled' ELSE 'Smart Visit update' END,
        '"' || p.title || '" on ' || p.visit_date ||
          COALESCE(' · Pickup: ' || NEW.pickup_time, '') || COALESCE(' · ' || NEW.agent_message, ''),
        '/smart-visits?tab=mine', jsonb_build_object('plan_id', p.id, 'booking_id', NEW.id));
    END IF;
  ELSIF OLD.customer_id = v_uid AND NOT v_admin THEN
    NEW.agent_message := OLD.agent_message; NEW.pickup_time := OLD.pickup_time;
    IF NEW.status <> OLD.status AND NOT (NEW.status = 'cancelled' AND OLD.status IN ('booked','confirmed')) THEN
      RAISE EXCEPTION 'You can only cancel before pickup';
    END IF;
    IF NEW.rating IS DISTINCT FROM OLD.rating THEN
      IF OLD.status <> 'completed' THEN RAISE EXCEPTION 'You can rate after the visit is completed'; END IF;
      IF OLD.rating IS NOT NULL THEN RAISE EXCEPTION 'You have already rated this visit'; END IF;
      IF NEW.rating < 1 OR NEW.rating > 5 THEN RAISE EXCEPTION 'Rating must be 1-5'; END IF;
      NEW.rated_at := now();
      INSERT INTO public.notifications(user_id, type, title, message, link, metadata) VALUES (
        p.agent_user_id, 'smart_visit', 'New rating received',
        COALESCE(NEW.customer_name,'A customer') || ' rated you ' || NEW.rating || '/5 for "' || p.title || '".' || COALESCE(' "' || NEW.review || '"', ''),
        '/dashboard/agent/smart-visits', jsonb_build_object('plan_id', p.id, 'booking_id', NEW.id));
    ELSE
      NEW.review := OLD.review; NEW.rated_at := OLD.rated_at;
    END IF;
    IF NEW.interested_to_buy AND NOT OLD.interested_to_buy THEN
      INSERT INTO public.notifications(user_id, type, title, message, link, metadata) VALUES (
        p.agent_user_id, 'smart_visit_lead', 'Customer interested to buy',
        COALESCE(NEW.customer_name,'A customer') || ' wants to proceed after "' || p.title || '"' ||
          COALESCE(' — phone ' || NEW.contact_phone, '') || COALESCE('. Note: ' || NEW.interest_note, ''),
        '/dashboard/agent/smart-visits', jsonb_build_object('plan_id', p.id, 'booking_id', NEW.id));
    END IF;
    IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
      INSERT INTO public.notifications(user_id, type, title, message, link, metadata) VALUES (
        p.agent_user_id, 'smart_visit_booking', 'Smart Visit booking cancelled',
        COALESCE(NEW.customer_name,'A customer') || ' cancelled their booking for "' || p.title || '".',
        '/dashboard/agent/smart-visits', jsonb_build_object('plan_id', p.id, 'booking_id', NEW.id));
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER smart_visit_booking_guard_trg BEFORE INSERT OR UPDATE ON public.smart_visit_bookings FOR EACH ROW EXECUTE FUNCTION public.smart_visit_booking_guard();

CREATE INDEX idx_svp_status_date ON public.smart_visit_plans(status, visit_date);
CREATE INDEX idx_svp_agent ON public.smart_visit_plans(agent_user_id);
CREATE INDEX idx_svb_plan ON public.smart_visit_bookings(plan_id);
CREATE INDEX idx_svb_customer ON public.smart_visit_bookings(customer_id);