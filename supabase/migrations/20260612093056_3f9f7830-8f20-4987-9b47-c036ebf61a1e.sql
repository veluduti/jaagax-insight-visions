
-- ============================================================
-- PHASE 1: Seller Dashboard backend foundations
-- ============================================================

-- 1. WALLETS
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
  auto_recharge boolean NOT NULL DEFAULT false,
  auto_recharge_threshold numeric DEFAULT 500,
  auto_recharge_amount numeric DEFAULT 1000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_owner_read" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "wallet_owner_insert" ON public.wallets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wallet_owner_update" ON public.wallets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. WALLET TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('credit','debit')),
  description text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed')),
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wt_owner_read" ON public.wallet_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "wt_owner_insert" ON public.wallet_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX wt_user_created_idx ON public.wallet_transactions(user_id, created_at DESC);

-- 3. SELLER SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.seller_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type text NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free','premium','agent_pro')),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.seller_subscriptions TO authenticated;
GRANT ALL ON public.seller_subscriptions TO service_role;
ALTER TABLE public.seller_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_owner_read" ON public.seller_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sub_owner_insert" ON public.seller_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sub_owner_update" ON public.seller_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX sub_user_active_idx ON public.seller_subscriptions(user_id, is_active);
CREATE TRIGGER sub_updated_at BEFORE UPDATE ON public.seller_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. MONTHLY POSTING LIMITS
CREATE TABLE IF NOT EXISTS public.monthly_posting_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  posts_used int NOT NULL DEFAULT 0,
  free_limit int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_year)
);
GRANT SELECT, INSERT, UPDATE ON public.monthly_posting_limits TO authenticated;
GRANT ALL ON public.monthly_posting_limits TO service_role;
ALTER TABLE public.monthly_posting_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mpl_owner_read" ON public.monthly_posting_limits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER mpl_updated_at BEFORE UPDATE ON public.monthly_posting_limits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. KYC VERIFICATIONS
CREATE TABLE IF NOT EXISTS public.kyc_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','pending','verified','rejected')),
  aadhaar_url text,
  pan_url text,
  selfie_url text,
  rejection_reason text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.kyc_verifications TO authenticated;
GRANT ALL ON public.kyc_verifications TO service_role;
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kyc_owner_read" ON public.kyc_verifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "kyc_admin_read" ON public.kyc_verifications FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "kyc_owner_insert" ON public.kyc_verifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "kyc_owner_update" ON public.kyc_verifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "kyc_admin_update" ON public.kyc_verifications FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER kyc_updated_at BEFORE UPDATE ON public.kyc_verifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. SELLER ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS public.seller_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.seller_activity_logs TO authenticated;
GRANT ALL ON public.seller_activity_logs TO service_role;
ALTER TABLE public.seller_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sal_owner_read" ON public.seller_activity_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sal_owner_insert" ON public.seller_activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX sal_user_created_idx ON public.seller_activity_logs(user_id, created_at DESC);

-- 7. PROPERTIES: add sold + price drop columns
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_sold boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sold_at timestamptz,
  ADD COLUMN IF NOT EXISTS has_price_drop_ribbon boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS previous_price numeric,
  ADD COLUMN IF NOT EXISTS price_dropped_at timestamptz;

-- ============================================================
-- RPCs
-- ============================================================

-- Credit
CREATE OR REPLACE FUNCTION public.increment_wallet_balance(
  _user_id uuid, _amount numeric, _description text DEFAULT 'Wallet top-up', _reference text DEFAULT NULL
) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_balance numeric;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  INSERT INTO public.wallets(user_id, balance) VALUES (_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET balance = balance + _amount, updated_at = now()
    WHERE user_id = _user_id RETURNING balance INTO new_balance;
  INSERT INTO public.wallet_transactions(user_id, amount, type, description, status, reference)
    VALUES (_user_id, _amount, 'credit', _description, 'completed', _reference);
  RETURN new_balance;
END $$;

-- Debit
CREATE OR REPLACE FUNCTION public.decrement_wallet_balance(
  _user_id uuid, _amount numeric, _description text DEFAULT 'Wallet debit', _reference text DEFAULT NULL
) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_balance numeric; current_balance numeric;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  SELECT balance INTO current_balance FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF current_balance IS NULL OR current_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;
  UPDATE public.wallets SET balance = balance - _amount, updated_at = now()
    WHERE user_id = _user_id RETURNING balance INTO new_balance;
  INSERT INTO public.wallet_transactions(user_id, amount, type, description, status, reference)
    VALUES (_user_id, _amount, 'debit', _description, 'completed', _reference);
  RETURN new_balance;
END $$;

-- Get or create posting limit row
CREATE OR REPLACE FUNCTION public.check_and_consume_posting_quota(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_month text := to_char(now(), 'YYYY-MM');
  v_row public.monthly_posting_limits%ROWTYPE;
  v_plan text := 'free';
  v_fee numeric := 500;
BEGIN
  -- current active plan
  SELECT plan_type INTO v_plan FROM public.seller_subscriptions
    WHERE user_id = _user_id AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY started_at DESC LIMIT 1;
  v_plan := COALESCE(v_plan, 'free');

  INSERT INTO public.monthly_posting_limits(user_id, month_year, posts_used, free_limit)
    VALUES (_user_id, v_month, 0, 1)
    ON CONFLICT (user_id, month_year) DO NOTHING;
  SELECT * INTO v_row FROM public.monthly_posting_limits
    WHERE user_id = _user_id AND month_year = v_month FOR UPDATE;

  -- premium / agent_pro = unlimited
  IF v_plan IN ('premium','agent_pro') THEN
    UPDATE public.monthly_posting_limits SET posts_used = posts_used + 1
      WHERE id = v_row.id;
    RETURN jsonb_build_object('allowed', true, 'plan', v_plan, 'charged', 0,
      'free_remaining', GREATEST(v_row.free_limit - v_row.posts_used - 1, 0));
  END IF;

  -- free quota available
  IF v_row.posts_used < v_row.free_limit THEN
    UPDATE public.monthly_posting_limits SET posts_used = posts_used + 1
      WHERE id = v_row.id;
    RETURN jsonb_build_object('allowed', true, 'plan', v_plan, 'charged', 0,
      'free_remaining', v_row.free_limit - v_row.posts_used - 1);
  END IF;

  -- need wallet debit
  BEGIN
    PERFORM public.decrement_wallet_balance(_user_id, v_fee, 'Property posting fee', 'posting:' || v_month);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('allowed', false, 'plan', v_plan, 'charged', 0,
      'free_remaining', 0, 'reason', 'insufficient_funds', 'fee', v_fee);
  END;
  UPDATE public.monthly_posting_limits SET posts_used = posts_used + 1 WHERE id = v_row.id;
  RETURN jsonb_build_object('allowed', true, 'plan', v_plan, 'charged', v_fee, 'free_remaining', 0);
END $$;

-- Quota status (read-only)
CREATE OR REPLACE FUNCTION public.get_posting_quota_status(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_month text := to_char(now(), 'YYYY-MM');
  v_used int := 0; v_limit int := 1; v_plan text := 'free';
BEGIN
  SELECT plan_type INTO v_plan FROM public.seller_subscriptions
    WHERE user_id = _user_id AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY started_at DESC LIMIT 1;
  v_plan := COALESCE(v_plan, 'free');
  SELECT posts_used, free_limit INTO v_used, v_limit FROM public.monthly_posting_limits
    WHERE user_id = _user_id AND month_year = v_month;
  RETURN jsonb_build_object('plan', v_plan, 'posts_used', COALESCE(v_used,0),
    'free_limit', COALESCE(v_limit,1), 'free_remaining', GREATEST(COALESCE(v_limit,1) - COALESCE(v_used,0), 0));
END $$;

-- Mark property sold
CREATE OR REPLACE FUNCTION public.mark_property_sold(_property_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  SELECT submitted_by INTO v_owner FROM public.properties WHERE id = _property_id FOR UPDATE;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF v_owner <> auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only the listing owner can mark this as sold';
  END IF;
  UPDATE public.properties SET is_sold = true, sold_at = now(), is_live = false, updated_at = now()
    WHERE id = _property_id;
END $$;

-- Drop price
CREATE OR REPLACE FUNCTION public.drop_property_price(_property_id uuid, _new_price numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_old numeric;
BEGIN
  SELECT submitted_by, price INTO v_owner, v_old FROM public.properties WHERE id = _property_id FOR UPDATE;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF v_owner <> auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only the listing owner can drop the price';
  END IF;
  IF _new_price <= 0 OR _new_price >= v_old THEN
    RAISE EXCEPTION 'New price must be lower than current price';
  END IF;
  UPDATE public.properties
    SET previous_price = v_old, price = _new_price,
        has_price_drop_ribbon = true, price_dropped_at = now(), updated_at = now()
    WHERE id = _property_id;
END $$;

-- Submit KYC
CREATE OR REPLACE FUNCTION public.submit_kyc(_aadhaar text, _pan text, _selfie text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  INSERT INTO public.kyc_verifications(user_id, status, aadhaar_url, pan_url, selfie_url, submitted_at)
    VALUES (auth.uid(), 'pending', _aadhaar, _pan, _selfie, now())
    ON CONFLICT (user_id) DO UPDATE
      SET status = 'pending', aadhaar_url = EXCLUDED.aadhaar_url,
          pan_url = EXCLUDED.pan_url, selfie_url = EXCLUDED.selfie_url,
          submitted_at = now(), rejection_reason = NULL, updated_at = now();

  -- Notify admins
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id, 'New KYC submission',
    'A seller submitted KYC documents for review.', 'info', '/admin'
  FROM public.user_roles ur WHERE ur.role = 'admin';
END $$;

-- Admin review KYC
CREATE OR REPLACE FUNCTION public.review_kyc(_user_id uuid, _decision text, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF _decision NOT IN ('verified','rejected') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  UPDATE public.kyc_verifications
    SET status = _decision, rejection_reason = CASE WHEN _decision='rejected' THEN _reason ELSE NULL END,
        reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
    WHERE user_id = _user_id;

  INSERT INTO public.notifications(user_id, title, message, type, link)
  VALUES (_user_id,
    CASE WHEN _decision='verified' THEN 'KYC verified ✅' ELSE 'KYC rejected' END,
    CASE WHEN _decision='verified'
         THEN 'Your KYC is approved. Verified badge is now active.'
         ELSE COALESCE('Reason: ' || _reason, 'Your KYC was rejected. Please re-submit.') END,
    CASE WHEN _decision='verified' THEN 'success' ELSE 'alert' END,
    '/dashboard/seller');
END $$;
