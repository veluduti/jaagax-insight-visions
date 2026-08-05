CREATE OR REPLACE FUNCTION public.normalize_signup_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.requested_role := CASE
    WHEN NEW.requested_role IN ('agent','admin','hotel_manager','driver','financial','hotel') THEN NEW.requested_role
    ELSE 'customer'
  END;
  IF NEW.status IS NULL OR NEW.status NOT IN ('pending','approved','rejected') THEN
    NEW.status := 'approved';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_signup_request_trg ON public.signup_requests;
CREATE TRIGGER normalize_signup_request_trg
BEFORE INSERT OR UPDATE ON public.signup_requests
FOR EACH ROW EXECUTE FUNCTION public.normalize_signup_request();