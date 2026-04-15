CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.signup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  full_name text,
  city text,
  requested_role text NOT NULL CHECK (requested_role = ANY (ARRAY['customer'::text, 'agent'::text, 'builder'::text])),
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_signup_requests_status_created_at
ON public.signup_requests (status, created_at DESC);

ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own signup request"
ON public.signup_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all signup requests"
ON public.signup_requests
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update signup requests"
ON public.signup_requests
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_signup_requests_updated_at
BEFORE UPDATE ON public.signup_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.assign_user_role(_user_id uuid, _role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _role NOT IN ('customer', 'agent', 'builder') THEN
    RAISE EXCEPTION 'Invalid role: %', _role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_signup_request(
  _user_id uuid,
  _email text,
  _full_name text,
  _city text,
  _requested_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _requested_role NOT IN ('customer', 'agent', 'builder') THEN
    RAISE EXCEPTION 'Invalid requested role: %', _requested_role;
  END IF;

  INSERT INTO public.signup_requests (
    user_id,
    email,
    full_name,
    city,
    requested_role,
    status,
    rejection_reason,
    reviewed_by,
    reviewed_at
  )
  VALUES (
    _user_id,
    _email,
    _full_name,
    _city,
    _requested_role,
    'pending',
    NULL,
    NULL,
    NULL
  )
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      city = EXCLUDED.city,
      requested_role = EXCLUDED.requested_role,
      status = 'pending',
      rejection_reason = NULL,
      reviewed_by = NULL,
      reviewed_at = NULL,
      updated_at = now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.review_signup_request(
  _request_id uuid,
  _decision text,
  _rejection_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    PERFORM public.assign_user_role(signup_row.user_id, signup_row.requested_role);
  END IF;
END;
$function$;