
-- Manually confirm the user for testing purposes
UPDATE auth.users 
SET email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email = 'buyera@gmail.com';

-- Now insert the user into the public.users table 
INSERT INTO public.users (id, name, email, kyc_status)
VALUES ('9902b185-0234-4235-b7b7-d199069a0ff2', 'Buyer A', 'buyera@gmail.com', 'verified')
ON CONFLICT (id) DO NOTHING;

-- Insert the buyer/customer role
INSERT INTO public.user_roles (user_id, role)
VALUES ('9902b185-0234-4235-b7b7-d199069a0ff2', 'customer')
ON CONFLICT (user_id, role) DO NOTHING;
