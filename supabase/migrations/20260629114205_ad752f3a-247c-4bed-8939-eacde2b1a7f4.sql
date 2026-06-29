
CREATE TABLE IF NOT EXISTS public.phone_login_otps (
  phone TEXT PRIMARY KEY,
  otp_hash TEXT NOT NULL,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.phone_login_otps TO service_role;
-- No anon/authenticated access: only edge functions (service role) read/write.

ALTER TABLE public.phone_login_otps ENABLE ROW LEVEL SECURITY;

-- No policies = no client access (locked down by design).

CREATE INDEX IF NOT EXISTS idx_phone_login_otps_expires ON public.phone_login_otps(expires_at);
