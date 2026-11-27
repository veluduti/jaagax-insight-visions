CREATE OR REPLACE FUNCTION public.pg_activate_resident(_stay_id uuid,_unit_label text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE s hotel_long_stays; BEGIN
 SELECT * INTO s FROM hotel_long_stays WHERE id=_stay_id FOR UPDATE;
 IF s.id IS NULL OR NOT coalesce(public.is_hotel_member(s.hotel_id,auth.uid()),false) THEN RAISE EXCEPTION 'Property access denied'; END IF;
 IF s.application_id IS NULL OR s.payment_status<>'paid' OR s.status<>'active' OR s.move_in>current_date OR length(trim(coalesce(_unit_label,''))) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Confirmed payment, move-in date and bed allocation are required'; END IF;
 IF EXISTS(SELECT 1 FROM (SELECT DISTINCT ON(document_key) document_key,status FROM hotel_lead_documents WHERE lead_id=s.application_id ORDER BY document_key,created_at DESC,id DESC) d WHERE d.document_key IN('id','photo') AND d.status<>'verified') OR (SELECT count(DISTINCT document_key) FROM hotel_lead_documents WHERE lead_id=s.application_id AND document_key IN('id','photo'))<2 THEN RAISE EXCEPTION 'Verify identity and profile photo before check-in'; END IF;
 IF s.resident_access_active THEN RETURN; END IF;
 UPDATE hotel_long_stays SET unit_label=trim(_unit_label),kyc_status='verified',checked_in_at=now(),resident_access_active=true,timeline=timeline||jsonb_build_array(jsonb_build_object('at',now(),'label','Manager verified check-in','by',auth.uid())) WHERE id=s.id;
 INSERT INTO notifications(user_id,title,message,type,link) VALUES(s.user_id,'Resident access active','Your property check-in has been verified','booking','/my-trips'); END $$;
REVOKE ALL ON FUNCTION public.pg_activate_resident(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pg_activate_resident(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.pg_lead_notify() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.customer_id IS NOT NULL AND NEW.stage IS DISTINCT FROM OLD.stage THEN
 INSERT INTO notifications(user_id,title,message,type,link) VALUES(NEW.customer_id,'PG application updated','Application status: '||NEW.stage,'booking','/my-trips?request='||NEW.id);
 END IF; RETURN NEW; END $$;
CREATE TRIGGER pg_lead_notify AFTER UPDATE ON hotel_leads FOR EACH ROW EXECUTE FUNCTION public.pg_lead_notify();
CREATE OR REPLACE FUNCTION public.pg_paid_application_sync() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.application_id IS NOT NULL AND NEW.payment_status='paid' AND NEW.status='active' AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
 UPDATE hotel_leads SET stage='converted',converted_stay_id=NEW.id,timeline=timeline||jsonb_build_array(jsonb_build_object('at',now(),'label','Verified booking confirmed')) WHERE id=NEW.application_id;
 END IF; RETURN NEW; END $$;
CREATE TRIGGER pg_paid_application_sync AFTER UPDATE ON hotel_long_stays FOR EACH ROW EXECUTE FUNCTION public.pg_paid_application_sync();
CREATE OR REPLACE FUNCTION public.guard_pg_application_payment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE l hotel_leads; BEGIN
 IF TG_OP='INSERT' AND NEW.user_id IS NOT NULL AND NEW.status='pending_payment' AND EXISTS(SELECT 1 FROM partner_hotels WHERE id=NEW.hotel_id AND coalesce(business_types,'{}') && ARRAY['pg','hostel']) THEN
 SELECT * INTO l FROM hotel_leads WHERE customer_id=NEW.user_id AND hotel_id=NEW.hotel_id AND lead_type='application' AND stage='approved' AND journey->>'room_id'=NEW.room_id::text AND (journey->>'move_in')::date=NEW.move_in AND journey->>'plan'=NEW.rent_plan AND (journey->>'duration')::int=NEW.duration AND (journey->>'occupants')::int=NEW.occupants ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF l.id IS NULL THEN RAISE EXCEPTION 'Submit your application and wait for property approval before payment'; END IF;
 IF EXISTS(SELECT 1 FROM (SELECT DISTINCT ON(document_key) document_key,status FROM hotel_lead_documents WHERE lead_id=l.id ORDER BY document_key,created_at DESC,id DESC) d WHERE d.document_key IN('id','photo') AND d.status<>'verified') OR (SELECT count(DISTINCT document_key) FROM hotel_lead_documents WHERE lead_id=l.id AND document_key IN('id','photo'))<2 THEN RAISE EXCEPTION 'Identity and profile photo must be verified before payment'; END IF;
 NEW.application_id:=l.id; NEW.resident_access_id:='JX-RES-'||upper(replace(NEW.id::text,'-','')); NEW.resident_access_active:=false;
 END IF;
 IF TG_OP='UPDATE' THEN
 IF NEW.resident_access_id IS DISTINCT FROM OLD.resident_access_id OR NEW.application_id IS DISTINCT FROM OLD.application_id THEN RAISE EXCEPTION 'Resident identity is permanent'; END IF;
 IF NEW.resident_access_active AND NOT OLD.resident_access_active THEN
 IF NOT coalesce(public.is_hotel_member(NEW.hotel_id,auth.uid()),false) OR NEW.payment_status<>'paid' OR NEW.status<>'active' OR NEW.kyc_status<>'verified' OR NEW.checked_in_at IS NULL OR NEW.move_in>current_date THEN RAISE EXCEPTION 'Manager verified check-in and payment required'; END IF; END IF;
 IF NEW.status IN('moved_out','cancelled','expired') THEN NEW.resident_access_active:=false; END IF; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.pg_lead_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.customer_id IS NOT NULL THEN
 IF length(coalesce(NEW.name,'')) NOT BETWEEN 2 AND 100 OR length(coalesce(NEW.email,''))>255 OR octet_length(NEW.journey::text)>10000 THEN RAISE EXCEPTION 'Invalid customer details'; END IF;
 IF NEW.lead_type='application' AND NOT(NEW.journey ?& ARRAY['room_id','move_in','duration','occupants','plan']) THEN RAISE EXCEPTION 'Complete stay details'; END IF;
 IF TG_OP='UPDATE' AND NEW.stage='converted' AND OLD.stage<>'converted' AND (NEW.converted_stay_id IS NULL OR NOT EXISTS(SELECT 1 FROM hotel_long_stays WHERE id=NEW.converted_stay_id AND application_id=NEW.id AND status='active' AND payment_status='paid')) THEN RAISE EXCEPTION 'Customer application converts only after verified payment'; END IF;
 END IF; RETURN NEW; END $$;
CREATE TRIGGER pg_lead_guard BEFORE INSERT OR UPDATE ON hotel_leads FOR EACH ROW EXECUTE FUNCTION public.pg_lead_guard();