CREATE TABLE IF NOT EXISTS public.agent_admin_upgrade_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id uuid,
  requested_role text NOT NULL CHECK (requested_role IN ('country_admin','state_admin','district_admin')),
  country text,
  state text,
  district text,
  country_id uuid,
  state_id uuid,
  district_id uuid,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  granted_role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.agent_admin_upgrade_requests TO authenticated;
GRANT ALL ON public.agent_admin_upgrade_requests TO service_role;

ALTER TABLE public.agent_admin_upgrade_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_hierarchy_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin(_user_id)
      OR EXISTS (SELECT 1 FROM public.admin_scopes s WHERE s.user_id = _user_id AND s.is_active);
$$;

CREATE POLICY "Agents manage own upgrade requests"
ON public.agent_admin_upgrade_requests
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_hierarchy_admin(auth.uid()));

CREATE POLICY "Agents create own upgrade requests"
ON public.agent_admin_upgrade_requests
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins update upgrade requests"
ON public.agent_admin_upgrade_requests
FOR UPDATE TO authenticated
USING (public.is_hierarchy_admin(auth.uid()))
WITH CHECK (public.is_hierarchy_admin(auth.uid()));

CREATE TRIGGER trg_agent_admin_upgrade_requests_updated_at
BEFORE UPDATE ON public.agent_admin_upgrade_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.approve_agent_admin_upgrade(
  _request_id uuid,
  _role text,
  _country text DEFAULT NULL,
  _state text DEFAULT NULL,
  _district text DEFAULT NULL,
  _country_id uuid DEFAULT NULL,
  _state_id uuid DEFAULT NULL,
  _district_id uuid DEFAULT NULL,
  _notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_caller_role text;
  v_req public.agent_admin_upgrade_requests%ROWTYPE;
  v_allowed text[];
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT public.get_admin_role(v_caller) INTO v_caller_role;
  IF v_caller_role IS NULL AND public.is_admin(v_caller) THEN
    v_caller_role := 'global_admin';
  END IF;
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_allowed := CASE v_caller_role
    WHEN 'global_admin' THEN ARRAY['country_admin','state_admin','district_admin']
    WHEN 'country_admin' THEN ARRAY['state_admin','district_admin']
    WHEN 'state_admin' THEN ARRAY['district_admin']
    ELSE ARRAY[]::text[]
  END;

  IF NOT (_role = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'You cannot grant this admin level';
  END IF;

  SELECT * INTO v_req FROM public.agent_admin_upgrade_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Request already reviewed';
  END IF;

  IF _role = 'country_admin' AND _country IS NULL THEN
    RAISE EXCEPTION 'Country is required';
  END IF;
  IF _role = 'state_admin' AND (_country IS NULL OR _state IS NULL) THEN
    RAISE EXCEPTION 'Country and State are required';
  END IF;
  IF _role = 'district_admin' AND (_country IS NULL OR _state IS NULL OR _district IS NULL) THEN
    RAISE EXCEPTION 'Country, State and District are required';
  END IF;

  INSERT INTO public.admin_scopes (user_id, role, country, state, district, country_id, state_id, district_id, is_active, created_by)
  VALUES (v_req.user_id, _role, _country, _state, _district, _country_id, _state_id, _district_id, true, v_caller);

  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_req.user_id, _role);
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  UPDATE public.agent_admin_upgrade_requests
  SET status = 'approved',
      granted_role = _role,
      country = COALESCE(_country, country),
      state = COALESCE(_state, state),
      district = COALESCE(_district, district),
      country_id = COALESCE(_country_id, country_id),
      state_id = COALESCE(_state_id, state_id),
      district_id = COALESCE(_district_id, district_id),
      reviewed_by = v_caller,
      reviewed_at = now(),
      review_notes = _notes
  WHERE id = _request_id;

  RETURN jsonb_build_object('success', true, 'user_id', v_req.user_id, 'role', _role);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_agent_admin_upgrade(_request_id uuid, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL OR NOT public.is_hierarchy_admin(v_caller) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.agent_admin_upgrade_requests
  SET status = 'rejected', reviewed_by = v_caller, reviewed_at = now(), review_notes = _notes
  WHERE id = _request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or already reviewed'; END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;