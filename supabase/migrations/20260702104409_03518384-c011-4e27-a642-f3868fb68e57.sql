
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_type_check
  CHECK (type = ANY (ARRAY['buyer','seller','agent','builder','financial','hotel','hotel_manager']));

ALTER TABLE public.signup_requests DROP CONSTRAINT IF EXISTS signup_requests_requested_role_check;
ALTER TABLE public.signup_requests ADD CONSTRAINT signup_requests_requested_role_check
  CHECK (requested_role = ANY (ARRAY['customer','buyer','seller','agent','builder','admin','hotel_manager','driver','financial','hotel']));

CREATE OR REPLACE FUNCTION public.auto_assign_role_on_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_db_role text;
BEGIN
  v_db_role := CASE
    WHEN NEW.type IN ('buyer','seller') THEN 'customer'
    WHEN NEW.type IN ('hotel','hotel_manager') THEN 'hotel_manager'
    ELSE NEW.type
  END;
  IF v_db_role IN ('customer','agent','builder','financial','hotel_manager') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, v_db_role)
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.assign_user_role(_user_id uuid, _role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _role NOT IN ('customer','agent','builder','financial','hotel_manager') THEN
    RAISE EXCEPTION 'Invalid role: %', _role;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
END $$;
