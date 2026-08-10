
CREATE TABLE IF NOT EXISTS public.agent_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  mobile text NOT NULL,
  email text,
  date_of_birth date,
  address text,
  city text,
  state text,
  pincode text,
  aadhaar_number text,
  aadhaar_front_url text,
  aadhaar_back_url text,
  pan_number text,
  pan_card_url text,
  profile_photo_url text,
  selfie_url text,
  experience_years integer DEFAULT 0,
  operating_locations text,
  languages text,
  rera_number text,
  agency_name text,
  account_holder_name text,
  account_number text,
  ifsc_code text,
  bank_name text,
  upi_id text,
  terms_accepted boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  admin_remarks text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  trial_started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_applications_status_chk CHECK (status IN ('pending','approved','rejected'))
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_applications_user_unique ON public.agent_applications(user_id);

GRANT SELECT, INSERT, UPDATE ON public.agent_applications TO authenticated;
GRANT ALL ON public.agent_applications TO service_role;

ALTER TABLE public.agent_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own agent application"
  ON public.agent_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users insert own agent application"
  ON public.agent_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own pending application"
  ON public.agent_applications FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id AND status <> 'approved') OR public.is_admin(auth.uid()))
  WITH CHECK ((auth.uid() = user_id AND status <> 'approved') OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_agent_applications_updated
  BEFORE UPDATE ON public.agent_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.platform_pricing_settings
  ADD COLUMN IF NOT EXISTS agent_trial_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS agent_trial_free_posts integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS agent_subscription_duration_days integer NOT NULL DEFAULT 30;

CREATE OR REPLACE FUNCTION public.review_agent_application(_app_id uuid, _approve boolean, _remarks text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app public.agent_applications%ROWTYPE;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  SELECT * INTO app FROM public.agent_applications WHERE id = _app_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF _approve THEN
    UPDATE public.agent_applications
      SET status = 'approved', admin_remarks = _remarks, reviewed_by = auth.uid(),
          reviewed_at = now(), trial_started_at = COALESCE(trial_started_at, now())
      WHERE id = _app_id;

    INSERT INTO public.user_roles (user_id, role)
      VALUES (app.user_id, 'agent')
      ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.agents (user_id, name, phone, email, agency_name, experience_years, city, state, verified)
      VALUES (app.user_id, app.full_name, app.mobile, app.email, app.agency_name,
              COALESCE(app.experience_years, 0), app.city, app.state, true)
      ON CONFLICT (user_id) DO UPDATE
        SET name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            email = COALESCE(EXCLUDED.email, public.agents.email),
            agency_name = COALESCE(EXCLUDED.agency_name, public.agents.agency_name),
            verified = true,
            updated_at = now();

    RETURN jsonb_build_object('ok', true, 'status', 'approved');
  ELSE
    UPDATE public.agent_applications
      SET status = 'rejected', admin_remarks = _remarks, reviewed_by = auth.uid(), reviewed_at = now()
      WHERE id = _app_id;
    RETURN jsonb_build_object('ok', true, 'status', 'rejected');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_agent_application(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_posting_entitlement(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.platform_pricing_settings%ROWTYPE;
  v_paid int := 0;
  v_total int := 0;
  v_free_used int := 0;
  v_free_remaining int := 0;
  v_has_sub boolean := false;
  v_fee numeric; v_gst numeric; v_total_amt numeric;
  v_is_agent boolean := false;
  v_app_status text := NULL;
  v_trial_start timestamptz;
  v_trial_days_left int := 0;
  v_trial_posts_used int := 0;
  v_trial_posts_left int := 0;
  v_trial_active boolean := false;
  v_requires_sub boolean := false;
BEGIN
  SELECT * INTO s FROM public.platform_pricing_settings LIMIT 1;

  SELECT count(*) INTO v_total FROM public.properties p
    WHERE p.submitted_by = _user_id AND COALESCE(p.is_draft, false) = false;
  SELECT count(*) INTO v_paid FROM public.payment_transactions t
    WHERE t.user_id = _user_id AND t.purpose = 'property_post' AND t.status = 'success';

  v_free_used := GREATEST(v_total - v_paid, 0);
  v_free_remaining := GREATEST(COALESCE(s.free_posts_limit, 0) - v_free_used, 0);

  SELECT EXISTS (
    SELECT 1 FROM public.agent_subscriptions a
    WHERE a.user_id = _user_id AND a.is_active = true
      AND (a.end_date IS NULL OR a.end_date > now())
  ) INTO v_has_sub;

  SELECT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = _user_id AND r.role = 'agent')
    INTO v_is_agent;

  SELECT status, trial_started_at INTO v_app_status, v_trial_start
    FROM public.agent_applications WHERE user_id = _user_id;

  IF v_is_agent THEN
    v_trial_start := COALESCE(v_trial_start, now());
    v_trial_days_left := GREATEST(
      COALESCE(s.agent_trial_days, 0) - EXTRACT(day FROM (now() - v_trial_start))::int, 0);
    SELECT count(*) INTO v_trial_posts_used FROM public.properties p
      WHERE p.submitted_by = _user_id
        AND COALESCE(p.is_draft, false) = false
        AND p.created_at >= v_trial_start;
    v_trial_posts_left := GREATEST(COALESCE(s.agent_trial_free_posts, 0) - v_trial_posts_used, 0);
    v_trial_active := v_trial_days_left > 0 AND v_trial_posts_left > 0;
    v_requires_sub := NOT v_trial_active AND NOT v_has_sub;
  END IF;

  v_fee := COALESCE(s.posting_fee, 0);
  v_gst := round(v_fee * COALESCE(s.posting_gst_percent, 0) / 100.0, 2);
  v_total_amt := v_fee + v_gst;

  RETURN jsonb_build_object(
    'free_limit', COALESCE(s.free_posts_limit, 0),
    'free_used', v_free_used,
    'free_remaining', v_free_remaining,
    'has_agent_subscription', v_has_sub,
    'pay_per_post_enabled', COALESCE(s.pay_per_post_enabled, false),
    'requires_payment', CASE WHEN v_is_agent THEN v_requires_sub ELSE ((NOT v_has_sub) AND v_free_remaining <= 0) END,
    'fee', v_fee,
    'gst_percent', COALESCE(s.posting_gst_percent, 0),
    'gst_amount', v_gst,
    'total', v_total_amt,
    'currency', COALESCE(s.currency, 'INR'),
    'is_agent', v_is_agent,
    'agent_application_status', v_app_status,
    'trial_active', v_trial_active,
    'trial_days_remaining', v_trial_days_left,
    'trial_posts_remaining', v_trial_posts_left,
    'requires_subscription', v_requires_sub
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_posting_entitlement(uuid) TO authenticated, anon;
