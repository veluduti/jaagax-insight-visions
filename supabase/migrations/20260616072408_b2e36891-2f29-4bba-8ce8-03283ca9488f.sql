
-- =========================================================
-- 1. WALLETS: add currency column (table already exists)
-- =========================================================
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR';

CREATE INDEX IF NOT EXISTS wallets_user_id_idx ON public.wallets(user_id);

-- =========================================================
-- 2. WALLET_TRANSACTIONS: extend existing table
-- =========================================================
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS wallet_id    UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS category     TEXT,
  ADD COLUMN IF NOT EXISTS reference_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata     JSONB;

-- Backfill wallet_id from user_id (existing rows used user_id only)
UPDATE public.wallet_transactions wt
SET wallet_id = w.id
FROM public.wallets w
WHERE wt.wallet_id IS NULL AND w.user_id = wt.user_id;

-- Backfill reference_id from legacy 'reference' column if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='wallet_transactions' AND column_name='reference'
  ) THEN
    EXECUTE 'UPDATE public.wallet_transactions SET reference_id = COALESCE(reference_id, reference) WHERE reference_id IS NULL';
  END IF;
END $$;

-- Widen status check constraint to include 'refunded'
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_status_check;
ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_status_check
  CHECK (status IN ('pending','completed','failed','refunded'));

-- Add category check constraint (nullable allowed for legacy rows)
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_category_check;
ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_category_check
  CHECK (category IS NULL OR category IN
    ('add_money','promotion','lead_purchase','subscription','cashback','referral','refund','withdrawal'));

CREATE INDEX IF NOT EXISTS wallet_transactions_wallet_id_idx   ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS wallet_transactions_created_at_idx  ON public.wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS wallet_transactions_category_idx    ON public.wallet_transactions(category);

-- =========================================================
-- 3. AUTO_RECHARGE_SETTINGS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.auto_recharge_settings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id          UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  enabled            BOOLEAN NOT NULL DEFAULT FALSE,
  threshold_amount   DECIMAL NOT NULL DEFAULT 500 CHECK (threshold_amount >= 0),
  recharge_amount    DECIMAL NOT NULL DEFAULT 1000 CHECK (recharge_amount > 0),
  payment_method_id  TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (wallet_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.auto_recharge_settings TO authenticated;
GRANT ALL ON public.auto_recharge_settings TO service_role;

ALTER TABLE public.auto_recharge_settings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS auto_recharge_settings_wallet_id_idx
  ON public.auto_recharge_settings(wallet_id);

DROP POLICY IF EXISTS "Users manage own auto-recharge" ON public.auto_recharge_settings;
CREATE POLICY "Users manage own auto-recharge"
  ON public.auto_recharge_settings
  FOR ALL
  TO authenticated
  USING (wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()))
  WITH CHECK (wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()));

-- =========================================================
-- 4. TRIGGERS (updated_at)
-- =========================================================
DROP TRIGGER IF EXISTS update_wallets_updated_at ON public.wallets;
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_auto_recharge_updated_at ON public.auto_recharge_settings;
CREATE TRIGGER update_auto_recharge_updated_at
  BEFORE UPDATE ON public.auto_recharge_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 5. HELPER FUNCTIONS
-- =========================================================
-- Create a wallet for a given user (idempotent). Call this from your
-- existing signup flow (e.g. handle_new_user) or from app code.
CREATE OR REPLACE FUNCTION public.create_wallet_for_user(_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.wallets (user_id, balance, currency)
  VALUES (_user_id, 0, 'INR')
  ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Increment balance by amount, returns new balance
CREATE OR REPLACE FUNCTION public.increment_balance(_wallet_id UUID, _amount DECIMAL)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_new DECIMAL;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  UPDATE public.wallets
     SET balance = balance + _amount, updated_at = NOW()
   WHERE id = _wallet_id
   RETURNING balance INTO v_new;
  IF v_new IS NULL THEN RAISE EXCEPTION 'Wallet not found: %', _wallet_id; END IF;
  RETURN v_new;
END $$;

-- Decrement balance by amount, returns new balance (raises on insufficient funds)
CREATE OR REPLACE FUNCTION public.decrement_balance(_wallet_id UUID, _amount DECIMAL)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_current DECIMAL; v_new DECIMAL;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  SELECT balance INTO v_current FROM public.wallets WHERE id = _wallet_id FOR UPDATE;
  IF v_current IS NULL THEN RAISE EXCEPTION 'Wallet not found: %', _wallet_id; END IF;
  IF v_current < _amount THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
  UPDATE public.wallets
     SET balance = balance - _amount, updated_at = NOW()
   WHERE id = _wallet_id
   RETURNING balance INTO v_new;
  RETURN v_new;
END $$;

-- =========================================================
-- 6. GRANTS
-- =========================================================
GRANT SELECT, INSERT, UPDATE ON public.wallets              TO authenticated;
GRANT SELECT, INSERT          ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallets, public.wallet_transactions, public.auto_recharge_settings TO service_role;

GRANT EXECUTE ON FUNCTION public.create_wallet_for_user(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_balance(UUID, DECIMAL) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrement_balance(UUID, DECIMAL) TO authenticated, service_role;
