-- 1) Fix existing profiles where signup_requests.requested_role is 'seller' but profile.type is 'buyer'
UPDATE public.profiles p
SET type = 'seller', updated_at = now()
FROM public.signup_requests sr
WHERE sr.user_id = p.user_id
  AND sr.requested_role = 'seller'
  AND p.type = 'buyer';

-- Activate any seller profiles that should already be approved (their signup_request is approved)
UPDATE public.profiles p
SET status = 'active', updated_at = now()
FROM public.signup_requests sr
WHERE sr.user_id = p.user_id
  AND sr.status = 'approved'
  AND p.type = sr.requested_role
  AND p.status = 'pending';

-- 2) Re-point user_settings.active_profile_id to the (now) seller profile when the user only had one profile
-- (already correct since same row was updated in place)

-- 3) Make signup safe for future: ensure profile created on approval matches requested_role.
-- Update review_signup_request to also create/update a profiles row with the correct type.
CREATE OR REPLACE FUNCTION public.review_signup_request(_request_id uuid, _decision text, _rejection_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  signup_row public.signup_requests%ROWTYPE;
  v_profile_type text;
  v_profile_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can review signup requests';
  END IF;

  IF _decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid decision: %', _decision;
  END IF;

  SELECT * INTO signup_row FROM public.signup_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Signup request not found'; END IF;

  UPDATE public.signup_requests
  SET status = _decision,
      rejection_reason = CASE WHEN _decision = 'rejected' THEN _rejection_reason ELSE NULL END,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = _request_id;

  IF _decision = 'approved' THEN
    -- Map requested_role to profile type
    v_profile_type := CASE
      WHEN signup_row.requested_role = 'customer' THEN 'buyer'
      ELSE signup_row.requested_role
    END;

    -- Ensure a profiles row exists with the correct type and is active
    SELECT id INTO v_profile_id FROM public.profiles
    WHERE user_id = signup_row.user_id AND type = v_profile_type;

    IF v_profile_id IS NULL THEN
      INSERT INTO public.profiles (user_id, type, status)
      VALUES (signup_row.user_id, v_profile_type, 'active')
      RETURNING id INTO v_profile_id;
    ELSE
      UPDATE public.profiles SET status = 'active', updated_at = now() WHERE id = v_profile_id;
    END IF;

    -- Set as active profile
    INSERT INTO public.user_settings (user_id, active_profile_id, updated_at)
    VALUES (signup_row.user_id, v_profile_id, now())
    ON CONFLICT (user_id) DO UPDATE SET active_profile_id = EXCLUDED.active_profile_id, updated_at = now();

    -- Legacy user_roles bridge
    PERFORM public.assign_user_role(
      signup_row.user_id,
      CASE WHEN signup_row.requested_role IN ('buyer','seller') THEN 'customer' ELSE signup_row.requested_role END
    );

    IF signup_row.requested_role = 'agent' THEN
      INSERT INTO public.agents (user_id, name, email, phone, cities_served, verified, trust_score)
      VALUES (signup_row.user_id, COALESCE(signup_row.full_name, 'Agent'), signup_row.email,
              COALESCE(signup_row.phone, '0000000000'), COALESCE(signup_row.city, 'Hyderabad'), true, 75)
      ON CONFLICT (user_id) DO UPDATE
      SET name = EXCLUDED.name, email = EXCLUDED.email, verified = true;
    END IF;
  END IF;
END;
$function$;