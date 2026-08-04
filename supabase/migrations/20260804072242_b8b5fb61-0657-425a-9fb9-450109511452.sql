CREATE TABLE IF NOT EXISTS public.pending_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  email text NOT NULL,
  full_name text,
  country text,
  password text,
  auth_provider text NOT NULL DEFAULT 'email',
  google_user_id uuid,
  otp_hash text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.pending_registrations TO service_role;

ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to pending registrations"
ON public.pending_registrations
FOR ALL
USING (false)
WITH CHECK (false);

CREATE TRIGGER pending_registrations_touch
BEFORE UPDATE ON public.pending_registrations
FOR EACH ROW EXECUTE FUNCTION public.nl_touch_updated_at();
