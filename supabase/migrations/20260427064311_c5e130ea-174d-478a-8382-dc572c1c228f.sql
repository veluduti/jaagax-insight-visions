-- 1) New profiles are immediately ACTIVE (no admin approval needed for additional roles).
CREATE OR REPLACE FUNCTION public.enforce_profile_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'active';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

-- 2) Auto-bridge profile -> user_roles so new role works instantly.
CREATE OR REPLACE FUNCTION public.auto_assign_role_on_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_db_role text;
BEGIN
  v_db_role := CASE
    WHEN NEW.type IN ('buyer','seller') THEN 'customer'
    ELSE NEW.type
  END;

  IF v_db_role IN ('customer','agent','builder') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, v_db_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_profiles_enforce_defaults ON public.profiles;
CREATE TRIGGER trg_profiles_enforce_defaults
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_defaults();

DROP TRIGGER IF EXISTS trg_profiles_auto_assign_role ON public.profiles;
CREATE TRIGGER trg_profiles_auto_assign_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_role_on_profile();

-- 3) Auto-approve signup_requests on insert/update so login isn't blocked.
CREATE OR REPLACE FUNCTION public.auto_approve_signup_requests()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.status := 'approved';
  NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_signup_requests_auto_approve ON public.signup_requests;
CREATE TRIGGER trg_signup_requests_auto_approve
  BEFORE INSERT OR UPDATE ON public.signup_requests
  FOR EACH ROW EXECUTE FUNCTION public.auto_approve_signup_requests();

-- 4) Backfill: approve everyone currently pending.
UPDATE public.profiles SET status = 'active', updated_at = now()
WHERE status = 'pending';

UPDATE public.signup_requests SET status = 'approved', reviewed_at = COALESCE(reviewed_at, now()), updated_at = now()
WHERE status = 'pending';

-- 5) Backfill user_roles from existing profiles.
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT p.user_id,
  CASE WHEN p.type IN ('buyer','seller') THEN 'customer' ELSE p.type END
FROM public.profiles p
WHERE CASE WHEN p.type IN ('buyer','seller') THEN 'customer' ELSE p.type END IN ('customer','agent','builder')
ON CONFLICT (user_id, role) DO NOTHING;