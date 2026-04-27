DO $$
DECLARE
  v_user_id uuid;
  v_existing uuid;
BEGIN
  SELECT id INTO v_existing FROM auth.users WHERE email = 'venkatesh@gmail.com';

  IF v_existing IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated',
      'venkatesh@gmail.com',
      crypt('Venkatesh@123.', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"admin","name":"Venkatesh","requested_role":"admin"}'::jsonb,
      '', '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'venkatesh@gmail.com', 'email_verified', true),
      'email', v_user_id::text, now(), now(), now()
    );
  ELSE
    v_user_id := v_existing;
    UPDATE auth.users
       SET encrypted_password = crypt('Venkatesh@123.', gen_salt('bf')),
           email_confirmed_at = COALESCE(email_confirmed_at, now()),
           updated_at = now()
     WHERE id = v_user_id;
  END IF;

  -- Assign admin role (idempotent)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Approve any signup request for this email so login isn't blocked
  UPDATE public.signup_requests
     SET status = 'approved', reviewed_at = now(), updated_at = now()
   WHERE email = 'venkatesh@gmail.com' AND status <> 'approved';
END $$;