CREATE OR REPLACE FUNCTION public.autofill_master_location_ids()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r RECORD;
BEGIN
  IF NEW.district_id IS NULL OR NEW.city_id IS NULL THEN
    SELECT * INTO r FROM public.resolve_location_ids(
      NEW.country, NEW.state, NEW.district, NEW.city, (to_jsonb(NEW) ->> 'locality'));
    NEW.country_id  := COALESCE(NEW.country_id,  r.country_id);
    NEW.state_id    := COALESCE(NEW.state_id,    r.state_id);
    NEW.district_id := COALESCE(NEW.district_id, r.district_id);
    NEW.city_id     := COALESCE(NEW.city_id,     r.city_id);
    NEW.locality_id := COALESCE(NEW.locality_id, r.locality_id);
  END IF;
  IF NEW.country_id IS NOT NULL AND (NEW.country IS NULL OR NEW.country='') THEN
    SELECT name INTO NEW.country FROM public.loc_countries WHERE id=NEW.country_id;
  END IF;
  IF NEW.state_id IS NOT NULL AND (NEW.state IS NULL OR NEW.state='') THEN
    SELECT name INTO NEW.state FROM public.loc_states WHERE id=NEW.state_id;
  END IF;
  IF NEW.district_id IS NOT NULL AND (NEW.district IS NULL OR NEW.district='') THEN
    SELECT name INTO NEW.district FROM public.loc_districts WHERE id=NEW.district_id;
  END IF;
  RETURN NEW;
END;
$function$;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_type_check;

-- 1. Merge duplicate buyer/seller/builder profiles per user into one keeper row
DO $$
DECLARE r RECORD; keeper uuid;
BEGIN
  FOR r IN
    SELECT user_id FROM public.profiles
    WHERE type IN ('buyer','seller','builder')
    GROUP BY user_id
  LOOP
    SELECT id INTO keeper FROM public.profiles
      WHERE user_id = r.user_id AND type IN ('buyer','seller','builder')
      ORDER BY CASE type WHEN 'buyer' THEN 1 WHEN 'seller' THEN 2 ELSE 3 END, created_at
      LIMIT 1;

    UPDATE public.user_settings SET active_profile_id = keeper
      WHERE active_profile_id IN (
        SELECT id FROM public.profiles
        WHERE user_id = r.user_id AND type IN ('buyer','seller','builder') AND id <> keeper);

    UPDATE public.buyer_profiles bp SET profile_id = keeper
      WHERE bp.profile_id IN (
        SELECT id FROM public.profiles
        WHERE user_id = r.user_id AND type IN ('buyer','seller','builder') AND id <> keeper)
      AND NOT EXISTS (SELECT 1 FROM public.buyer_profiles x WHERE x.profile_id = keeper);

    UPDATE public.builder_profiles_data bd SET profile_id = keeper
      WHERE bd.profile_id IN (
        SELECT id FROM public.profiles
        WHERE user_id = r.user_id AND type IN ('buyer','seller','builder') AND id <> keeper)
      AND NOT EXISTS (SELECT 1 FROM public.builder_profiles_data x WHERE x.profile_id = keeper);

    DELETE FROM public.profiles
      WHERE user_id = r.user_id AND type IN ('buyer','seller','builder') AND id <> keeper;

    UPDATE public.profiles SET type = 'customer' WHERE id = keeper;
  END LOOP;
END $$;

-- 2. Restrict allowed profile types
ALTER TABLE public.profiles ADD CONSTRAINT profiles_type_check
  CHECK (type = ANY (ARRAY['customer','agent','financial','hotel','hotel_manager']));

-- 3. Collapse user_roles to a single customer role
DELETE FROM public.user_roles ur
WHERE ur.role IN ('buyer','seller','builder')
  AND EXISTS (SELECT 1 FROM public.user_roles x WHERE x.user_id = ur.user_id AND x.role = 'customer');
UPDATE public.user_roles SET role = 'customer' WHERE role IN ('buyer','seller','builder');

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role = ANY (ARRAY['customer','agent','financial','hotel_manager','admin','driver','country_admin','state_admin','district_admin']));

-- 4. Signup requests normalise
UPDATE public.signup_requests SET requested_role = 'customer'
  WHERE requested_role IN ('buyer','seller','builder');
ALTER TABLE public.signup_requests DROP CONSTRAINT IF EXISTS signup_requests_requested_role_check;
ALTER TABLE public.signup_requests ADD CONSTRAINT signup_requests_requested_role_check
  CHECK (requested_role = ANY (ARRAY['customer','agent','admin','hotel_manager','driver','financial','hotel']));

-- 5. RLS: only the customer role is self-assignable on signup
DROP POLICY IF EXISTS "Users can self-assign customer role on signup" ON public.user_roles;
CREATE POLICY "Users can self-assign customer role on signup"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'customer');

-- 6. Functions
CREATE OR REPLACE FUNCTION public.auto_assign_role_on_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_db_role text;
BEGIN
  v_db_role := CASE
    WHEN NEW.type IN ('buyer','seller','builder','customer') THEN 'customer'
    WHEN NEW.type IN ('hotel','hotel_manager') THEN 'hotel_manager'
    ELSE NEW.type
  END;
  IF v_db_role IN ('customer','agent','financial','hotel_manager') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, v_db_role)
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.assign_user_role(_user_id uuid, _role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF _role NOT IN ('customer','agent','financial','hotel_manager') THEN
    RAISE EXCEPTION 'Invalid role: %', _role;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
END $function$;

CREATE OR REPLACE FUNCTION public.enforce_buyer_only_weekend_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.buyer_id AND role IN ('admin','hotel_manager')
  ) THEN
    RAISE EXCEPTION 'Only customers and agents can create Weekend Explorer / Quick Visit bookings';
  END IF;
  RETURN NEW;
END;
$function$;