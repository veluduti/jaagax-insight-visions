ALTER TABLE public.signup_requests DROP CONSTRAINT IF EXISTS signup_requests_requested_role_check;
ALTER TABLE public.signup_requests ADD CONSTRAINT signup_requests_requested_role_check CHECK (requested_role IN ('customer','seller','agent','builder','admin','hotel_manager','driver'));
UPDATE public.signup_requests SET requested_role = 'seller' WHERE email = 'manirebelms143@gmail.com';