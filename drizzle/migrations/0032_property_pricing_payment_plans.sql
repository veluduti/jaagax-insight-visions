CREATE TABLE public.property_pricing_revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid NOT NULL REFERENCES public.properties(id), creator_user_id uuid NOT NULL, submitted_by uuid NOT NULL, content jsonb NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','superseded')), rejection_reason text, reviewed_by uuid, reviewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.property_pricing_revisions TO authenticated;
GRANT ALL ON public.property_pricing_revisions TO service_role;
ALTER TABLE public.property_pricing_revisions ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.property_pricing_revisions(property_id,created_at DESC);
CREATE UNIQUE INDEX property_pricing_one_pending ON public.property_pricing_revisions(property_id) WHERE status='pending';
CREATE UNIQUE INDEX property_pricing_one_approved ON public.property_pricing_revisions(property_id) WHERE status='approved';
CREATE TABLE public.property_pricing_enquiries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid NOT NULL REFERENCES public.properties(id), revision_id uuid NOT NULL REFERENCES public.property_pricing_revisions(id), creator_user_id uuid NOT NULL, customer_user_id uuid NOT NULL, selected_plan text NOT NULL, plan_snapshot jsonb NOT NULL, customer_name text NOT NULL, customer_email text NOT NULL, customer_phone text NOT NULL, message text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','discussing','closed')), notes text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.property_pricing_enquiries TO authenticated;
GRANT ALL ON public.property_pricing_enquiries TO service_role;
ALTER TABLE public.property_pricing_enquiries ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.property_pricing_enquiries(creator_user_id,created_at DESC);
CREATE TABLE public.property_pricing_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid NOT NULL REFERENCES public.properties(id), revision_id uuid REFERENCES public.property_pricing_revisions(id), enquiry_id uuid REFERENCES public.property_pricing_enquiries(id), actor_user_id uuid NOT NULL, action text NOT NULL, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.property_pricing_history TO authenticated;
GRANT ALL ON public.property_pricing_history TO service_role;
ALTER TABLE public.property_pricing_history ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.property_pricing_creator(_property uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(p.submitted_by,b.user_id) FROM public.properties p LEFT JOIN public.builder_profiles b ON b.id=p.builder_id WHERE p.id=_property
$$;
CREATE OR REPLACE FUNCTION public.can_edit_property_pricing(_property uuid,_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT _user IS NOT NULL AND EXISTS(SELECT 1 FROM public.properties p LEFT JOIN public.builder_profiles b ON b.id=p.builder_id WHERE p.id=_property AND (p.submitted_by=_user OR b.user_id=_user OR EXISTS(SELECT 1 FROM public.agents a WHERE a.user_id=_user AND (a.id=p.assigned_agent_id AND coalesce(p.agent_assignment_status::text,'') NOT IN ('rejected','cancelled') OR EXISTS(SELECT 1 FROM public.assigned_agents aa WHERE aa.property_id=p.id AND aa.agent_id=a.id AND aa.status IN ('accepted','active','assigned'))))))
$$;
CREATE OR REPLACE FUNCTION public.property_pricing_public(_property uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.properties WHERE id=_property AND (verification_status='approved' OR lifecycle_status::text IN ('live','live_verified')) AND is_live=true AND NOT coalesce(is_draft,false) AND NOT coalesce(is_sold,false) AND (expiry_date IS NULL OR expiry_date>now()))
$$;
CREATE POLICY pricing_revision_read ON public.property_pricing_revisions FOR SELECT TO authenticated USING(public.is_global_admin(auth.uid()) OR public.can_edit_property_pricing(property_id,auth.uid()) OR (status='approved' AND public.property_pricing_public(property_id)));
CREATE POLICY pricing_enquiry_read ON public.property_pricing_enquiries FOR SELECT TO authenticated USING(customer_user_id=auth.uid() OR creator_user_id=auth.uid() OR public.is_global_admin(auth.uid()));
CREATE POLICY pricing_history_read ON public.property_pricing_history FOR SELECT TO authenticated USING(public.is_global_admin(auth.uid()) OR public.can_edit_property_pricing(property_id,auth.uid()));
CREATE OR REPLACE FUNCTION public.validate_property_pricing(_content jsonb) RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
DECLARE p jsonb; c jsonb; m jsonb; total numeric; expected numeric; scheduled numeric; kinds text[] := '{}'; amount numeric;
BEGIN
 IF jsonb_typeof(_content)<>'object' OR NOT (_content ?& ARRAY['base_price','booking_amount','upfront_discount','charges','plans']) THEN RAISE EXCEPTION 'Complete pricing details are required'; END IF;
 IF length(_content::text)>100000 THEN RAISE EXCEPTION 'Pricing details are too large'; END IF;
 IF (_content->>'base_price')::numeric<=0 OR (_content->>'base_price')::numeric>1000000000000 OR (_content->>'booking_amount')::numeric<0 OR (_content->>'upfront_discount')::numeric<0 THEN RAISE EXCEPTION 'Invalid pricing amounts'; END IF;
 IF jsonb_typeof(_content->'charges')<>'array' OR jsonb_array_length(_content->'charges')>30 OR jsonb_typeof(_content->'plans')<>'array' OR jsonb_array_length(_content->'plans') NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Select one to five payment methods'; END IF;
 total:=(_content->>'base_price')::numeric;
 FOR c IN SELECT value FROM jsonb_array_elements(_content->'charges') LOOP
  IF length(trim(c->>'label')) NOT BETWEEN 1 AND 100 OR (c->>'amount') IS NULL OR (c->>'amount')::numeric<0 OR (c->>'amount')::numeric>1000000000000 THEN RAISE EXCEPTION 'Invalid additional charge'; END IF;
  total:=total+(c->>'amount')::numeric;
 END LOOP;
 IF (_content->>'booking_amount')::numeric>total OR (_content->>'upfront_discount')::numeric>=total THEN RAISE EXCEPTION 'Booking amount or discount exceeds price'; END IF;
 FOR p IN SELECT value FROM jsonb_array_elements(_content->'plans') LOOP
  IF coalesce(p->>'kind','') NOT IN ('full','loan','construction','installment','custom') OR p->>'kind'=ANY(kinds) OR length(trim(coalesce(p->>'name',''))) NOT BETWEEN 1 AND 100 OR length(coalesce(p->>'terms',''))>5000 THEN RAISE EXCEPTION 'Invalid or duplicate payment method'; END IF;
  kinds:=array_append(kinds,p->>'kind');
  IF (p->>'extra_charge') IS NULL OR (p->>'extra_charge')::numeric<0 OR (p->>'extra_charge')::numeric>1000000000000 OR (p->>'interest_rate') IS NULL OR (p->>'interest_rate')::numeric NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Invalid plan charges or interest'; END IF;
  expected:=total+(p->>'extra_charge')::numeric;
  IF p->>'kind'='full' THEN expected:=expected-(_content->>'upfront_discount')::numeric; END IF;
  IF p->>'kind'='loan' THEN
   IF (p->>'loan_amount') IS NULL OR (p->>'down_payment') IS NULL OR (p->>'loan_amount')::numeric<=0 OR (p->>'down_payment')::numeric<0 OR abs((p->>'loan_amount')::numeric+(p->>'down_payment')::numeric-expected)>1 OR (p->>'tenure_months') IS NULL OR (p->>'tenure_months')::numeric NOT BETWEEN 1 AND 480 OR (p->>'tenure_months')::numeric<>trunc((p->>'tenure_months')::numeric) THEN RAISE EXCEPTION 'Loan and down payment must equal the plan price; tenure must be 1–480 months'; END IF;
  END IF;
  IF jsonb_typeof(p->'milestones')<>'array' OR jsonb_array_length(p->'milestones')>120 THEN RAISE EXCEPTION 'Invalid payment schedule'; END IF;
  scheduled:=0;
  FOR m IN SELECT value FROM jsonb_array_elements(p->'milestones') LOOP
   IF length(trim(coalesce(m->>'label',''))) NOT BETWEEN 1 AND 100 OR (m->>'amount') IS NULL OR (m->>'amount')::numeric<=0 THEN RAISE EXCEPTION 'Each milestone needs a label and positive amount'; END IF;
   IF coalesce(m->>'due_date','')<>'' THEN PERFORM (m->>'due_date')::date; END IF;
   IF p->>'kind'='installment' AND coalesce(m->>'due_date','')='' THEN RAISE EXCEPTION 'Fixed installments require due dates'; END IF;
   scheduled:=scheduled+(m->>'amount')::numeric;
  END LOOP;
  IF p->>'kind' IN ('construction','installment','custom') AND (jsonb_array_length(p->'milestones')=0 OR abs(scheduled-expected)>1) THEN RAISE EXCEPTION 'Schedule amounts must equal the full plan price, including booking and charges'; END IF;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.submit_property_pricing(_property uuid,_content jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); creator uuid; revision uuid; admin_uid uuid;
BEGIN
 IF NOT public.can_edit_property_pricing(_property,uid) THEN RAISE EXCEPTION 'Only the owner/builder or assigned agent can edit this pricing'; END IF;
 PERFORM 1 FROM public.properties WHERE id=_property FOR UPDATE;
 creator:=public.property_pricing_creator(_property); IF creator IS NULL THEN RAISE EXCEPTION 'Property creator is missing; contact admin'; END IF;
 PERFORM public.validate_property_pricing(_content);
 UPDATE public.property_pricing_revisions SET status='superseded' WHERE property_id=_property AND status='pending';
 INSERT INTO public.property_pricing_revisions(property_id,creator_user_id,submitted_by,content) VALUES(_property,creator,uid,_content) RETURNING id INTO revision;
 INSERT INTO public.property_pricing_history(property_id,revision_id,actor_user_id,action,details) VALUES(_property,revision,uid,'submitted',jsonb_build_object('content',_content));
 FOR admin_uid IN SELECT DISTINCT user_id FROM public.user_roles WHERE role::text='admin' UNION SELECT user_id FROM public.admin_scopes WHERE role='global_admin' AND is_active LOOP
  INSERT INTO public.notifications(user_id,type,title,message,link,metadata) VALUES(admin_uid,'property_pricing','Property pricing awaiting approval','Review the new pricing and payment terms.','/admin/property-pricing',jsonb_build_object('property_id',_property,'revision_id',revision));
 END LOOP;
 RETURN revision;
END $$;
CREATE OR REPLACE FUNCTION public.review_property_pricing(_revision uuid,_decision text,_reason text DEFAULT '',_content jsonb DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.property_pricing_revisions; approved_content jsonb; recipient uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_global_admin(auth.uid()) THEN RAISE EXCEPTION 'Global Admin approval is required'; END IF;
 SELECT * INTO r FROM public.property_pricing_revisions WHERE id=_revision;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pricing revision not found'; END IF;
 PERFORM 1 FROM public.properties WHERE id=r.property_id FOR UPDATE;
 SELECT * INTO r FROM public.property_pricing_revisions WHERE id=_revision FOR UPDATE;
 IF r.status<>'pending' THEN RAISE EXCEPTION 'This revision has already been reviewed or replaced'; END IF;
 IF _decision NOT IN ('approved','rejected') OR (_decision='rejected' AND length(trim(_reason)) NOT BETWEEN 1 AND 2000) THEN RAISE EXCEPTION 'Choose approval or provide a rejection reason'; END IF;
 approved_content:=coalesce(_content,r.content); PERFORM public.validate_property_pricing(approved_content);
 IF _decision='approved' THEN UPDATE public.property_pricing_revisions SET status='superseded' WHERE property_id=r.property_id AND status='approved'; END IF;
 UPDATE public.property_pricing_revisions SET status=_decision,content=approved_content,rejection_reason=CASE WHEN _decision='rejected' THEN _reason ELSE NULL END,reviewed_by=auth.uid(),reviewed_at=now() WHERE id=_revision;
 INSERT INTO public.property_pricing_history(property_id,revision_id,actor_user_id,action,details) VALUES(r.property_id,r.id,auth.uid(),_decision,jsonb_build_object('reason',_reason,'before',r.content,'after',approved_content));
 FOR recipient IN SELECT DISTINCT x FROM unnest(ARRAY[r.creator_user_id,r.submitted_by]) x LOOP
  INSERT INTO public.notifications(user_id,type,title,message,link,metadata) VALUES(recipient,'property_pricing','Property pricing '||_decision,CASE WHEN _decision='rejected' THEN _reason ELSE 'Your pricing is approved. It appears once the property is approved and live.' END,'/property-pricing/'||r.property_id,jsonb_build_object('property_id',r.property_id,'revision_id',r.id));
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.create_property_pricing_enquiry(_revision uuid,_plan text,_name text,_email text,_phone text,_message text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.property_pricing_revisions; selected jsonb; eid uuid; uid uuid:=auth.uid();
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Please sign in to enquire'; END IF;
 SELECT * INTO r FROM public.property_pricing_revisions WHERE id=_revision FOR SHARE;
 IF NOT FOUND OR r.status<>'approved' OR NOT public.property_pricing_public(r.property_id) THEN RAISE EXCEPTION 'This payment plan is no longer available; refresh the property'; END IF;
 SELECT value INTO selected FROM jsonb_array_elements(r.content->'plans') WHERE value->>'kind'=_plan;
 IF selected IS NULL THEN RAISE EXCEPTION 'Select an approved payment plan'; END IF;
 IF length(trim(_name)) NOT BETWEEN 1 AND 100 OR _email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR length(_email)>254 OR _phone !~ '^\+?[0-9 ()-]{7,20}$' OR length(_message)>3000 THEN RAISE EXCEPTION 'Enter valid customer contact details'; END IF;
 INSERT INTO public.property_pricing_enquiries(property_id,revision_id,creator_user_id,customer_user_id,selected_plan,plan_snapshot,customer_name,customer_email,customer_phone,message) VALUES(r.property_id,r.id,r.creator_user_id,uid,_plan,jsonb_build_object('pricing',r.content,'selected',selected),trim(_name),trim(_email),trim(_phone),_message) RETURNING id INTO eid;
 INSERT INTO public.property_pricing_history(property_id,revision_id,enquiry_id,actor_user_id,action) VALUES(r.property_id,r.id,eid,uid,'enquiry_received');
 INSERT INTO public.notifications(user_id,type,title,message,link,metadata) VALUES(r.creator_user_id,'property_pricing_enquiry','New payment-plan enquiry',trim(_name)||' enquired about '||(selected->>'name'),'/property-pricing/'||r.property_id,jsonb_build_object('property_id',r.property_id,'enquiry_id',eid));
 INSERT INTO public.notifications(user_id,type,title,message,link,metadata) VALUES(uid,'property_pricing_enquiry','Your enquiry was received','The property creator will contact you to discuss the selected payment plan.','/property/'||r.property_id,jsonb_build_object('property_id',r.property_id,'enquiry_id',eid));
 RETURN eid;
END $$;
CREATE OR REPLACE FUNCTION public.update_property_pricing_enquiry(_enquiry uuid,_status text,_notes text DEFAULT '') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.property_pricing_enquiries;
BEGIN
 SELECT * INTO e FROM public.property_pricing_enquiries WHERE id=_enquiry FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR (e.creator_user_id<>auth.uid() AND NOT public.is_global_admin(auth.uid())) THEN RAISE EXCEPTION 'Only the listing creator can manage this enquiry'; END IF;
 IF _status NOT IN ('new','contacted','discussing','closed') OR length(_notes)>5000 THEN RAISE EXCEPTION 'Invalid enquiry status or notes'; END IF;
 UPDATE public.property_pricing_enquiries SET status=_status,notes=_notes,updated_at=now() WHERE id=_enquiry;
 INSERT INTO public.property_pricing_history(property_id,revision_id,enquiry_id,actor_user_id,action,details) VALUES(e.property_id,e.revision_id,e.id,auth.uid(),'enquiry_status',jsonb_build_object('from',e.status,'to',_status));
END $$;
CREATE OR REPLACE FUNCTION public.list_pricing_properties() RETURNS TABLE(id uuid,title text,type text,area_sqft numeric,price numeric,city text,creator_user_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.id,p.title,p.type,p.area_sqft::numeric,p.price::numeric,p.city,public.property_pricing_creator(p.id) FROM public.properties p WHERE auth.uid() IS NOT NULL AND (public.can_edit_property_pricing(p.id,auth.uid()) OR public.is_global_admin(auth.uid())) ORDER BY p.created_at DESC LIMIT 500
$$;
REVOKE ALL ON FUNCTION public.submit_property_pricing(uuid,jsonb),public.review_property_pricing(uuid,text,text,jsonb),public.create_property_pricing_enquiry(uuid,text,text,text,text,text),public.update_property_pricing_enquiry(uuid,text,text),public.list_pricing_properties() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_property_pricing(uuid,jsonb),public.review_property_pricing(uuid,text,text,jsonb),public.create_property_pricing_enquiry(uuid,text,text,text,text,text),public.update_property_pricing_enquiry(uuid,text,text),public.list_pricing_properties() TO authenticated;
REVOKE ALL ON FUNCTION public.property_pricing_creator(uuid),public.can_edit_property_pricing(uuid,uuid),public.property_pricing_public(uuid),public.validate_property_pricing(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.property_pricing_creator(uuid),public.can_edit_property_pricing(uuid,uuid),public.property_pricing_public(uuid) TO authenticated;
