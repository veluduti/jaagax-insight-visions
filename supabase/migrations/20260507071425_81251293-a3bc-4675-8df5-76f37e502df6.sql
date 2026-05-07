ALTER TABLE public.signup_email_otps ADD COLUMN IF NOT EXISTS phone TEXT;
CREATE INDEX IF NOT EXISTS idx_signup_email_otps_phone ON public.signup_email_otps(phone);