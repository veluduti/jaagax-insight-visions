
-- 1) Approval workflow columns
ALTER TABLE public.nl_land_registrations
  ADD COLUMN IF NOT EXISTS assigned_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_admin_role TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS change_request_notes TEXT,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_nl_land_reg_assigned_admin ON public.nl_land_registrations(assigned_admin_id);

-- 2) Approver resolver: District → State → Country → Global
CREATE OR REPLACE FUNCTION public.get_land_approver(_country text, _state text, _district text)
RETURNS TABLE(user_id uuid, role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- District Admin
  RETURN QUERY
    SELECT s.user_id, s.role FROM public.admin_scopes s
    WHERE s.role = 'district_admin' AND COALESCE(s.is_active, true) = true
      AND s.country IS NOT DISTINCT FROM _country
      AND s.state IS NOT DISTINCT FROM _state
      AND s.district IS NOT DISTINCT FROM _district
    ORDER BY s.created_at ASC LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  -- State Admin
  RETURN QUERY
    SELECT s.user_id, s.role FROM public.admin_scopes s
    WHERE s.role = 'state_admin' AND COALESCE(s.is_active, true) = true
      AND s.country IS NOT DISTINCT FROM _country
      AND s.state IS NOT DISTINCT FROM _state
    ORDER BY s.created_at ASC LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  -- Country Admin
  RETURN QUERY
    SELECT s.user_id, s.role FROM public.admin_scopes s
    WHERE s.role = 'country_admin' AND COALESCE(s.is_active, true) = true
      AND s.country IS NOT DISTINCT FROM _country
    ORDER BY s.created_at ASC LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  -- Global Admin
  RETURN QUERY
    SELECT s.user_id, s.role FROM public.admin_scopes s
    WHERE s.role = 'global_admin' AND COALESCE(s.is_active, true) = true
    ORDER BY s.created_at ASC LIMIT 1;
END;
$$;

-- 3) Trigger: on transition to submitted, assign approver + notify
CREATE OR REPLACE FUNCTION public.nl_route_land_registration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_approver RECORD;
  v_title text;
BEGIN
  IF NEW.status = 'submitted'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'submitted') THEN
    NEW.submitted_at := COALESCE(NEW.submitted_at, now());

    IF NEW.assigned_admin_id IS NULL THEN
      SELECT * INTO v_approver FROM public.get_land_approver(NEW.country, NEW.state, NEW.district) LIMIT 1;
      IF v_approver.user_id IS NOT NULL THEN
        NEW.assigned_admin_id := v_approver.user_id;
        NEW.assigned_admin_role := v_approver.role;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_nl_route_land_registration ON public.nl_land_registrations;
CREATE TRIGGER trg_nl_route_land_registration
BEFORE INSERT OR UPDATE ON public.nl_land_registrations
FOR EACH ROW EXECUTE FUNCTION public.nl_route_land_registration();

CREATE OR REPLACE FUNCTION public.nl_notify_land_registration_submit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_label text;
BEGIN
  IF NEW.status = 'submitted'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'submitted') THEN
    v_label := COALESCE(NEW.village, NEW.district, NEW.state, 'a new land');

    IF NEW.assigned_admin_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, title, message, type, link)
      VALUES (NEW.assigned_admin_id,
        'Land registration awaiting your approval',
        'A land in ' || v_label || COALESCE(', ' || NEW.district, '') ||
          COALESCE(', ' || NEW.state, '') || ' is pending your review.',
        'alert', '/admin?tab=land-registrations');
    END IF;

    -- Global admins always get visibility
    INSERT INTO public.notifications(user_id, title, message, type, link)
    SELECT s.user_id,
      'New land registration submitted',
      'Land in ' || v_label || ' submitted for approval (assigned to ' ||
        COALESCE(NEW.assigned_admin_role, 'no approver') || ').',
      'info', '/admin?tab=land-registrations'
    FROM public.admin_scopes s
    WHERE s.role = 'global_admin' AND COALESCE(s.is_active, true) = true
      AND s.user_id IS DISTINCT FROM NEW.assigned_admin_id;

    -- Confirm to owner
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (NEW.user_id,
      'Land submitted for review',
      'Your land registration has been submitted and routed to the ' ||
        COALESCE(NEW.assigned_admin_role, 'admin team') || ' for approval.',
      'success', '/natural-living/list-land');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_nl_notify_land_registration_submit ON public.nl_land_registrations;
CREATE TRIGGER trg_nl_notify_land_registration_submit
AFTER INSERT OR UPDATE ON public.nl_land_registrations
FOR EACH ROW EXECUTE FUNCTION public.nl_notify_land_registration_submit();

-- 4) Review action (approve / reject / request_changes)
CREATE OR REPLACE FUNCTION public.review_land_registration(
  _registration_id uuid,
  _decision text,
  _reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_reg public.nl_land_registrations%ROWTYPE;
  v_is_global boolean := false;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _decision NOT IN ('approved','rejected','changes_requested') THEN
    RAISE EXCEPTION 'Invalid decision: %', _decision;
  END IF;

  SELECT * INTO v_reg FROM public.nl_land_registrations WHERE id = _registration_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Land registration not found'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.admin_scopes
    WHERE user_id = v_uid AND role = 'global_admin' AND COALESCE(is_active, true) = true
  ) INTO v_is_global;

  IF NOT v_is_global AND v_reg.assigned_admin_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Only the assigned approver or a Global Admin can review this registration';
  END IF;

  IF v_reg.status NOT IN ('submitted','changes_requested') THEN
    RAISE EXCEPTION 'Registration is not in a reviewable state (status: %)', v_reg.status;
  END IF;

  IF _decision = 'approved' THEN
    UPDATE public.nl_land_registrations
      SET status = 'approved',
          is_published = true,
          published_at = now(),
          reviewed_by = v_uid,
          reviewed_at = now(),
          rejection_reason = NULL,
          change_request_notes = NULL
      WHERE id = _registration_id;

    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (v_reg.user_id,
      'Land registration approved ✅',
      'Your land is now live on JAAGA.',
      'success', '/natural-living/list-land');

  ELSIF _decision = 'rejected' THEN
    UPDATE public.nl_land_registrations
      SET status = 'rejected',
          is_published = false,
          reviewed_by = v_uid,
          reviewed_at = now(),
          rejection_reason = _reason
      WHERE id = _registration_id;

    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (v_reg.user_id,
      'Land registration rejected',
      COALESCE('Reason: ' || _reason, 'Your land registration was rejected.'),
      'alert', '/natural-living/list-land');

  ELSE -- changes_requested
    UPDATE public.nl_land_registrations
      SET status = 'changes_requested',
          reviewed_by = v_uid,
          reviewed_at = now(),
          change_request_notes = _reason
      WHERE id = _registration_id;

    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (v_reg.user_id,
      'Changes requested on your land registration',
      COALESCE(_reason, 'The reviewer requested changes before approval.'),
      'info', '/natural-living/list-land');
  END IF;
END; $$;

GRANT EXECUTE ON FUNCTION public.review_land_registration(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_land_approver(text, text, text) TO authenticated;

-- 5) RLS: hierarchy admins can view all land registrations
DROP POLICY IF EXISTS "Hierarchy admins view land registrations" ON public.nl_land_registrations;
CREATE POLICY "Hierarchy admins view land registrations"
ON public.nl_land_registrations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_scopes s
    WHERE s.user_id = auth.uid()
      AND COALESCE(s.is_active, true) = true
      AND s.role IN ('global_admin','country_admin','state_admin','district_admin')
  )
);
