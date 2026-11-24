CREATE TABLE public.partner_mobile_otps (
  user_id uuid PRIMARY KEY,
  phone text NOT NULL,
  otp_hash text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);
GRANT ALL ON public.partner_mobile_otps TO service_role;
ALTER TABLE public.partner_mobile_otps ENABLE ROW LEVEL SECURITY;