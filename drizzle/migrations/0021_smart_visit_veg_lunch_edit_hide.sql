ALTER TABLE public.smart_visit_plans
  ADD COLUMN IF NOT EXISTS price_lunch_veg numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_lunch_nonveg numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agent_hidden boolean NOT NULL DEFAULT false;
UPDATE public.smart_visit_plans SET price_lunch_veg = price_lunch, price_lunch_nonveg = price_lunch WHERE lunch_available AND price_lunch_veg = 0;
COMMENT ON COLUMN public.smart_visit_plans.price_lunch IS 'DEPRECATED: replaced by price_lunch_veg / price_lunch_nonveg';
ALTER TABLE public.smart_visit_bookings ADD COLUMN IF NOT EXISTS lunch_type text;
UPDATE public.smart_visit_bookings SET lunch_type = 'veg' WHERE lunch_opted AND lunch_type IS NULL;

CREATE OR REPLACE FUNCTION public.smart_visit_booking_extras()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.smart_visit_plans%ROWTYPE; v_lp numeric;
BEGIN
  IF TG_OP = 'UPDATE' AND NOT public.is_admin(auth.uid()) THEN
    NEW.is_vip := OLD.is_vip; NEW.lunch_opted := OLD.lunch_opted; NEW.lunch_type := OLD.lunch_type;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.total_amount IS NOT DISTINCT FROM OLD.total_amount
     AND NEW.is_vip = OLD.is_vip AND NEW.lunch_opted = OLD.lunch_opted AND NEW.lunch_type IS NOT DISTINCT FROM OLD.lunch_type THEN
    RETURN NEW;
  END IF;
  SELECT * INTO p FROM public.smart_visit_plans WHERE id = NEW.plan_id;
  IF NEW.lunch_opted AND NEW.lunch_type IS NULL THEN NEW.lunch_type := 'veg'; END IF;
  IF NOT NEW.lunch_opted THEN NEW.lunch_type := NULL; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_vip AND NOT p.vip_available THEN RAISE EXCEPTION 'VIP car is not offered for this visit'; END IF;
    IF NEW.is_vip AND NEW.pickup_type <> 'home' THEN RAISE EXCEPTION 'VIP car needs a home pickup address'; END IF;
    IF NEW.is_vip AND NEW.seats > p.vip_max_people THEN RAISE EXCEPTION 'VIP car fits up to % people', p.vip_max_people; END IF;
    IF NEW.lunch_opted AND NOT p.lunch_available THEN RAISE EXCEPTION 'Lunch is not offered for this visit'; END IF;
    IF NEW.lunch_type IS NOT NULL AND NEW.lunch_type NOT IN ('veg','nonveg') THEN RAISE EXCEPTION 'Choose veg or non-veg lunch'; END IF;
    IF NEW.lunch_type = 'veg' AND COALESCE(p.price_lunch_veg,0) <= 0 THEN RAISE EXCEPTION 'Veg lunch is not offered for this visit'; END IF;
    IF NEW.lunch_type = 'nonveg' AND COALESCE(p.price_lunch_nonveg,0) <= 0 THEN RAISE EXCEPTION 'Non-veg lunch is not offered for this visit'; END IF;
  END IF;
  v_lp := CASE NEW.lunch_type WHEN 'veg' THEN p.price_lunch_veg WHEN 'nonveg' THEN p.price_lunch_nonveg ELSE 0 END;
  IF NEW.is_vip THEN NEW.price_per_person := p.price_vip; END IF;
  NEW.lunch_amount := CASE WHEN NEW.lunch_opted THEN COALESCE(v_lp,0) * NEW.seats ELSE 0 END;
  NEW.total_amount := (CASE WHEN NEW.is_vip THEN p.price_vip ELSE NEW.price_per_person * NEW.seats END) + NEW.lunch_amount;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.smart_visit_plan_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_global boolean := public.is_global_admin(auth.uid());
  v_state boolean := false;
  v_msg text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.price_meeting_point < 0 OR NEW.price_home_pickup < 0 OR NEW.max_seats < 1 THEN
      RAISE EXCEPTION 'Invalid price or seats';
    END IF;
    IF NEW.state_id IS NULL AND NEW.state_name IS NULL THEN
      SELECT a.state_id, COALESCE(NULLIF(trim(a.state), ''), ls.name) INTO NEW.state_id, NEW.state_name
      FROM public.agents a LEFT JOIN public.loc_states ls ON ls.id = a.state_id WHERE a.id = NEW.agent_id;
    END IF;
    IF NOT v_global OR NEW.status IS NULL OR NEW.status NOT IN ('approved') THEN
      NEW.reviewed_by := NULL; NEW.reviewed_at := NULL; NEW.rejection_reason := NULL;
      NEW.state_reviewed_by := NULL; NEW.state_reviewed_at := NULL; NEW.rejected_by_level := NULL;
      NEW.status := public.smart_visit_route_for_review(NEW, false);
    END IF;
    RETURN NEW;
  END IF;

  NEW.updated_at := now();
  v_state := public.is_smart_visit_state_admin(auth.uid(), OLD.state_id, OLD.state_name);
  NEW.state_id := OLD.state_id; NEW.state_name := OLD.state_name;

  IF v_global THEN
    IF NEW.status IN ('approved','rejected') AND NEW.status IS DISTINCT FROM OLD.status THEN
      IF OLD.status NOT IN ('pending_review','pending_state_review') THEN
        RAISE EXCEPTION 'This plan is not waiting for approval';
      END IF;
      NEW.reviewed_by := auth.uid(); NEW.reviewed_at := now();
      NEW.rejected_by_level := CASE WHEN NEW.status = 'rejected' THEN 'global' ELSE NULL END;
      v_msg := CASE WHEN NEW.status = 'approved'
          THEN '"' || NEW.title || '" got final approval and is live for customers. Prices: ₹' || NEW.price_meeting_point || ' (meeting point) / ₹' || NEW.price_home_pickup || ' (home pickup) per person.'
          ELSE '"' || NEW.title || '" was rejected by the JAAGA X admin. Reason: ' || COALESCE(NEW.rejection_reason, 'Not specified') END;
      INSERT INTO public.notifications(user_id, type, title, message, link, metadata) VALUES (
        NEW.agent_user_id, 'smart_visit_review',
        CASE WHEN NEW.status = 'approved' THEN 'Smart Visit plan is live' ELSE 'Smart Visit plan rejected' END,
        v_msg, '/dashboard/agent/smart-visits', jsonb_build_object('plan_id', NEW.id));
      IF OLD.state_reviewed_by IS NOT NULL THEN
        INSERT INTO public.notifications(user_id, type, title, message, link, metadata) VALUES (
          OLD.state_reviewed_by, 'smart_visit_review',
          CASE WHEN NEW.status = 'approved' THEN 'Smart Visit you approved is now live' ELSE 'Smart Visit you approved was rejected' END,
          v_msg, '/dashboard/admin/state?tab=smart-visits', jsonb_build_object('plan_id', NEW.id));
      END IF;
    END IF;
  ELSIF v_state THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF OLD.status <> 'pending_state_review' OR NEW.status NOT IN ('pending_review','rejected') THEN
        RAISE EXCEPTION 'State admins can only approve or reject plans waiting for state approval';
      END IF;
    ELSIF OLD.status <> 'pending_state_review' THEN
      RAISE EXCEPTION 'This plan is no longer waiting for state approval';
    END IF;
    NEW.reviewed_by := OLD.reviewed_by; NEW.reviewed_at := OLD.reviewed_at;
    IF NEW.status = 'pending_review' THEN
      NEW.state_reviewed_by := auth.uid(); NEW.state_reviewed_at := now(); NEW.rejection_reason := NULL; NEW.rejected_by_level := NULL;
      INSERT INTO public.notifications(user_id, type, title, message, link, metadata)
      SELECT x, 'smart_visit_review', 'Smart Visit approved by state admin',
        '"' || NEW.title || '" (' || COALESCE(NEW.state_name, '') || ', ' || NEW.visit_date || ') was approved by the state admin. Please give final approval.',
        '/admin?tab=smart-visits', jsonb_build_object('plan_id', NEW.id)
      FROM public.smart_visit_global_admin_ids() x;
      INSERT INTO public.notifications(user_id, type, title, message, link, metadata) VALUES (
        NEW.agent_user_id, 'smart_visit_review', 'State admin approved your Smart Visit',
        '"' || NEW.title || '" was approved by the ' || COALESCE(NEW.state_name, 'state') || ' admin and is now waiting for final JAAGA X approval.',
        '/dashboard/agent/smart-visits', jsonb_build_object('plan_id', NEW.id));
    ELSIF NEW.status = 'rejected' THEN
      IF COALESCE(trim(NEW.rejection_reason), '') = '' THEN RAISE EXCEPTION 'Please give a reason for rejecting'; END IF;
      NEW.state_reviewed_by := auth.uid(); NEW.state_reviewed_at := now(); NEW.rejected_by_level := 'state';
      INSERT INTO public.notifications(user_id, type, title, message, link, metadata) VALUES (
        NEW.agent_user_id, 'smart_visit_review', 'Smart Visit plan rejected',
        '"' || NEW.title || '" was rejected by the ' || COALESCE(NEW.state_name, 'state') || ' admin. Reason: ' || NEW.rejection_reason,
        '/dashboard/agent/smart-visits', jsonb_build_object('plan_id', NEW.id));
    END IF;
  ELSE
    NEW.reviewed_by := OLD.reviewed_by; NEW.reviewed_at := OLD.reviewed_at;
    NEW.rejection_reason := OLD.rejection_reason; NEW.admin_notes := OLD.admin_notes;
    NEW.state_reviewed_by := OLD.state_reviewed_by; NEW.state_reviewed_at := OLD.state_reviewed_at;
    NEW.state_notes := OLD.state_notes; NEW.rejected_by_level := OLD.rejected_by_level;
    IF NEW.status IN ('approved','rejected','pending_state_review') AND NEW.status <> OLD.status THEN
      RAISE EXCEPTION 'Only admins can approve or reject plans';
    END IF;
    IF NEW.agent_hidden AND NOT OLD.agent_hidden AND OLD.status NOT IN ('completed','cancelled') THEN
      RAISE EXCEPTION 'Only completed or cancelled visits can be deleted';
    END IF;
    IF OLD.status = 'approved' AND NEW.status = 'pending_review' THEN
      IF EXISTS (SELECT 1 FROM public.smart_visit_bookings b WHERE b.plan_id = OLD.id AND b.status NOT IN ('cancelled')) THEN
        RAISE EXCEPTION 'Customers have already booked this visit, so it can no longer be edited';
      END IF;
    ELSIF OLD.status IN ('approved','completed') AND (
        NEW.price_meeting_point <> OLD.price_meeting_point OR NEW.price_home_pickup <> OLD.price_home_pickup
        OR NEW.property_ids <> OLD.property_ids OR NEW.visit_date <> OLD.visit_date) THEN
      RAISE EXCEPTION 'Approved plans cannot change prices, date or properties';
    END IF;
    IF NEW.status = 'pending_review' AND OLD.status IN ('rejected','pending_review','pending_state_review','approved') THEN
      NEW.state_reviewed_by := NULL; NEW.state_reviewed_at := NULL; NEW.rejection_reason := NULL; NEW.rejected_by_level := NULL;
      IF OLD.status IN ('rejected','approved') THEN
        NEW.reviewed_by := NULL; NEW.reviewed_at := NULL;
        NEW.status := public.smart_visit_route_for_review(NEW, true);
      ELSE
        SELECT CASE WHEN EXISTS (SELECT 1 FROM public.smart_visit_state_admin_ids(NEW.state_id, NEW.state_name))
          THEN 'pending_state_review' ELSE 'pending_review' END INTO NEW.status;
      END IF;
    END IF;
  END IF;

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
END $function$;