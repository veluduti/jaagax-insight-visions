CREATE OR REPLACE FUNCTION public.sync_signup_request_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requested_role text;
BEGIN
  v_requested_role := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'selected_role', ''),
    NULLIF(NEW.raw_user_meta_data->>'requested_role', ''),
    'customer'
  );

  v_requested_role := CASE
    WHEN v_requested_role IN ('buyer', 'seller', 'builder', 'customer') THEN 'customer'
    WHEN v_requested_role IN ('agent', 'admin', 'hotel_manager', 'driver', 'financial', 'hotel') THEN v_requested_role
    ELSE 'customer'
  END;

  INSERT INTO public.signup_requests (
    user_id, email, full_name, phone, city, requested_role, status, created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'phone', ''), NEW.phone),
    NEW.raw_user_meta_data->>'city',
    v_requested_role,
    'completed',
    NEW.created_at
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.signup_requests.email),
    full_name = COALESCE(EXCLUDED.full_name, public.signup_requests.full_name),
    phone = COALESCE(EXCLUDED.phone, public.signup_requests.phone),
    city = COALESCE(EXCLUDED.city, public.signup_requests.city),
    requested_role = CASE
      WHEN public.signup_requests.requested_role IN ('buyer', 'seller', 'builder') THEN 'customer'
      ELSE COALESCE(public.signup_requests.requested_role, EXCLUDED.requested_role)
    END;

  RETURN NEW;
END;
$$;