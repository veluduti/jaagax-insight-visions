
CREATE OR REPLACE FUNCTION public.purchase_agent_subscription(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_days := COALESCE(NULLIF(s.agent_subscription_duration_days, 0),
              CASE s.agent_billing_cycle WHEN 'quarterly' THEN 90 WHEN 'yearly' THEN 365 ELSE 30 END);
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
          jsonb_build_object('billing_cycle', s.agent_billing_cycle, 'duration_days', v_days, 'end_date', v_end))
  RETURNING id, invoice_number INTO v_id, v_inv;

  RETURN jsonb_build_object('ok', true, 'charged', v_total, 'end_date', v_end, 'transaction_id', v_id, 'invoice_number', v_inv);
END;
$$;
