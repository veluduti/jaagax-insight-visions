CREATE SEQUENCE IF NOT EXISTS public.partnership_enquiry_seq;
CREATE TABLE public.partnership_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('JGX-PE-' || lpad(nextval('public.partnership_enquiry_seq')::text, 6, '0')),
  full_name text NOT NULL,
  company_name text NOT NULL,
  partnership_type text NOT NULL CHECK (partnership_type IN ('marketplace','subscription','enterprise','integration')),
  partner_category text,
  cities text NOT NULL,
  mobile text NOT NULL,
  email text NOT NULL,
  message text,
  stage text NOT NULL DEFAULT 'enquiry' CHECK (stage IN ('enquiry','discussion','onboarding','live','approved','rejected')),
  relationship_manager text,
  commercial_model text,
  integration_requirements text,
  onboarding_progress int NOT NULL DEFAULT 0 CHECK (onboarding_progress BETWEEN 0 AND 100),
  admin_notes text,
  submitted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.partnership_enquiries TO authenticated;
GRANT ALL ON public.partnership_enquiries TO service_role;
ALTER TABLE public.partnership_enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read partnership enquiries" ON public.partnership_enquiries FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins update partnership enquiries" ON public.partnership_enquiries FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER partnership_enquiries_touch BEFORE UPDATE ON public.partnership_enquiries FOR EACH ROW EXECUTE FUNCTION public.hotel_touch_updated_at();

CREATE OR REPLACE FUNCTION public.submit_partnership_enquiry(_full_name text, _company text, _type text, _category text, _cities text, _mobile text, _email text, _message text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ref text; _e text := lower(trim(_email));
BEGIN
  IF length(trim(coalesce(_full_name,''))) NOT BETWEEN 2 AND 100 THEN RAISE EXCEPTION 'Enter your full name'; END IF;
  IF length(trim(coalesce(_company,''))) NOT BETWEEN 2 AND 150 THEN RAISE EXCEPTION 'Enter your business name'; END IF;
  IF _type NOT IN ('marketplace','subscription','enterprise','integration') THEN RAISE EXCEPTION 'Choose a partnership type'; END IF;
  IF length(trim(coalesce(_cities,''))) NOT BETWEEN 2 AND 200 THEN RAISE EXCEPTION 'Enter your operating cities'; END IF;
  IF coalesce(_mobile,'') !~ '^\+?[0-9]{10,13}$' THEN RAISE EXCEPTION 'Enter a valid mobile number'; END IF;
  IF _e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(_e) > 255 THEN RAISE EXCEPTION 'Enter a valid email address'; END IF;
  IF length(coalesce(_message,'')) > 1000 OR length(coalesce(_category,'')) > 60 THEN RAISE EXCEPTION 'Input too long'; END IF;
  IF (SELECT count(*) FROM partnership_enquiries WHERE email = _e AND created_at > now() - interval '1 day') >= 3 THEN
    RAISE EXCEPTION 'Too many enquiries today for this email';
  END IF;
  INSERT INTO partnership_enquiries(full_name, company_name, partnership_type, partner_category, cities, mobile, email, message, submitted_by)
  VALUES (trim(_full_name), trim(_company), _type, nullif(trim(_category),''), trim(_cities), _mobile, _e, nullif(trim(_message),''), auth.uid())
  RETURNING reference INTO _ref;
  RETURN _ref;
END $$;

CREATE OR REPLACE FUNCTION public.get_partnership_enquiry_status(_reference text, _email text)
RETURNS TABLE(reference text, company_name text, partnership_type text, stage text, onboarding_progress int, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT reference, company_name, partnership_type, stage, onboarding_progress, created_at, updated_at
  FROM partnership_enquiries WHERE reference = upper(trim(_reference)) AND email = lower(trim(_email)) LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.submit_partnership_enquiry(text,text,text,text,text,text,text,text) FROM public;
REVOKE ALL ON FUNCTION public.get_partnership_enquiry_status(text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_partnership_enquiry(text,text,text,text,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_partnership_enquiry_status(text,text) TO anon, authenticated;