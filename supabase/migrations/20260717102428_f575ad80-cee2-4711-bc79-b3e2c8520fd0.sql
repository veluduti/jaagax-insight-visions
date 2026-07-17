
-- =========================================================================
-- CENTRALISED APPROVAL HIERARCHY ENGINE (reusable across all modules)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.resolve_approver(
  _country text, _state text, _district text
) RETURNS TABLE(user_id uuid, role text, level int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _district IS NOT NULL AND _district <> '' THEN
    RETURN QUERY
      SELECT s.user_id, s.role, 1
      FROM public.admin_scopes s
      WHERE s.role = 'district_admin' AND COALESCE(s.is_active, true) = true
        AND lower(coalesce(s.country,'')) = lower(coalesce(_country,''))
        AND lower(coalesce(s.state,''))   = lower(coalesce(_state,''))
        AND lower(coalesce(s.district,''))= lower(coalesce(_district,''))
      ORDER BY s.created_at ASC LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  IF _state IS NOT NULL AND _state <> '' THEN
    RETURN QUERY
      SELECT s.user_id, s.role, 2
      FROM public.admin_scopes s
      WHERE s.role = 'state_admin' AND COALESCE(s.is_active, true) = true
        AND lower(coalesce(s.country,'')) = lower(coalesce(_country,''))
        AND lower(coalesce(s.state,''))   = lower(coalesce(_state,''))
      ORDER BY s.created_at ASC LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  IF _country IS NOT NULL AND _country <> '' THEN
    RETURN QUERY
      SELECT s.user_id, s.role, 3
      FROM public.admin_scopes s
      WHERE s.role = 'country_admin' AND COALESCE(s.is_active, true) = true
        AND lower(coalesce(s.country,'')) = lower(coalesce(_country,''))
      ORDER BY s.created_at ASC LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  RETURN QUERY
    SELECT s.user_id, s.role, 4
    FROM public.admin_scopes s
    WHERE s.role = 'global_admin' AND COALESCE(s.is_active, true) = true
    ORDER BY s.created_at ASC LIMIT 1;
END; $$;
GRANT EXECUTE ON FUNCTION public.resolve_approver(text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_review_scope(
  _uid uuid, _country text, _state text, _district text, _assigned_admin_id uuid
) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_approver_id uuid;
BEGIN
  IF _assigned_admin_id IS NOT NULL THEN RETURN _uid = _assigned_admin_id; END IF;
  SELECT r.user_id INTO v_approver_id FROM public.resolve_approver(_country, _state, _district) r LIMIT 1;
  RETURN _uid IS NOT NULL AND _uid = v_approver_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.can_review_scope(uuid, text, text, text, uuid) TO authenticated;

-- =========================================================================
-- KYC INTEGRATION (nl_kyc) — uses the shared engine + existing admin_can_view_scope
-- =========================================================================

ALTER TABLE public.nl_kyc
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS assigned_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_admin_role TEXT,
  ADD COLUMN IF NOT EXISTS approval_level INT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_nl_kyc_assigned_admin ON public.nl_kyc(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_nl_kyc_status ON public.nl_kyc(status);
CREATE INDEX IF NOT EXISTS idx_nl_kyc_location ON public.nl_kyc(country, state, district);

CREATE OR REPLACE FUNCTION public.nl_kyc_route_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_profile record; v_district text; v_approver record;
BEGIN
  IF NEW.status = 'pending'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pending' OR NEW.assigned_admin_id IS NULL) THEN
    NEW.submitted_at := COALESCE(NEW.submitted_at, now());

    SELECT city, state INTO v_profile FROM public.nl_profiles WHERE user_id = NEW.user_id LIMIT 1;
    NEW.city    := COALESCE(NEW.city, v_profile.city);
    NEW.state   := COALESCE(NEW.state, v_profile.state);
    NEW.country := COALESCE(NEW.country, 'India');

    IF NEW.district IS NULL AND NEW.city IS NOT NULL THEN
      SELECT d.name INTO v_district
      FROM public.loc_cities c
      JOIN public.loc_districts d ON d.id = c.district_id
      JOIN public.loc_states st ON st.id = d.state_id
      WHERE lower(c.name) = lower(NEW.city)
        AND (NEW.state IS NULL OR lower(st.name) = lower(NEW.state))
      LIMIT 1;
      NEW.district := v_district;
    END IF;

    IF NEW.assigned_admin_id IS NULL THEN
      SELECT * INTO v_approver FROM public.resolve_approver(NEW.country, NEW.state, NEW.district) LIMIT 1;
      IF v_approver.user_id IS NOT NULL THEN
        NEW.assigned_admin_id   := v_approver.user_id;
        NEW.assigned_admin_role := v_approver.role;
        NEW.approval_level      := v_approver.level;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_nl_kyc_route_approval ON public.nl_kyc;
CREATE TRIGGER trg_nl_kyc_route_approval
BEFORE INSERT OR UPDATE ON public.nl_kyc
FOR EACH ROW EXECUTE FUNCTION public.nl_kyc_route_approval();

CREATE OR REPLACE FUNCTION public.nl_kyc_notify_submit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_label text;
BEGIN
  IF NEW.status = 'pending'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pending') THEN
    v_label := COALESCE(NEW.city, NEW.district, NEW.state, 'their location');
    IF NEW.assigned_admin_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, title, message, type, link)
      VALUES (NEW.assigned_admin_id, 'KYC awaiting your approval',
        'A user in ' || v_label || COALESCE(', ' || NEW.district, '')
          || COALESCE(', ' || NEW.state, '') || ' submitted KYC for verification.',
        'alert', '/admin/nl-kyc');
    END IF;
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (NEW.user_id, 'KYC submitted for review',
      'Your KYC has been routed to the ' || COALESCE(NEW.assigned_admin_role, 'admin team') || ' for approval.',
      'info', '/natural-living/kyc');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_nl_kyc_notify_submit ON public.nl_kyc;
CREATE TRIGGER trg_nl_kyc_notify_submit
AFTER INSERT OR UPDATE ON public.nl_kyc
FOR EACH ROW EXECUTE FUNCTION public.nl_kyc_notify_submit();

CREATE OR REPLACE FUNCTION public.review_nl_kyc(
  _kyc_id uuid, _decision text, _reason text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.nl_kyc%ROWTYPE; v_allowed boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid decision: %', _decision; END IF;
  SELECT * INTO v_row FROM public.nl_kyc WHERE id = _kyc_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'KYC record not found'; END IF;
  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'KYC is not in a reviewable state (status: %)', v_row.status;
  END IF;

  SELECT public.can_review_scope(v_uid, v_row.country, v_row.state, v_row.district, v_row.assigned_admin_id)
    INTO v_allowed;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Only the assigned approver for this location can review this KYC';
  END IF;

  IF _decision = 'approved' THEN
    UPDATE public.nl_kyc SET status = 'approved', reviewer_notes = _reason,
      rejection_reason = NULL, reviewed_by = v_uid, reviewed_at = now()
      WHERE id = _kyc_id;

    INSERT INTO public.user_verification(user_id, trust_score, is_verified, verified_at)
    VALUES (v_row.user_id, 100, true, now())
    ON CONFLICT (user_id) DO UPDATE SET
      trust_score = GREATEST(public.user_verification.trust_score, 100),
      is_verified = true, verified_at = now();

    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (v_row.user_id, 'KYC approved ✅',
      'Your KYC has been approved. Full access unlocked.',
      'success', '/natural-living/kyc');
  ELSE
    UPDATE public.nl_kyc SET status = 'rejected', rejection_reason = _reason,
      reviewer_notes = _reason, reviewed_by = v_uid, reviewed_at = now()
      WHERE id = _kyc_id;
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (v_row.user_id, 'KYC rejected',
      COALESCE('Reason: ' || _reason, 'Your KYC was rejected. Please re-submit.'),
      'alert', '/natural-living/kyc');
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.review_nl_kyc(uuid, text, text) TO authenticated;

DROP POLICY IF EXISTS "Hierarchy admins view nl_kyc" ON public.nl_kyc;
CREATE POLICY "Hierarchy admins view nl_kyc"
ON public.nl_kyc FOR SELECT TO authenticated
USING (public.admin_can_view_scope(auth.uid(), country, state, district));

-- Land registration: consistent approval_level + reuse engine
ALTER TABLE public.nl_land_registrations
  ADD COLUMN IF NOT EXISTS approval_level INT;

CREATE OR REPLACE FUNCTION public.get_land_approver(_country text, _state text, _district text)
RETURNS TABLE(user_id uuid, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.user_id, r.role FROM public.resolve_approver(_country, _state, _district) r LIMIT 1;
$$;
