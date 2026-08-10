-- 1. Fix ambiguous column references in resolve_location_ids (breaks property inserts)
CREATE OR REPLACE FUNCTION public.resolve_location_ids(_country text, _state text, _district text, _city text, _locality text)
RETURNS TABLE(country_id uuid, state_id uuid, district_id uuid, city_id uuid, locality_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE c_id UUID; s_id UUID; d_id UUID; ct_id UUID; l_id UUID;
BEGIN
  SELECT co.id INTO c_id FROM public.loc_countries co WHERE lower(co.name)=lower(COALESCE(_country,'India')) LIMIT 1;
  IF c_id IS NULL THEN SELECT co.id INTO c_id FROM public.loc_countries co WHERE co.name='India' LIMIT 1; END IF;
  IF _state IS NOT NULL THEN
    SELECT st.id INTO s_id FROM public.loc_states st WHERE st.country_id=c_id AND lower(st.name)=lower(_state) LIMIT 1;
  END IF;
  IF _district IS NOT NULL AND s_id IS NOT NULL THEN
    SELECT di.id INTO d_id FROM public.loc_districts di WHERE di.state_id=s_id AND lower(di.name)=lower(_district) LIMIT 1;
  END IF;
  IF _city IS NOT NULL THEN
    IF d_id IS NOT NULL THEN
      SELECT ci.id INTO ct_id FROM public.loc_cities ci WHERE ci.district_id=d_id AND lower(ci.name)=lower(_city) LIMIT 1;
    END IF;
    IF ct_id IS NULL AND s_id IS NOT NULL THEN
      SELECT ci.id, ci.district_id INTO ct_id, d_id
        FROM public.loc_cities ci JOIN public.loc_districts di ON di.id=ci.district_id
        WHERE di.state_id=s_id AND lower(ci.name)=lower(_city) LIMIT 1;
    END IF;
    IF ct_id IS NULL THEN
      SELECT ci.id, ci.district_id, di.state_id, st.country_id INTO ct_id, d_id, s_id, c_id
        FROM public.loc_cities ci
        JOIN public.loc_districts di ON di.id=ci.district_id
        JOIN public.loc_states st ON st.id=di.state_id
        WHERE lower(ci.name)=lower(_city) LIMIT 1;
    END IF;
  END IF;
  IF _locality IS NOT NULL AND ct_id IS NOT NULL THEN
    SELECT lo.id INTO l_id FROM public.loc_localities lo WHERE lo.city_id=ct_id AND lower(lo.name)=lower(_locality) LIMIT 1;
  END IF;
  RETURN QUERY SELECT c_id, s_id, d_id, ct_id, l_id;
END;
$function$;

-- 2. Pricing / monetisation settings (singleton)
CREATE TABLE IF NOT EXISTS public.platform_pricing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  free_posts_limit integer NOT NULL DEFAULT 5,
  pay_per_post_enabled boolean NOT NULL DEFAULT true,
  posting_fee numeric NOT NULL DEFAULT 499,
  posting_gst_percent numeric NOT NULL DEFAULT 18,
  currency text NOT NULL DEFAULT 'INR',
  agent_subscription_enabled boolean NOT NULL DEFAULT true,
  agent_subscription_price numeric NOT NULL DEFAULT 2999,
  agent_subscription_gst_percent numeric NOT NULL DEFAULT 18,
  agent_billing_cycle text NOT NULL DEFAULT 'monthly',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pps_cycle_chk CHECK (agent_billing_cycle IN ('monthly','quarterly','yearly')),
  CONSTRAINT pps_singleton_chk CHECK (singleton = true)
);

GRANT SELECT ON public.platform_pricing_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.platform_pricing_settings TO authenticated;
GRANT ALL ON public.platform_pricing_settings TO service_role;
ALTER TABLE public.platform_pricing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pps_public_read" ON public.platform_pricing_settings FOR SELECT USING (true);
CREATE POLICY "pps_admin_insert" ON public.platform_pricing_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "pps_admin_update" ON public.platform_pricing_settings FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER pps_updated_at BEFORE UPDATE ON public.platform_pricing_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.platform_pricing_settings (singleton) VALUES (true) ON CONFLICT (singleton) DO NOTHING;

-- 3. Payment history / invoices
CREATE SEQUENCE IF NOT EXISTS public.invoice_seq START 1000;

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  purpose text NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  invoice_number text NOT NULL UNIQUE DEFAULT ('JX-' || to_char(now(),'YYYYMM') || '-' || lpad(nextval('public.invoice_seq')::text, 6, '0')),
  base_amount numeric NOT NULL DEFAULT 0,
  gst_percent numeric NOT NULL DEFAULT 0,
  gst_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  method text NOT NULL DEFAULT 'wallet',
  status text NOT NULL DEFAULT 'success',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pt_purpose_chk CHECK (purpose IN ('free_post','property_post','agent_subscription')),
  CONSTRAINT pt_status_chk CHECK (status IN ('success','failed','pending','refunded'))
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON public.payment_transactions(user_id, created_at DESC);

GRANT SELECT, INSERT ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
GRANT USAGE ON SEQUENCE public.invoice_seq TO authenticated, service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pt_owner_read" ON public.payment_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "pt_owner_insert" ON public.payment_transactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER pt_updated_at BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Entitlement helper
CREATE OR REPLACE FUNCTION public.get_posting_entitlement(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  s public.platform_pricing_settings%ROWTYPE;
  v_paid int := 0;
  v_total int := 0;
  v_free_used int := 0;
  v_free_remaining int := 0;
  v_has_sub boolean := false;
  v_fee numeric; v_gst numeric; v_total_amt numeric;
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

  v_fee := COALESCE(s.posting_fee, 0);
  v_gst := round(v_fee * COALESCE(s.posting_gst_percent, 0) / 100.0, 2);
  v_total_amt := v_fee + v_gst;

  RETURN jsonb_build_object(
    'free_limit', COALESCE(s.free_posts_limit, 0),
    'free_used', v_free_used,
    'free_remaining', v_free_remaining,
    'has_agent_subscription', v_has_sub,
    'pay_per_post_enabled', COALESCE(s.pay_per_post_enabled, false),
    'requires_payment', (NOT v_has_sub) AND v_free_remaining <= 0,
    'fee', v_fee,
    'gst_percent', COALESCE(s.posting_gst_percent, 0),
    'gst_amount', v_gst,
    'total', v_total_amt,
    'currency', COALESCE(s.currency, 'INR')
  );
END;
$$;

-- 5. Charge posting fee from wallet + invoice
CREATE OR REPLACE FUNCTION public.charge_property_posting(_user_id uuid, _property_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  ent jsonb; s public.platform_pricing_settings%ROWTYPE;
  v_total numeric; v_id uuid; v_inv text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  ent := public.get_posting_entitlement(_user_id);
  SELECT * INTO s FROM public.platform_pricing_settings LIMIT 1;

  IF (ent->>'requires_payment')::boolean = false THEN
    INSERT INTO public.payment_transactions(user_id, purpose, property_id, base_amount, gst_percent, gst_amount, total_amount, currency, method, metadata)
    VALUES (_user_id, 'free_post', _property_id, 0, 0, 0, 0, COALESCE(s.currency,'INR'), 'free',
            jsonb_build_object('free_remaining_after', GREATEST((ent->>'free_remaining')::int - 1, 0)))
    RETURNING id, invoice_number INTO v_id, v_inv;
    RETURN jsonb_build_object('ok', true, 'charged', 0, 'transaction_id', v_id, 'invoice_number', v_inv, 'free', true);
  END IF;

  IF COALESCE(s.pay_per_post_enabled, false) = false THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'pay_per_post_disabled');
  END IF;

  v_total := (ent->>'total')::numeric;

  BEGIN
    PERFORM public.decrement_wallet_balance(_user_id, v_total, 'Property posting fee', 'property:' || _property_id::text);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_funds', 'amount', v_total);
  END;

  INSERT INTO public.payment_transactions(user_id, purpose, property_id, base_amount, gst_percent, gst_amount, total_amount, currency, method)
  VALUES (_user_id, 'property_post', _property_id, (ent->>'fee')::numeric, (ent->>'gst_percent')::numeric,
          (ent->>'gst_amount')::numeric, v_total, COALESCE(s.currency,'INR'), 'wallet')
  RETURNING id, invoice_number INTO v_id, v_inv;

  RETURN jsonb_build_object('ok', true, 'charged', v_total, 'transaction_id', v_id, 'invoice_number', v_inv, 'free', false);
END;
$$;

-- 6. Agent subscription purchase
CREATE OR REPLACE FUNCTION public.purchase_agent_subscription(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  s public.platform_pricing_settings%ROWTYPE;
  v_gst numeric; v_total numeric; v_days int; v_end timestamptz;
  v_id uuid; v_inv text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  SELECT * INTO s FROM public.platform_pricing_settings LIMIT 1;
  IF COALESCE(s.agent_subscription_enabled, false) = false THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'subscription_disabled');
  END IF;

  v_gst := round(s.agent_subscription_price * COALESCE(s.agent_subscription_gst_percent,0) / 100.0, 2);
  v_total := s.agent_subscription_price + v_gst;
  v_days := CASE s.agent_billing_cycle WHEN 'quarterly' THEN 90 WHEN 'yearly' THEN 365 ELSE 30 END;
  v_end := now() + (v_days || ' days')::interval;

  BEGIN
    PERFORM public.decrement_wallet_balance(_user_id, v_total, 'Agent subscription', 'agent_sub:' || to_char(now(),'YYYYMMDDHH24MISS'));
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_funds', 'amount', v_total);
  END;

  UPDATE public.agent_subscriptions SET is_active = false WHERE user_id = _user_id AND is_active = true;

  INSERT INTO public.agent_subscriptions(user_id, plan_type, plan_name, price, is_active, end_date)
  VALUES (_user_id, 'pro', 'Agent Subscription (' || s.agent_billing_cycle || ')', v_total, true, v_end);

  INSERT INTO public.payment_transactions(user_id, purpose, base_amount, gst_percent, gst_amount, total_amount, currency, method, metadata)
  VALUES (_user_id, 'agent_subscription', s.agent_subscription_price, COALESCE(s.agent_subscription_gst_percent,0),
          v_gst, v_total, COALESCE(s.currency,'INR'), 'wallet',
          jsonb_build_object('billing_cycle', s.agent_billing_cycle, 'end_date', v_end))
  RETURNING id, invoice_number INTO v_id, v_inv;

  RETURN jsonb_build_object('ok', true, 'charged', v_total, 'end_date', v_end, 'transaction_id', v_id, 'invoice_number', v_inv);
END;
$$;