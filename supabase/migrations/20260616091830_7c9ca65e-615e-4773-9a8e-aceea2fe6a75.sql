
-- Add missing columns to existing notifications table
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS builder_profile_id UUID REFERENCES public.builder_profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill is_read from legacy `read` column if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='notifications' AND column_name='read') THEN
    EXECUTE 'UPDATE public.notifications SET is_read = read WHERE is_read IS DISTINCT FROM read';
  END IF;
END $$;

-- Make message nullable-safe: ensure NOT NULL only if all rows have it
UPDATE public.notifications SET message = '' WHERE message IS NULL;
ALTER TABLE public.notifications ALTER COLUMN message SET NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_builder_profile_id ON public.notifications(builder_profile_id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- Ensure RLS is enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies (use unique names; skip if already present)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='notifications_select_own_v2') THEN
    CREATE POLICY notifications_select_own_v2 ON public.notifications
      FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='notifications_update_own_v2') THEN
    CREATE POLICY notifications_update_own_v2 ON public.notifications
      FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='notifications_delete_own_v2') THEN
    CREATE POLICY notifications_delete_own_v2 ON public.notifications
      FOR DELETE TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='notifications_insert_system_v2') THEN
    CREATE POLICY notifications_insert_system_v2 ON public.notifications
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- Wallet low balance trigger
CREATE OR REPLACE FUNCTION public.check_wallet_balance_and_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.balance < 500 AND OLD.balance >= 500 THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, is_read)
    VALUES (
      NEW.user_id,
      'wallet_low_balance',
      'Low wallet balance',
      'Your wallet balance has dropped below ₹500. Current balance: ₹' || NEW.balance::text,
      '/dashboard/builder?tab=wallet',
      false
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_wallet_balance_check ON public.wallets;
CREATE TRIGGER trigger_wallet_balance_check
  AFTER UPDATE ON public.wallets
  FOR EACH ROW
  WHEN (OLD.balance IS DISTINCT FROM NEW.balance)
  EXECUTE FUNCTION public.check_wallet_balance_and_notify();

-- Verification
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='notifications'
ORDER BY ordinal_position;
