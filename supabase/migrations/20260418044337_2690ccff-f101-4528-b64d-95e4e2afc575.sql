-- Backfill agent profile for any approved agent users that don't have one
INSERT INTO public.agents (user_id, name, email, phone, cities_served, verified, trust_score)
SELECT 
  sr.user_id,
  COALESCE(sr.full_name, 'Agent'),
  sr.email,
  COALESCE(sr.phone, '0000000000'),
  COALESCE(sr.city, 'Hyderabad'),
  true,
  75
FROM public.signup_requests sr
JOIN public.user_roles ur ON ur.user_id = sr.user_id AND ur.role = 'agent'
WHERE sr.requested_role = 'agent'
  AND sr.status = 'approved'
  AND NOT EXISTS (SELECT 1 FROM public.agents a WHERE a.user_id = sr.user_id);

-- Also backfill for any user with the 'agent' role even without a signup request
INSERT INTO public.agents (user_id, name, phone, cities_served, verified, trust_score)
SELECT 
  ur.user_id,
  'Agent',
  '0000000000',
  'Hyderabad',
  true,
  75
FROM public.user_roles ur
WHERE ur.role = 'agent'
  AND NOT EXISTS (SELECT 1 FROM public.agents a WHERE a.user_id = ur.user_id);

-- Add unique constraint on user_id so the ON CONFLICT in review_signup_request works reliably
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agents_user_id_key'
  ) THEN
    ALTER TABLE public.agents ADD CONSTRAINT agents_user_id_key UNIQUE (user_id);
  END IF;
END $$;