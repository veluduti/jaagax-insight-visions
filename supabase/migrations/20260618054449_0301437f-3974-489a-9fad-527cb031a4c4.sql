
-- Cash back entries
CREATE TABLE IF NOT EXISTS public.cash_back_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount >= 0),
  source text NOT NULL CHECK (source IN ('referral_buyer','referral_agent','property_posting','event_referral','other')),
  reference_id text,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','redeemed','expired')),
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.cash_back_entries TO authenticated;
GRANT ALL ON public.cash_back_entries TO service_role;
ALTER TABLE public.cash_back_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cashback_owner_select" ON public.cash_back_entries;
CREATE POLICY "cashback_owner_select" ON public.cash_back_entries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "cashback_owner_update" ON public.cash_back_entries;
CREATE POLICY "cashback_owner_update" ON public.cash_back_entries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS cash_back_entries_user_idx ON public.cash_back_entries(user_id, status);

-- Wrapper RPCs to match prompt names
CREATE OR REPLACE FUNCTION public.get_wallet_balance(_user_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT balance FROM public.wallets WHERE user_id = _user_id), 0);
$$;

CREATE OR REPLACE FUNCTION public.add_to_wallet(
  _user_id uuid, _amount numeric,
  _description text DEFAULT 'Wallet top-up',
  _reference text DEFAULT NULL
) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.create_wallet_for_user(_user_id);
  RETURN public.increment_wallet_balance(_user_id, _amount, _description, _reference);
END $$;

CREATE OR REPLACE FUNCTION public.debit_from_wallet(
  _user_id uuid, _amount numeric,
  _description text DEFAULT 'Wallet debit',
  _reference text DEFAULT NULL
) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.decrement_wallet_balance(_user_id, _amount, _description, _reference);
END $$;

-- Redeem cashback into wallet atomically
CREATE OR REPLACE FUNCTION public.redeem_cashback(_user_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total numeric := 0; v_new_balance numeric;
BEGIN
  IF _user_id <> auth.uid() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT COALESCE(SUM(amount),0) INTO v_total FROM public.cash_back_entries
    WHERE user_id = _user_id AND status = 'available';
  IF v_total <= 0 THEN RETURN 0; END IF;
  UPDATE public.cash_back_entries SET status='redeemed', redeemed_at=now()
    WHERE user_id = _user_id AND status='available';
  v_new_balance := public.add_to_wallet(_user_id, v_total, 'Cashback redemption', 'cashback_'||to_char(now(),'YYYYMMDDHH24MISS'));
  RETURN v_new_balance;
END $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_back_entries;
