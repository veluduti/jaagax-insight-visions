ALTER TABLE public.platform_pricing_settings
  ADD COLUMN IF NOT EXISTS free_visits_limit integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS visit_booking_paid_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visit_fee numeric NOT NULL DEFAULT 499,
  ADD COLUMN IF NOT EXISTS visit_gst_percent numeric NOT NULL DEFAULT 18;

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS booking_id uuid;

ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS pt_purpose_chk;
ALTER TABLE public.payment_transactions ADD CONSTRAINT pt_purpose_chk
  CHECK (purpose = ANY (ARRAY['free_post','property_post','agent_subscription','free_visit','visit_booking']));

CREATE OR REPLACE FUNCTION public.get_visit_entitlement(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s public.platform_pricing_settings%ROWTYPE;
  v_free_used int := 0;
  v_free_remaining int := 0;
  v_fee numeric; v_gst numeric; v_total numeric;
BEGIN
  SELECT * INTO s FROM public.platform_pricing_settings LIMIT 1;

  SELECT count(*) INTO v_free_used
    FROM public.payment_transactions t
   WHERE t.user_id = _user_id AND t.purpose = 'free_visit' AND t.status = 'success';

  v_free_remaining := GREATEST(COALESCE(s.free_visits_limit, 0) - v_free_used, 0);

  v_fee := COALESCE(s.visit_fee, 0);
  v_gst := COALESCE(s.visit_gst_percent, 0);
  v_total := round(v_fee * (1 + v_gst / 100.0), 2);

  RETURN jsonb_build_object(
    'free_limit', COALESCE(s.free_visits_limit, 0),
    'free_used', v_free_used,
    'free_remaining', v_free_remaining,
    'paid_enabled', COALESCE(s.visit_booking_paid_enabled, true),
    'requires_payment', v_free_remaining <= 0,
    'fee', v_fee,
    'gst_percent', v_gst,
    'gst_amount', round(v_fee * v_gst / 100.0, 2),
    'total', v_total,
    'currency', COALESCE(s.currency, 'INR')
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.charge_visit_booking(_user_id uuid, _booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ent jsonb; s public.platform_pricing_settings%ROWTYPE;
  v_total numeric; v_id uuid; v_inv text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  ent := public.get_visit_entitlement(_user_id);
  SELECT * INTO s FROM public.platform_pricing_settings LIMIT 1;

  IF (ent->>'requires_payment')::boolean = false THEN
    INSERT INTO public.payment_transactions(user_id, purpose, booking_id, base_amount, gst_percent, gst_amount, total_amount, currency, method, metadata)
    VALUES (_user_id, 'free_visit', _booking_id, 0, 0, 0, 0, COALESCE(s.currency,'INR'), 'free',
            jsonb_build_object('free_remaining_after', GREATEST((ent->>'free_remaining')::int - 1, 0)))
    RETURNING id, invoice_number INTO v_id, v_inv;
    RETURN jsonb_build_object('ok', true, 'charged', 0, 'transaction_id', v_id, 'invoice_number', v_inv, 'free', true);
  END IF;

  IF COALESCE(s.visit_booking_paid_enabled, true) = false THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'paid_visits_disabled');
  END IF;

  v_total := (ent->>'total')::numeric;

  BEGIN
    PERFORM public.decrement_wallet_balance(_user_id, v_total, 'Visit booking fee', 'visit:' || _booking_id::text);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_funds', 'amount', v_total);
  END;

  INSERT INTO public.payment_transactions(user_id, purpose, booking_id, base_amount, gst_percent, gst_amount, total_amount, currency, method)
  VALUES (_user_id, 'visit_booking', _booking_id, (ent->>'fee')::numeric, (ent->>'gst_percent')::numeric,
          (ent->>'gst_amount')::numeric, v_total, COALESCE(s.currency,'INR'), 'wallet')
  RETURNING id, invoice_number INTO v_id, v_inv;

  RETURN jsonb_build_object('ok', true, 'charged', v_total, 'transaction_id', v_id, 'invoice_number', v_inv, 'free', false);
END;
$function$;