
-- Add phone column to signup_requests for agent registrations
ALTER TABLE public.signup_requests ADD COLUMN IF NOT EXISTS phone text;

-- Update review_signup_request to auto-create agent profile on approval
CREATE OR REPLACE FUNCTION public.review_signup_request(
  _request_id uuid,
  _decision text,
  _rejection_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  signup_row public.signup_requests%ROWTYPE;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can review signup requests';
  END IF;

  IF _decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid decision: %', _decision;
  END IF;

  SELECT *
  INTO signup_row
  FROM public.signup_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signup request not found';
  END IF;

  UPDATE public.signup_requests
  SET status = _decision,
      rejection_reason = CASE WHEN _decision = 'rejected' THEN _rejection_reason ELSE NULL END,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = _request_id;

  IF _decision = 'approved' THEN
    -- Assign the user role
    PERFORM public.assign_user_role(signup_row.user_id, signup_row.requested_role);

    -- Auto-create agent profile if role is agent
    IF signup_row.requested_role = 'agent' THEN
      INSERT INTO public.agents (user_id, name, email, phone, cities_served, verified, trust_score)
      VALUES (
        signup_row.user_id,
        COALESCE(signup_row.full_name, 'Agent'),
        signup_row.email,
        COALESCE(signup_row.phone, '0000000000'),
        COALESCE(signup_row.city, 'Hyderabad'),
        true,
        75
      )
      ON CONFLICT (user_id) DO UPDATE
      SET name = EXCLUDED.name,
          email = EXCLUDED.email,
          verified = true;
    END IF;
  END IF;
END;
$$;

-- Add unique constraint on agents.user_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agents_user_id_unique'
  ) THEN
    ALTER TABLE public.agents ADD CONSTRAINT agents_user_id_unique UNIQUE (user_id);
  END IF;
END $$;
