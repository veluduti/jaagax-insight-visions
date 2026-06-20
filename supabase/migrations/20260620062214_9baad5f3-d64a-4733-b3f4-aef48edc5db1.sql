
INSERT INTO public.signup_requests (user_id, email, full_name, phone, city, requested_role, status, created_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name'),
  COALESCE(NULLIF(u.raw_user_meta_data->>'phone',''), u.phone),
  u.raw_user_meta_data->>'city',
  COALESCE(NULLIF(u.raw_user_meta_data->>'selected_role',''), NULLIF(u.raw_user_meta_data->>'requested_role',''), 'buyer'),
  'completed',
  u.created_at
FROM auth.users u
LEFT JOIN public.signup_requests s ON s.user_id = u.id
WHERE s.user_id IS NULL
  AND u.email IS NOT NULL
  AND u.email NOT LIKE '%example.test'
  AND u.email NOT LIKE 'debug.%@example.com';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'signup_requests_user_id_unique') THEN
    ALTER TABLE public.signup_requests ADD CONSTRAINT signup_requests_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_signup_request_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.signup_requests (user_id, email, full_name, phone, city, requested_role, status, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'phone',''), NEW.phone),
    NEW.raw_user_meta_data->>'city',
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'selected_role',''), NULLIF(NEW.raw_user_meta_data->>'requested_role',''), 'buyer'),
    'completed',
    NEW.created_at
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.signup_requests.email),
    full_name = COALESCE(EXCLUDED.full_name, public.signup_requests.full_name),
    phone = COALESCE(EXCLUDED.phone, public.signup_requests.phone),
    city = COALESCE(EXCLUDED.city, public.signup_requests.city),
    requested_role = COALESCE(public.signup_requests.requested_role, EXCLUDED.requested_role);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_signup_request_on_auth_insert ON auth.users;
CREATE TRIGGER trg_sync_signup_request_on_auth_insert
AFTER INSERT OR UPDATE OF raw_user_meta_data, email, phone ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_signup_request_from_auth();
