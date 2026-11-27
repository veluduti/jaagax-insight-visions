ALTER TABLE public.hotel_leads ADD COLUMN customer_id uuid, ADD COLUMN journey jsonb NOT NULL DEFAULT '{}';
CREATE INDEX hotel_leads_customer_idx ON public.hotel_leads(customer_id,created_at DESC);
CREATE UNIQUE INDEX hotel_leads_application_code_unique ON public.hotel_leads(application_code) WHERE application_code IS NOT NULL;
DROP POLICY "members manage leads" ON public.hotel_leads;
CREATE POLICY "members and customers read leads" ON public.hotel_leads FOR SELECT TO authenticated USING (customer_id=(select auth.uid()) OR public.is_hotel_member(hotel_id,(select auth.uid())));
CREATE POLICY "members create leads" ON public.hotel_leads FOR INSERT TO authenticated WITH CHECK (public.is_hotel_member(hotel_id,(select auth.uid())));
CREATE POLICY "members update leads" ON public.hotel_leads FOR UPDATE TO authenticated USING (public.is_hotel_member(hotel_id,(select auth.uid()))) WITH CHECK (public.is_hotel_member(hotel_id,(select auth.uid())));
CREATE POLICY "members delete leads" ON public.hotel_leads FOR DELETE TO authenticated USING (public.is_hotel_member(hotel_id,(select auth.uid())));
CREATE TABLE public.hotel_visit_slots (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, visit_type text NOT NULL DEFAULT 'in_person' CHECK(visit_type IN ('in_person','video')), is_active boolean NOT NULL DEFAULT true, lead_id uuid REFERENCES public.hotel_leads(id) ON DELETE SET NULL, video_url text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.hotel_visit_slots TO authenticated;
GRANT ALL ON public.hotel_visit_slots TO service_role;
ALTER TABLE public.hotel_visit_slots ENABLE ROW LEVEL SECURITY;
CREATE INDEX hotel_visit_slots_hotel_time_idx ON public.hotel_visit_slots(hotel_id,starts_at);
CREATE INDEX hotel_visit_slots_lead_idx ON public.hotel_visit_slots(lead_id);
CREATE POLICY "members read visit slots" ON public.hotel_visit_slots FOR SELECT TO authenticated USING(public.is_hotel_member(hotel_id,(select auth.uid())));
CREATE POLICY "members create visit slots" ON public.hotel_visit_slots FOR INSERT TO authenticated WITH CHECK(public.is_hotel_member(hotel_id,(select auth.uid())) AND lead_id IS NULL);
CREATE POLICY "members edit visit slots" ON public.hotel_visit_slots FOR UPDATE TO authenticated USING(public.is_hotel_member(hotel_id,(select auth.uid()))) WITH CHECK(public.is_hotel_member(hotel_id,(select auth.uid())));
CREATE POLICY "members delete unrequested visit slots" ON public.hotel_visit_slots FOR DELETE TO authenticated USING(public.is_hotel_member(hotel_id,(select auth.uid())) AND lead_id IS NULL);
CREATE OR REPLACE FUNCTION public.guard_pg_visit_slot() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 PERFORM 1 FROM public.partner_hotels WHERE id=NEW.hotel_id FOR UPDATE;
 IF NEW.ends_at<=NEW.starts_at OR NEW.ends_at-NEW.starts_at>interval '4 hours' THEN RAISE EXCEPTION 'Visit must last between 1 minute and 4 hours'; END IF;
 IF NEW.is_active AND EXISTS(SELECT 1 FROM public.hotel_visit_slots s WHERE s.hotel_id=NEW.hotel_id AND s.id<>NEW.id AND s.is_active AND tstzrange(s.starts_at,s.ends_at,'[)') && tstzrange(NEW.starts_at,NEW.ends_at,'[)')) THEN RAISE EXCEPTION 'This visit overlaps another appointment'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER guard_pg_visit_slot BEFORE INSERT OR UPDATE ON public.hotel_visit_slots FOR EACH ROW EXECUTE FUNCTION public.guard_pg_visit_slot();
CREATE OR REPLACE FUNCTION public.pg_public_details(_hotel_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM partner_hotels WHERE id=_hotel_id AND is_active) THEN RAISE EXCEPTION 'Property unavailable'; END IF;
 RETURN jsonb_build_object('slots',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'starts_at',starts_at,'ends_at',ends_at,'visit_type',visit_type) ORDER BY starts_at) FROM hotel_visit_slots WHERE hotel_id=_hotel_id AND is_active AND lead_id IS NULL AND starts_at>now()),'[]'::jsonb),'menus',coalesce((SELECT jsonb_agg(jsonb_build_object('meal',meal,'menu_date',menu_date,'weekday',weekday,'items',items,'start_time',start_time,'end_time',end_time)) FROM hotel_meal_menus WHERE hotel_id=_hotel_id AND (menu_date>=current_date OR menu_date IS NULL)),'[]'::jsonb)); END $$;
REVOKE ALL ON FUNCTION public.pg_public_details(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pg_public_details(uuid) TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.pg_submit_request(_hotel_id uuid,_kind text,_details jsonb,_slot_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); lid uuid:=gen_random_uuid(); sl hotel_visit_slots; rid uuid; h partner_hotels; nm text:=trim(_details->>'name'); ph text:=trim(_details->>'phone'); em text:=trim(_details->>'email'); BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
 SELECT * INTO h FROM partner_hotels WHERE id=_hotel_id AND is_active;
 IF h.id IS NULL OR NOT(coalesce(h.business_types,'{}') && ARRAY['pg','hostel','coliving']) THEN RAISE EXCEPTION 'PG or hostel unavailable'; END IF;
 IF _kind NOT IN ('enquiry','visit','application') OR length(coalesce(nm,'')) NOT BETWEEN 2 AND 100 OR coalesce(ph,'') !~ '^\+?[0-9 -]{7,20}$' OR length(coalesce(em,''))>255 OR coalesce(em,'') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR _details->>'consent' IS DISTINCT FROM 'true' OR length(coalesce(_details->>'notes',''))>1000 OR octet_length(_details::text)>10000 THEN RAISE EXCEPTION 'Check your contact details and consent'; END IF;
 IF _kind IN ('enquiry','application') THEN
 IF (_details->>'move_in')::date<current_date OR _details->>'move_in' IS NULL OR (_details->>'duration')::int NOT BETWEEN 1 AND 60 OR (_details->>'occupants')::int NOT BETWEEN 1 AND 10 OR _details->>'plan' NOT IN ('monthly','weekly') THEN RAISE EXCEPTION 'Check stay dates and duration'; END IF;
 rid:=(_details->>'room_id')::uuid;
 IF NOT EXISTS(SELECT 1 FROM hotel_rooms WHERE id=rid AND hotel_id=_hotel_id AND is_active) THEN RAISE EXCEPTION 'Choose an available room type'; END IF;
 END IF;
 IF _kind='application' AND (coalesce((_details->>'age')::int,0) NOT BETWEEN 18 AND 120 OR length(coalesce(_details->>'occupation','')) NOT BETWEEN 1 AND 100 OR length(coalesce(_details->>'emergency_name','')) NOT BETWEEN 2 AND 100 OR coalesce(_details->>'emergency_phone','') !~ '^\+?[0-9 -]{7,20}$') THEN RAISE EXCEPTION 'Complete resident and emergency contact details'; END IF;
 IF _slot_id IS NOT NULL THEN
 SELECT * INTO sl FROM hotel_visit_slots WHERE id=_slot_id AND hotel_id=_hotel_id FOR UPDATE;
 IF sl.id IS NULL OR NOT sl.is_active OR sl.lead_id IS NOT NULL OR sl.starts_at<=now() THEN RAISE EXCEPTION 'This visit slot is no longer available'; END IF;
 ELSIF _kind='visit' THEN RAISE EXCEPTION 'Choose an available visit slot'; END IF;
 INSERT INTO hotel_leads(id,hotel_id,customer_id,created_by,name,phone,email,source,stage,lead_type,preferred_move_in,guests,occupation,company,preferred_unit,notes,visit_at,application_code,journey,timeline)
 VALUES(lid,_hotel_id,uid,uid,nm,ph,em,'website',CASE WHEN _kind='application' THEN 'application' WHEN _slot_id IS NOT NULL THEN 'visit' ELSE 'new' END,CASE WHEN _kind='application' THEN 'application' ELSE 'lead' END,CASE WHEN _kind<>'visit' THEN (_details->>'move_in')::date END,coalesce((_details->>'occupants')::int,1),left(_details->>'occupation',100),left(_details->>'company',200),(SELECT room_type FROM hotel_rooms WHERE id=rid),_details->>'notes',sl.starts_at,upper(CASE _kind WHEN 'enquiry' THEN 'ENQ' WHEN 'visit' THEN 'VIS' ELSE 'APP' END)||'-'||replace(lid::text,'-',''),_details||jsonb_build_object('kind',_kind,'slot_id',_slot_id,'visit_status',CASE WHEN _slot_id IS NOT NULL THEN 'requested' ELSE 'none' END),jsonb_build_array(jsonb_build_object('at',now(),'label',initcap(_kind)||' submitted')));
 IF _slot_id IS NOT NULL THEN UPDATE hotel_visit_slots SET lead_id=lid WHERE id=_slot_id; END IF;
 INSERT INTO notifications(user_id,title,message,type,link) VALUES(uid,initcap(_kind)||' received',h.name||' will review your request','booking','/my-trips?request='||lid);
 IF h.manager_id IS NOT NULL THEN INSERT INTO notifications(user_id,title,message,type,link) VALUES(h.manager_id,'New PG '||_kind,nm||' submitted a request for '||h.name,'booking','/partners/applications?request='||lid); END IF;
 RETURN lid; END $$;
REVOKE ALL ON FUNCTION public.pg_submit_request(uuid,text,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pg_submit_request(uuid,text,jsonb,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.pg_change_visit(_lead_id uuid,_action text,_slot_id uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE l hotel_leads; sl hotel_visit_slots; st text; BEGIN
 SELECT * INTO l FROM hotel_leads WHERE id=_lead_id FOR UPDATE;
 IF l.id IS NULL OR NOT(l.customer_id=auth.uid() OR public.is_hotel_member(l.hotel_id,auth.uid())) THEN RAISE EXCEPTION 'Request access denied'; END IF;
 IF _action='cancel' OR _action='reject' THEN
 IF _action='reject' AND NOT public.is_hotel_member(l.hotel_id,auth.uid()) THEN RAISE EXCEPTION 'Owner approval required'; END IF;
 UPDATE hotel_visit_slots SET lead_id=NULL WHERE lead_id=l.id;
 st:=CASE WHEN _action='cancel' THEN 'cancelled' ELSE 'rejected' END;
 ELSIF _action='reschedule' THEN
 SELECT * INTO sl FROM hotel_visit_slots WHERE id=_slot_id AND hotel_id=l.hotel_id FOR UPDATE;
 IF sl.id IS NULL OR NOT sl.is_active OR sl.starts_at<=now() OR (sl.lead_id IS NOT NULL AND sl.lead_id<>l.id) THEN RAISE EXCEPTION 'Slot unavailable'; END IF;
 UPDATE hotel_visit_slots SET lead_id=NULL WHERE lead_id=l.id;
 UPDATE hotel_visit_slots SET lead_id=l.id WHERE id=sl.id;
 st:='requested';
 ELSIF _action IN ('approve','complete') AND public.is_hotel_member(l.hotel_id,auth.uid()) THEN
 IF NOT EXISTS(SELECT 1 FROM hotel_visit_slots WHERE lead_id=l.id) THEN RAISE EXCEPTION 'Choose a slot first'; END IF;
 st:=CASE WHEN _action='approve' THEN 'confirmed' ELSE 'completed' END;
 ELSE RAISE EXCEPTION 'Unsupported visit action'; END IF;
 UPDATE hotel_leads SET visit_at=CASE WHEN _action='reschedule' THEN sl.starts_at ELSE visit_at END,journey=journey||jsonb_build_object('visit_status',st,'slot_id',coalesce(sl.id,(journey->>'slot_id')::uuid)),timeline=timeline||jsonb_build_array(jsonb_build_object('at',now(),'label','Visit '||st)) WHERE id=l.id;
 INSERT INTO notifications(user_id,title,message,type,link) VALUES(l.customer_id,'Visit '||st,'Your property visit request has been updated','booking','/my-trips?request='||l.id);
 END $$;
REVOKE ALL ON FUNCTION public.pg_change_visit(uuid,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pg_change_visit(uuid,text,uuid) TO authenticated;
ALTER TABLE hotel_long_stays ADD COLUMN application_id uuid REFERENCES hotel_leads(id), ADD COLUMN resident_access_id text UNIQUE, ADD COLUMN resident_access_active boolean NOT NULL DEFAULT false, ADD COLUMN checked_in_at timestamptz;
CREATE INDEX hotel_long_stays_application_idx ON hotel_long_stays(application_id);
CREATE OR REPLACE FUNCTION public.guard_pg_application_payment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE l hotel_leads; BEGIN
 IF TG_OP='INSERT' AND NEW.user_id IS NOT NULL AND NEW.status='pending_payment' THEN
 SELECT * INTO l FROM hotel_leads WHERE customer_id=NEW.user_id AND hotel_id=NEW.hotel_id AND lead_type='application' AND stage='approved' AND journey->>'room_id'=NEW.room_id::text AND (journey->>'move_in')::date=NEW.move_in AND journey->>'plan'=NEW.rent_plan AND (journey->>'duration')::int=NEW.duration AND (journey->>'occupants')::int=NEW.occupants ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF l.id IS NULL THEN RAISE EXCEPTION 'Submit your application and wait for property approval before payment'; END IF;
 IF EXISTS(SELECT 1 FROM (SELECT DISTINCT ON(document_key) document_key,status FROM hotel_lead_documents WHERE lead_id=l.id ORDER BY document_key,created_at DESC,id DESC) d WHERE d.document_key IN('id','photo') AND d.status<>'verified') OR (SELECT count(DISTINCT document_key) FROM hotel_lead_documents WHERE lead_id=l.id AND document_key IN('id','photo'))<2 THEN RAISE EXCEPTION 'Identity and profile photo must be verified before payment'; END IF;
 NEW.application_id:=l.id;
 NEW.resident_access_id:='JX-RES-'||upper(replace(NEW.id::text,'-',''));
 NEW.resident_access_active:=false;
 END IF;
 IF TG_OP='UPDATE' THEN
 IF NEW.resident_access_id IS DISTINCT FROM OLD.resident_access_id OR NEW.application_id IS DISTINCT FROM OLD.application_id THEN RAISE EXCEPTION 'Resident identity is permanent'; END IF;
 IF NEW.resident_access_active AND NOT OLD.resident_access_active THEN
 IF NOT public.is_hotel_member(NEW.hotel_id,auth.uid()) OR NEW.payment_status<>'paid' OR NEW.status<>'active' OR NEW.kyc_status<>'verified' OR NEW.checked_in_at IS NULL OR NEW.move_in>current_date THEN RAISE EXCEPTION 'Manager verified check-in and payment required'; END IF;
 END IF;
 IF NEW.status IN('moved_out','cancelled','expired') THEN NEW.resident_access_active:=false; END IF;
 END IF;
 RETURN NEW; END $$;
CREATE TRIGGER guard_pg_application_payment BEFORE INSERT OR UPDATE ON hotel_long_stays FOR EACH ROW EXECUTE FUNCTION public.guard_pg_application_payment();
CREATE OR REPLACE FUNCTION public.pg_customer_document_access(_lead_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM hotel_leads WHERE id=_lead_id AND customer_id=auth.uid() AND lead_type='application' AND stage NOT IN('converted','dropped')); $$;
REVOKE ALL ON FUNCTION public.pg_customer_document_access(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pg_customer_document_access(uuid) TO authenticated;
ALTER POLICY "property members read lead documents" ON hotel_lead_documents USING(EXISTS(SELECT 1 FROM hotel_leads l WHERE l.id=lead_id AND (l.customer_id=(select auth.uid()) OR public.is_hotel_member(l.hotel_id,(select auth.uid())))));
ALTER POLICY "property members add lead documents" ON hotel_lead_documents WITH CHECK(uploaded_by=(select auth.uid()) AND (public.pg_customer_document_access(lead_id) OR EXISTS(SELECT 1 FROM hotel_leads l WHERE l.id=lead_id AND public.is_hotel_member(l.hotel_id,(select auth.uid())))));
CREATE OR REPLACE FUNCTION public.can_access_lead_document(_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM hotel_leads l WHERE l.hotel_id::text=split_part(_path,'/',1) AND l.id::text=split_part(_path,'/',2) AND (l.customer_id=auth.uid() OR public.is_hotel_member(l.hotel_id,auth.uid())) AND _path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$'); $$;
CREATE OR REPLACE FUNCTION public.guard_hotel_lead_document() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE h uuid; m jsonb; expected_path text; member boolean;
BEGIN
 SELECT hotel_id INTO h FROM hotel_leads WHERE id=NEW.lead_id FOR UPDATE;
 member:=public.is_hotel_member(h,auth.uid());
 IF h IS NULL OR NOT(member OR (TG_OP='INSERT' AND public.pg_customer_document_access(NEW.lead_id))) THEN RAISE EXCEPTION 'Document access denied' USING ERRCODE='42501'; END IF;
 IF TG_OP='INSERT' THEN
 expected_path:=h::text||'/'||NEW.lead_id::text||'/'||NEW.id::text||(CASE NEW.mime_type WHEN 'image/jpeg' THEN '.jpg' WHEN 'image/png' THEN '.png' WHEN 'image/webp' THEN '.webp' ELSE '.pdf' END);
 IF NEW.storage_path<>expected_path THEN RAISE EXCEPTION 'Invalid document path'; END IF;
 SELECT metadata INTO m FROM storage.objects WHERE bucket_id='lead-documents' AND name=NEW.storage_path;
 IF m IS NULL OR (m->>'size')::bigint IS DISTINCT FROM NEW.file_size OR m->>'mimetype' IS DISTINCT FROM NEW.mime_type THEN RAISE EXCEPTION 'Upload a valid document before saving'; END IF;
 NEW.status:='uploaded'; NEW.review_note:=''; NEW.uploaded_by:=auth.uid(); NEW.reviewed_by:=NULL; NEW.reviewed_at:=NULL; NEW.created_at:=now();
 NEW.status_history:=jsonb_build_array(jsonb_build_object('status','uploaded','at',now(),'by',auth.uid(),'note',''));
 ELSE
 IF ROW(NEW.id,NEW.lead_id,NEW.document_key,NEW.storage_path,NEW.file_name,NEW.mime_type,NEW.file_size,NEW.uploaded_by,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.lead_id,OLD.document_key,OLD.storage_path,OLD.file_name,OLD.mime_type,OLD.file_size,OLD.uploaded_by,OLD.created_at) THEN RAISE EXCEPTION 'Document file details cannot be changed'; END IF;
 NEW.status_history:=OLD.status_history; NEW.reviewed_by:=OLD.reviewed_by; NEW.reviewed_at:=OLD.reviewed_at;
 IF NEW.status IS DISTINCT FROM OLD.status OR NEW.review_note IS DISTINCT FROM OLD.review_note THEN
 IF NEW.status='rejected' AND length(trim(NEW.review_note))=0 THEN RAISE EXCEPTION 'Add a reason for rejecting this document'; END IF;
 NEW.reviewed_by:=auth.uid(); NEW.reviewed_at:=now(); NEW.status_history:=OLD.status_history||jsonb_build_array(jsonb_build_object('status',NEW.status,'at',now(),'by',auth.uid(),'note',NEW.review_note)); END IF;
 END IF;
 NEW.updated_at:=now(); RETURN NEW; END $$;