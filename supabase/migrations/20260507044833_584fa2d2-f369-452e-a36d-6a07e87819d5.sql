CREATE TABLE public.signup_email_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  verified_at TIMESTAMP WITH TIME ZONE,
  consumed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.signup_email_otps ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_signup_email_otps_email ON public.signup_email_otps (email);
CREATE INDEX idx_signup_email_otps_user_id ON public.signup_email_otps (user_id);
CREATE INDEX idx_signup_email_otps_active ON public.signup_email_otps (email, expires_at)
WHERE consumed_at IS NULL AND verified_at IS NULL;

CREATE TRIGGER update_signup_email_otps_updated_at
BEFORE UPDATE ON public.signup_email_otps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();