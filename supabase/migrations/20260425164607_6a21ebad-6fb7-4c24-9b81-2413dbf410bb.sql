
-- 1. Allow 'seller' in profiles.type and signup_requests.requested_role
-- (Drop existing CHECK if any, then add new one)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'profiles' AND constraint_type = 'CHECK'
      AND constraint_name = 'profiles_type_check'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_type_check;
  END IF;
END$$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_type_check CHECK (type IN ('buyer','seller','agent','builder'));

-- 2. Update profile defaults trigger: ALL roles start as pending
CREATE OR REPLACE FUNCTION public.enforce_profile_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Every newly added role requires admin approval
    NEW.status := 'pending';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_profile_defaults ON public.profiles;
CREATE TRIGGER trg_enforce_profile_defaults
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_defaults();

-- 3. Update submit_signup_request to accept seller
CREATE OR REPLACE FUNCTION public.submit_signup_request(_user_id uuid, _email text, _full_name text, _city text, _requested_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _requested_role NOT IN ('customer', 'buyer', 'seller', 'agent', 'builder') THEN
    RAISE EXCEPTION 'Invalid requested role: %', _requested_role;
  END IF;

  INSERT INTO public.signup_requests (
    user_id, email, full_name, city, requested_role,
    status, rejection_reason, reviewed_by, reviewed_at
  )
  VALUES (
    _user_id, _email, _full_name, _city, _requested_role,
    'pending', NULL, NULL, NULL
  )
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      city = EXCLUDED.city,
      requested_role = EXCLUDED.requested_role,
      status = 'pending',
      rejection_reason = NULL,
      reviewed_by = NULL,
      reviewed_at = NULL,
      updated_at = now();
END;
$function$;

-- 4. Trigger: when a new profile row is inserted, notify all admins
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
BEGIN
  -- Find user email from auth.users (best-effort)
  BEGIN
    SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;
  EXCEPTION WHEN OTHERS THEN
    v_email := NULL;
  END;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id,
    'New ' || INITCAP(NEW.type) || ' role awaiting approval',
    COALESCE(v_email, 'A user') || ' requested the ' || NEW.type || ' role and needs admin approval.',
    'alert', '/admin'
  FROM public.user_roles ur WHERE ur.role = 'admin';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_new_profile ON public.profiles;
CREATE TRIGGER trg_notify_admins_on_new_profile
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_new_profile();

-- 5. Helper RPC: admin approves a profile
CREATE OR REPLACE FUNCTION public.approve_profile(_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_db_role text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can approve profiles';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = _profile_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  UPDATE public.profiles SET status = 'active', updated_at = now() WHERE id = _profile_id;

  -- Map type → db role for legacy user_roles table
  v_db_role := CASE
    WHEN v_profile.type IN ('buyer','seller') THEN 'customer'
    ELSE v_profile.type
  END;

  -- Insert into user_roles (idempotent)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_profile.user_id, v_db_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Notify the user
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (v_profile.user_id,
    INITCAP(v_profile.type) || ' role approved ✅',
    'Your ' || v_profile.type || ' role is now active. You can switch to it from your profile menu.',
    'success', '/dashboard/' || v_profile.type);
END;
$$;

-- 6. Helper RPC: admin rejects a profile
CREATE OR REPLACE FUNCTION public.reject_profile(_profile_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can reject profiles';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = _profile_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  UPDATE public.profiles SET status = 'rejected', updated_at = now() WHERE id = _profile_id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (v_profile.user_id,
    INITCAP(v_profile.type) || ' role rejected',
    COALESCE('Reason: ' || _reason, 'Your ' || v_profile.type || ' role request was rejected.'),
    'alert', '/');
END;
$$;
