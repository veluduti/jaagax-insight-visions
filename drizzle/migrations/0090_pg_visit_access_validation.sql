CREATE OR REPLACE FUNCTION public.pg_lead_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.customer_id IS NOT NULL THEN
 IF length(coalesce(NEW.name,'')) NOT BETWEEN 2 AND 100 OR length(coalesce(NEW.email,''))>255 OR octet_length(NEW.journey::text)>10000 THEN RAISE EXCEPTION 'Invalid customer details'; END IF;
 IF NEW.journey->>'kind' IN('application','enquiry') THEN
 IF NOT(NEW.journey ?& ARRAY['room_id','move_in','duration','occupants','plan']) OR NEW.journey->>'move_in' IS NULL OR NEW.journey->>'duration' IS NULL OR NEW.journey->>'occupants' IS NULL OR NEW.journey->>'room_id' IS NULL OR NEW.journey->>'plan' IS NULL THEN RAISE EXCEPTION 'Complete stay details'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND NEW.stage='converted' AND OLD.stage<>'converted' AND (NEW.converted_stay_id IS NULL OR NOT EXISTS(SELECT 1 FROM hotel_long_stays WHERE id=NEW.converted_stay_id AND application_id=NEW.id AND status='active' AND payment_status='paid')) THEN RAISE EXCEPTION 'Customer application converts only after verified payment'; END IF;
 END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.pg_change_visit(_lead_id uuid,_action text,_slot_id uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE l hotel_leads; sl hotel_visit_slots; st text; member boolean; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO l FROM hotel_leads WHERE id=_lead_id FOR UPDATE;
 member:=coalesce(public.is_hotel_member(l.hotel_id,auth.uid()),false);
 IF l.id IS NULL OR NOT(coalesce(l.customer_id=auth.uid(),false) OR member) THEN RAISE EXCEPTION 'Request access denied'; END IF;
 IF _action IN('cancel','reject') THEN
 IF _action='reject' AND NOT member THEN RAISE EXCEPTION 'Owner approval required'; END IF;
 UPDATE hotel_visit_slots SET lead_id=NULL WHERE lead_id=l.id;
 st:=CASE WHEN _action='cancel' THEN 'cancelled' ELSE 'rejected' END;
 ELSIF _action='reschedule' THEN
 SELECT * INTO sl FROM hotel_visit_slots WHERE id=_slot_id AND hotel_id=l.hotel_id FOR UPDATE;
 IF sl.id IS NULL OR NOT sl.is_active OR sl.starts_at<=now() OR (sl.lead_id IS NOT NULL AND sl.lead_id<>l.id) THEN RAISE EXCEPTION 'Slot unavailable'; END IF;
 UPDATE hotel_visit_slots SET lead_id=NULL WHERE lead_id=l.id;
 UPDATE hotel_visit_slots SET lead_id=l.id WHERE id=sl.id; st:='requested';
 ELSIF _action IN('approve','complete') AND member THEN
 IF NOT EXISTS(SELECT 1 FROM hotel_visit_slots WHERE lead_id=l.id) THEN RAISE EXCEPTION 'Choose a slot first'; END IF;
 st:=CASE WHEN _action='approve' THEN 'confirmed' ELSE 'completed' END;
 ELSE RAISE EXCEPTION 'Unsupported visit action'; END IF;
 UPDATE hotel_leads SET visit_at=CASE WHEN _action='reschedule' THEN sl.starts_at ELSE visit_at END,journey=journey||jsonb_build_object('visit_status',st,'slot_id',coalesce(sl.id,(journey->>'slot_id')::uuid)),timeline=timeline||jsonb_build_array(jsonb_build_object('at',now(),'label','Visit '||st)) WHERE id=l.id;
 IF l.customer_id IS NOT NULL THEN INSERT INTO notifications(user_id,title,message,type,link) VALUES(l.customer_id,'Visit '||st,'Your property visit request has been updated','booking','/my-trips?request='||l.id); END IF; END $$;