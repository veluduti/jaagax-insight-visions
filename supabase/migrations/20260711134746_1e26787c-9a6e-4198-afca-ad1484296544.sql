
CREATE TABLE IF NOT EXISTS public.wallet_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  razorpay_order_id TEXT NOT NULL,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS wallet_payments_order_id_uidx ON public.wallet_payments(razorpay_order_id);
CREATE UNIQUE INDEX IF NOT EXISTS wallet_payments_payment_id_uidx ON public.wallet_payments(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS wallet_payments_user_idx ON public.wallet_payments(user_id, created_at DESC);

GRANT SELECT ON public.wallet_payments TO authenticated;
GRANT ALL ON public.wallet_payments TO service_role;

ALTER TABLE public.wallet_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own wallet payments" ON public.wallet_payments;
CREATE POLICY "Users view own wallet payments" ON public.wallet_payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_wallet_payments_updated_at ON public.wallet_payments;
CREATE TRIGGER trg_wallet_payments_updated_at
  BEFORE UPDATE ON public.wallet_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.credit_wallet_from_razorpay(
  _user_id UUID,
  _payment_id TEXT,
  _order_id TEXT,
  _signature TEXT,
  _amount NUMERIC
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance NUMERIC;
  v_existing_status TEXT;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Idempotency: if we already succeeded for this payment_id, return balance
  SELECT status INTO v_existing_status
  FROM public.wallet_payments
  WHERE razorpay_payment_id = _payment_id;

  IF v_existing_status = 'success' THEN
    SELECT balance INTO v_new_balance FROM public.wallets WHERE user_id = _user_id;
    RETURN COALESCE(v_new_balance, 0);
  END IF;

  -- Ensure wallet exists (idempotent)
  INSERT INTO public.wallets (user_id, balance, currency)
    VALUES (_user_id, 0, 'INR')
    ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_wallet_id;

  IF v_wallet_id IS NULL THEN
    SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  END IF;

  -- Credit balance
  UPDATE public.wallets
    SET balance = balance + _amount, updated_at = now()
    WHERE id = v_wallet_id
    RETURNING balance INTO v_new_balance;

  -- Record wallet transaction
  INSERT INTO public.wallet_transactions
    (wallet_id, user_id, amount, type, category, description, reference_id, status, metadata)
  VALUES
    (v_wallet_id, _user_id, _amount, 'credit', 'add_money',
     'Wallet Top-up via Razorpay', _payment_id, 'completed',
     jsonb_build_object('gateway','razorpay','order_id',_order_id,'payment_id',_payment_id));

  -- Mark payment successful
  UPDATE public.wallet_payments
    SET status = 'success',
        razorpay_payment_id = _payment_id,
        razorpay_signature = _signature,
        updated_at = now()
    WHERE razorpay_order_id = _order_id AND user_id = _user_id;

  RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_wallet_from_razorpay(UUID,TEXT,TEXT,TEXT,NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_wallet_from_razorpay(UUID,TEXT,TEXT,TEXT,NUMERIC) TO service_role;
