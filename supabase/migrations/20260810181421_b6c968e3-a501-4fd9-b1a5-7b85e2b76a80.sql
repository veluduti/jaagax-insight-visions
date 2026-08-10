ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS wallet_id uuid REFERENCES public.wallets(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reference_id text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);

UPDATE public.wallet_transactions t
SET wallet_id = w.id
FROM public.wallets w
WHERE t.wallet_id IS NULL AND w.user_id = t.user_id;

GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_tx_owner_read" ON public.wallet_transactions;
CREATE POLICY "wallet_tx_owner_read" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);