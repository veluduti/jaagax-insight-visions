ALTER TABLE public.signup_email_otps
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.signup_email_otps
  ALTER COLUMN user_id DROP NOT NULL;

-- Drop unique on user_id since it can be null pre-creation; keep email unique.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'signup_email_otps_user_id_key') THEN
    ALTER TABLE public.signup_email_otps DROP CONSTRAINT signup_email_otps_user_id_key;
  END IF;
END$$;

-- Service role only - no public RLS policies needed (function uses service role)
