CREATE OR REPLACE FUNCTION public.assert_property_pricing_shape(_content jsonb) RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
DECLARE p jsonb; c jsonb; m jsonb; k text;
BEGIN
 IF _content IS NULL OR jsonb_typeof(_content) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Pricing is required'; END IF;
 FOREACH k IN ARRAY ARRAY['base_price','booking_amount','upfront_discount'] LOOP
  IF jsonb_typeof(_content->k) IS DISTINCT FROM 'number' OR (_content->>k)::numeric NOT BETWEEN 0 AND 1000000000000 THEN RAISE EXCEPTION 'Invalid pricing amount: %',k; END IF;
 END LOOP;
 IF jsonb_typeof(_content->'charges') IS DISTINCT FROM 'array' OR jsonb_typeof(_content->'plans') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Charges and plans must be lists'; END IF;
 FOR c IN SELECT value FROM jsonb_array_elements(_content->'charges') LOOP
  IF jsonb_typeof(c) IS DISTINCT FROM 'object' OR jsonb_typeof(c->'label') IS DISTINCT FROM 'string' OR jsonb_typeof(c->'amount') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Invalid charge'; END IF;
 END LOOP;
 FOR p IN SELECT value FROM jsonb_array_elements(_content->'plans') LOOP
  IF jsonb_typeof(p) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid payment plan'; END IF;
  FOREACH k IN ARRAY ARRAY['kind','name','terms'] LOOP
   IF jsonb_typeof(p->k) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'Missing payment plan field: %',k; END IF;
  END LOOP;
  FOREACH k IN ARRAY ARRAY['extra_charge','interest_rate','loan_amount','down_payment','tenure_months'] LOOP
   IF jsonb_typeof(p->k) IS DISTINCT FROM 'number' OR (p->>k)::numeric NOT BETWEEN 0 AND 1000000000000 THEN RAISE EXCEPTION 'Invalid plan amount: %',k; END IF;
  END LOOP;
  IF jsonb_typeof(p->'milestones') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Payment milestones must be a list'; END IF;
  FOR m IN SELECT value FROM jsonb_array_elements(p->'milestones') LOOP
   IF jsonb_typeof(m) IS DISTINCT FROM 'object' OR jsonb_typeof(m->'label') IS DISTINCT FROM 'string' OR jsonb_typeof(m->'amount') IS DISTINCT FROM 'number' OR (m->>'amount')::numeric NOT BETWEEN 0 AND 1000000000000 OR jsonb_typeof(m->'due_date') IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'Invalid milestone'; END IF;
   IF m->>'due_date'<>'' AND ((m->>'due_date') !~ '^\d{4}-\d{2}-\d{2}$' OR to_char((m->>'due_date')::date,'YYYY-MM-DD')<>m->>'due_date') THEN RAISE EXCEPTION 'Invalid due date'; END IF;
  END LOOP;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.property_pricing_validate_revision() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 PERFORM public.assert_property_pricing_shape(NEW.content);
 PERFORM public.validate_property_pricing(NEW.content);
 RETURN NEW;
END $$;
CREATE TRIGGER property_pricing_validate_revision BEFORE INSERT OR UPDATE OF content ON public.property_pricing_revisions FOR EACH ROW EXECUTE FUNCTION public.property_pricing_validate_revision();
CREATE OR REPLACE FUNCTION public.property_pricing_validate_enquiry() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.customer_name IS NULL OR length(trim(NEW.customer_name)) NOT BETWEEN 1 AND 100 OR NEW.customer_email IS NULL OR NEW.customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR length(NEW.customer_email)>254 OR NEW.customer_phone IS NULL OR NEW.customer_phone !~ '^\+?[0-9 ()-]{7,20}$' OR NEW.message IS NULL OR length(NEW.message)>3000 OR NEW.notes IS NULL OR length(NEW.notes)>5000 THEN RAISE EXCEPTION 'Enter valid customer contact details and notes'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER property_pricing_validate_enquiry BEFORE INSERT OR UPDATE ON public.property_pricing_enquiries FOR EACH ROW EXECUTE FUNCTION public.property_pricing_validate_enquiry();
CREATE OR REPLACE FUNCTION public.property_pricing_creator(_property uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce((SELECT creator_user_id FROM public.property_pricing_revisions WHERE property_id=_property ORDER BY created_at,id LIMIT 1),p.submitted_by,b.user_id) FROM public.properties p LEFT JOIN public.builder_profiles b ON b.id=p.builder_id WHERE p.id=_property
$$;
REVOKE ALL ON FUNCTION public.assert_property_pricing_shape(jsonb),public.property_pricing_validate_revision(),public.property_pricing_validate_enquiry() FROM PUBLIC,anon,authenticated;