ALTER TABLE public.smart_visit_plans
  ADD COLUMN IF NOT EXISTS state_id uuid,
  ADD COLUMN IF NOT EXISTS state_name text,
  ADD COLUMN IF NOT EXISTS state_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS state_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS state_notes text,
  ADD COLUMN IF NOT EXISTS rejected_by_level text;

CREATE OR REPLACE FUNCTION public.is_global_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(_uid) OR EXISTS (SELECT 1 FROM public.admin_scopes WHERE user_id = _uid AND is_active AND role = 'global_admin');
$$;

CREATE OR REPLACE FUNCTION public.smart_visit_state_admin_ids(_state_id uuid, _state text)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT s.user_id FROM public.admin_scopes s
  WHERE s.is_active AND s.role = 'state_admin' AND s.user_id IS NOT NULL
    AND ((_state_id IS NOT NULL AND s.state_id = _state_id)
      OR (_state IS NOT NULL AND lower(trim(s.state)) = lower(trim(_state))));
$$;

CREATE OR REPLACE FUNCTION public.is_smart_visit_state_admin(_uid uuid, _state_id uuid, _state text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.smart_visit_state_admin_ids(_state_id, _state) x WHERE x = _uid);
$$;

CREATE OR REPLACE FUNCTION public.smart_visit_global_admin_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM public.user_roles WHERE role::text = 'admin'
  UNION SELECT user_id FROM public.admin_scopes WHERE is_active AND role = 'global_admin' AND user_id IS NOT NULL;
$$;

-- Routes a plan to its state admin (or global if none) and notifies reviewers + agent.
CREATE OR REPLACE FUNCTION public.smart_visit_route_for_review(_p public.smart_visit_plans, _resubmit boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _has_state boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.smart_visit_state_admin_ids(_p.state_id, _p.state_name)) INTO _has_state;
  IF _has_state THEN
    INSERT INTO public.notifications(user_id, type, title, message, link, metadata)
    SELECT x, 'smart_visit_review',
      CASE WHEN _resubmit THEN 'Smart Visit plan resubmitted' ELSE 'New Smart Visit plan to review' END,
      'An agent in ' || COALESCE(_p.state_name, 'your state') || ' submitted "' || _p.title || '" on ' || _p.visit_date || '. Please approve or reject.',
      '/dashboard/admin/state?tab=smart-visits', jsonb_build_object('plan_id', _p.id)
    FROM public.smart_visit_state_admin_ids(_p.state_id, _p.state_name) x;
    INSERT INTO public.notifications(user_id, type, title, message, link, metadata) VALUES
      (_p.agent_user_id, 'smart_visit_review', 'Smart Visit sent for state approval',
       '"' || _p.title || '" is waiting for ' || COALESCE(_p.state_name, 'state') || ' admin approval.',
       '/dashboard/agent/smart-visits', jsonb_build_object('plan_id', _p.id));
    RETURN 'pending_state_review';
  END IF;
  INSERT INTO public.notifications(user_id, type, title, message, link, metadata)
  SELECT x, 'smart_visit_review',
    CASE WHEN _resubmit THEN 'Smart Visit plan resubmitted' ELSE 'New Smart Visit plan to review' END,
    'An agent submitted "' || _p.title || '" on ' || _p.visit_date || '. No state admin for ' || COALESCE(_p.state_name, 'this state') || ', so it came straight to you.',
    '/admin?tab=smart-visits', jsonb_build_object('plan_id', _p.id)
  FROM public.smart_visit_global_admin_ids() x;
  INSERT INTO public.notifications(user_id, type, title, message, link, metadata) VALUES
    (_p.agent_user_id, 'smart_visit_review', 'Smart Visit sent for final approval',
     '"' || _p.title || '" is waiting for JAAGA X admin approval.',
     '/dashboard/agent/smart-visits', jsonb_build_object('plan_id', _p.id));
  RETURN 'pending_review';
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
    -- agent: cannot touch review fields or self-approve
    NEW.reviewed_by := OLD.reviewed_by; NEW.reviewed_at := OLD.reviewed_at;
    NEW.rejection_reason := OLD.rejection_reason; NEW.admin_notes := OLD.admin_notes;
    NEW.state_reviewed_by := OLD.state_reviewed_by; NEW.state_reviewed_at := OLD.state_reviewed_at;
    NEW.state_notes := OLD.state_notes; NEW.rejected_by_level := OLD.rejected_by_level;
    IF NEW.status IN ('approved','rejected','pending_state_review') AND NEW.status <> OLD.status THEN
      RAISE EXCEPTION 'Only admins can approve or reject plans';
    END IF;
    IF OLD.status IN ('approved','completed') AND (
        NEW.price_meeting_point <> OLD.price_meeting_point OR NEW.price_home_pickup <> OLD.price_home_pickup
        OR NEW.property_ids <> OLD.property_ids OR NEW.visit_date <> OLD.visit_date) THEN
      RAISE EXCEPTION 'Approved plans cannot change prices, date or properties';
    END IF;
    IF NEW.status = 'pending_review' AND OLD.status IN ('rejected','pending_review','pending_state_review') THEN
      -- every edit/resubmission restarts the state -> global approval chain
      NEW.state_reviewed_by := NULL; NEW.state_reviewed_at := NULL; NEW.rejection_reason := NULL; NEW.rejected_by_level := NULL;
      IF OLD.status = 'rejected' THEN
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

CREATE POLICY "svp state admin read" ON public.smart_visit_plans FOR SELECT TO authenticated
  USING (public.is_global_admin(auth.uid()) OR public.is_smart_visit_state_admin(auth.uid(), state_id, state_name));
CREATE POLICY "svp state admin update" ON public.smart_visit_plans FOR UPDATE TO authenticated
  USING (public.is_global_admin(auth.uid()) OR (status = 'pending_state_review' AND public.is_smart_visit_state_admin(auth.uid(), state_id, state_name)))
  WITH CHECK (public.is_global_admin(auth.uid()) OR public.is_smart_visit_state_admin(auth.uid(), state_id, state_name));

UPDATE public.smart_visit_plans p SET state_id = a.state_id, state_name = COALESCE(NULLIF(trim(a.state), ''), ls.name)
FROM public.agents a LEFT JOIN public.loc_states ls ON ls.id = a.state_id
WHERE a.id = p.agent_id AND p.state_id IS NULL AND p.state_name IS NULL;