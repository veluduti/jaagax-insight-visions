ALTER TABLE public.hotel_partner_applications ADD COLUMN setup_hotel_id uuid REFERENCES public.partner_hotels(id) ON DELETE CASCADE, ADD COLUMN setup_details jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE UNIQUE INDEX hotel_application_setup_hotel_unique ON public.hotel_partner_applications(setup_hotel_id) WHERE setup_hotel_id IS NOT NULL;
CREATE POLICY "owners read property setup audit" ON public.hospitality_audit_log FOR SELECT TO authenticated USING(entity='property_setup' AND EXISTS(SELECT 1 FROM public.partner_hotels h WHERE h.id=entity_id AND h.manager_id=auth.uid()));
CREATE OR REPLACE FUNCTION public.guard_property_setup_application() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.setup_hotel_id IS NULL THEN RETURN NEW; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.partner_hotels h WHERE h.id=NEW.setup_hotel_id AND h.manager_id=NEW.user_id) THEN RAISE EXCEPTION 'Setup application must belong to its property owner'; END IF;
 IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_admin(auth.uid()) THEN
  IF NEW.user_id IS DISTINCT FROM auth.uid() OR NEW.status NOT IN ('draft','pending','rejected') THEN RAISE EXCEPTION 'Only administrators can approve property verification'; END IF;
  IF TG_OP='UPDATE' AND (NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes OR NEW.approved_hotel_id IS DISTINCT FROM OLD.approved_hotel_id) THEN RAISE EXCEPTION 'Review details are administrator controlled'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_property_setup_application BEFORE INSERT OR UPDATE ON public.hotel_partner_applications FOR EACH ROW EXECUTE FUNCTION public.guard_property_setup_application();
CREATE OR REPLACE FUNCTION public.partner_save_property_setup(_hotel_id uuid,_data jsonb,_submit boolean DEFAULT false) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE h public.partner_hotels%ROWTYPE; a public.hotel_partner_applications%ROWTYPE; p jsonb; b jsonb; d jsonb; meta jsonb; kind text; v text; app_id uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to save property setup'; END IF;
 SELECT * INTO h FROM public.partner_hotels WHERE id=_hotel_id FOR UPDATE;
 IF NOT FOUND OR h.manager_id IS DISTINCT FROM auth.uid() OR h.source_channel='hyperguest' THEN RAISE EXCEPTION 'Only the manual property owner can edit this setup'; END IF;
 IF jsonb_typeof(_data)<>'object' OR octet_length(_data::text)>100000 THEN RAISE EXCEPTION 'Invalid setup data'; END IF;
 p:=COALESCE(_data->'property','{}'); b:=COALESCE(_data->'business','{}'); d:=COALESCE(_data->'documents','{}'); meta:=COALESCE(_data->'settings','{}');
 IF jsonb_typeof(p)<>'object' OR jsonb_typeof(b)<>'object' OR jsonb_typeof(d)<>'object' OR jsonb_typeof(meta)<>'object' THEN RAISE EXCEPTION 'Invalid setup sections'; END IF;
 IF length(COALESCE(p->>'name',''))<2 OR length(p->>'name')>160 OR length(COALESCE(p->>'city',''))<1 THEN RAISE EXCEPTION 'Property name and city are required to save a draft'; END IF;
 IF length(COALESCE(b->>'legal_name',''))>160 OR length(COALESCE(b->>'owner_name',''))>160 OR length(COALESCE(meta->>'notes',''))>500 OR length(COALESCE(p->>'summary',''))>250 THEN RAISE EXCEPTION 'Setup text exceeds allowed length'; END IF;
 IF COALESCE(b->>'pan_number','')<>'' AND b->>'pan_number' !~ '^[A-Z]{5}[0-9]{4}[A-Z]$' THEN RAISE EXCEPTION 'Enter a valid PAN format'; END IF;
 IF COALESCE(b->>'gst_number','')<>'' AND b->>'gst_number' !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$' THEN RAISE EXCEPTION 'Enter a valid GSTIN format'; END IF;
 IF jsonb_typeof(p->'business_types')<>'array' OR jsonb_array_length(p->'business_types')=0 THEN RAISE EXCEPTION 'Select at least one property type'; END IF;
 FOR kind IN SELECT jsonb_array_elements_text(p->'business_types') LOOP IF kind NOT IN ('hotel','resort','hostel','apartment','serviced_apartment','coliving','pg','luxury','corporate','homestay','farm_stay','villa','guest_house','boutique','private_room','shared_room','other') THEN RAISE EXCEPTION 'Invalid property type'; END IF; END LOOP;
 FOR kind,v IN SELECT * FROM jsonb_each_text(d) LOOP
  IF kind NOT IN ('business_registration_url','gst_certificate_url','id_proof_url','identity_proof_url','cancelled_cheque_url','address_proof_url','trade_license_url') OR (v<>'' AND v NOT LIKE auth.uid()::text||'/%') THEN RAISE EXCEPTION 'Invalid private document'; END IF;
 END LOOP;
 SELECT * INTO a FROM public.hotel_partner_applications WHERE setup_hotel_id=_hotel_id FOR UPDATE;
 IF a.status IN ('approved','pending') THEN RAISE EXCEPTION 'This verification submission is locked while reviewed or approved'; END IF;
 IF _submit THEN
  IF COALESCE(b->>'owner_name','')='' OR COALESCE(b->>'legal_name','')='' OR COALESCE(p->>'contact_email','')='' OR COALESCE(p->>'contact_phone','')='' OR COALESCE(p->>'address','')='' OR p->>'latitude' IS NULL OR p->>'longitude' IS NULL THEN RAISE EXCEPTION 'Complete business, contact and mapped location details'; END IF;
  IF COALESCE(jsonb_array_length(p->'images'),0)<3 THEN RAISE EXCEPTION 'Upload at least three property photos'; END IF;
  IF COALESCE(d->>'business_registration_url','')='' OR COALESCE(d->>'identity_proof_url','')='' OR (COALESCE(b->>'gst_number','')<>'' AND COALESCE(d->>'gst_certificate_url','')='') THEN RAISE EXCEPTION 'Upload required business and identity documents'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.hotel_rooms r WHERE r.hotel_id=_hotel_id AND r.is_active IS TRUE AND r.total_units>0 AND (r.base_price>0 OR r.monthly_price>0 OR r.weekly_price>0)) THEN RAISE EXCEPTION 'Add active inventory with a saved price'; END IF;
  IF COALESCE(p->>'check_in_time','')='' OR COALESCE(p->>'check_out_time','')='' OR COALESCE(p->'policies'->>'guest_rules','')='' THEN RAISE EXCEPTION 'Complete property times and guest policies'; END IF;
  IF COALESCE(_data->'bank'->>'account_holder_name','')='' OR COALESCE(_data->'bank'->>'account_number','')='' OR COALESCE(_data->'bank'->>'bank_name','')='' OR COALESCE(_data->'bank'->>'ifsc_code','')='' OR COALESCE(d->>'cancelled_cheque_url','')='' THEN RAISE EXCEPTION 'Complete bank details and upload a cancelled cheque'; END IF;
 END IF;
 UPDATE public.partner_hotels SET name=p->>'name',city=p->>'city',locality=p->>'locality',description=p->>'description',address=p->>'address',state=p->>'state',country=p->>'country',contact_phone=p->>'contact_phone',contact_email=p->>'contact_email',star_rating=NULLIF(p->>'star_rating','')::integer,latitude=NULLIF(p->>'latitude','')::double precision,longitude=NULLIF(p->>'longitude','')::double precision,check_in_time=p->>'check_in_time',check_out_time=p->>'check_out_time',business_types=ARRAY(SELECT jsonb_array_elements_text(p->'business_types')),images=ARRAY(SELECT jsonb_array_elements_text(p->'images')),amenities=ARRAY(SELECT jsonb_array_elements_text(p->'amenities')),policies=COALESCE(h.policies,'{}')||COALESCE(p->'policies','{}'),type_details=COALESCE(h.type_details,'{}')||jsonb_build_object('summary',p->>'summary','brand_name',p->>'brand_name','property_code',p->>'property_code','website',p->>'website'),onboarding_status=CASE WHEN _submit THEN 'pending_review' ELSE h.onboarding_status END,updated_at=now() WHERE id=_hotel_id;
 IF COALESCE(_data->'bank'->>'account_number','')<>'' THEN
  IF _data->'bank'->>'account_number' !~ '^[0-9]{6,24}$' OR _data->'bank'->>'ifsc_code' !~ '^[A-Z]{4}0[A-Z0-9]{6}$' THEN RAISE EXCEPTION 'Enter valid bank account and IFSC details'; END IF;
  INSERT INTO public.hotel_payout_settings(hotel_id,account_holder_name,bank_name,account_number,ifsc_code,upi_id,pan_number,gst_number,payout_frequency) VALUES(_hotel_id,_data->'bank'->>'account_holder_name',_data->'bank'->>'bank_name',_data->'bank'->>'account_number',_data->'bank'->>'ifsc_code',_data->'bank'->>'upi_id',b->>'pan_number',b->>'gst_number','monthly') ON CONFLICT(hotel_id) DO UPDATE SET account_holder_name=EXCLUDED.account_holder_name,bank_name=EXCLUDED.bank_name,account_number=EXCLUDED.account_number,ifsc_code=EXCLUDED.ifsc_code,upi_id=EXCLUDED.upi_id,pan_number=EXCLUDED.pan_number,gst_number=EXCLUDED.gst_number,updated_at=now();
 END IF;
 INSERT INTO public.hotel_partner_applications(id,setup_hotel_id,user_id,hotel_name,owner_name,email,phone,city,locality,business_types,business_type,company_name,country,state,address,gst_number,pan_number,photos,business_registration_url,gst_certificate_url,id_proof_url,identity_proof_url,cancelled_cheque_url,address_proof_url,trade_license_url,bank_account_name,bank_account_number,bank_ifsc,bank_name,status,setup_details)
 VALUES(COALESCE(a.id,gen_random_uuid()),_hotel_id,auth.uid(),p->>'name',COALESCE(b->>'owner_name',''),COALESCE(p->>'contact_email',''),COALESCE(p->>'contact_phone',''),p->>'city',COALESCE(p->>'locality',''),ARRAY(SELECT jsonb_array_elements_text(p->'business_types')),p->'business_types'->>0,b->>'legal_name',p->>'country',p->>'state',p->>'address',b->>'gst_number',b->>'pan_number',ARRAY(SELECT jsonb_array_elements_text(p->'images')),d->>'business_registration_url',d->>'gst_certificate_url',d->>'id_proof_url',d->>'identity_proof_url',d->>'cancelled_cheque_url',d->>'address_proof_url',d->>'trade_license_url',_data->'bank'->>'account_holder_name',_data->'bank'->>'account_number',_data->'bank'->>'ifsc_code',_data->'bank'->>'bank_name',CASE WHEN _submit THEN 'pending' ELSE 'draft' END,jsonb_build_object('business',b,'settings',meta,'bank_extra',jsonb_build_object('account_type',_data->'bank'->>'account_type')))
 ON CONFLICT(id) DO UPDATE SET hotel_name=EXCLUDED.hotel_name,owner_name=EXCLUDED.owner_name,email=EXCLUDED.email,phone=EXCLUDED.phone,city=EXCLUDED.city,locality=EXCLUDED.locality,business_types=EXCLUDED.business_types,business_type=EXCLUDED.business_type,company_name=EXCLUDED.company_name,country=EXCLUDED.country,state=EXCLUDED.state,address=EXCLUDED.address,gst_number=EXCLUDED.gst_number,pan_number=EXCLUDED.pan_number,photos=EXCLUDED.photos,business_registration_url=EXCLUDED.business_registration_url,gst_certificate_url=EXCLUDED.gst_certificate_url,id_proof_url=EXCLUDED.id_proof_url,identity_proof_url=EXCLUDED.identity_proof_url,cancelled_cheque_url=EXCLUDED.cancelled_cheque_url,address_proof_url=EXCLUDED.address_proof_url,trade_license_url=EXCLUDED.trade_license_url,bank_account_name=EXCLUDED.bank_account_name,bank_account_number=EXCLUDED.bank_account_number,bank_ifsc=EXCLUDED.bank_ifsc,bank_name=EXCLUDED.bank_name,status=EXCLUDED.status,setup_details=EXCLUDED.setup_details,updated_at=now() RETURNING id INTO app_id;
 INSERT INTO public.hospitality_audit_log(actor_id,entity,entity_id,action,details) VALUES(auth.uid(),'property_setup',_hotel_id,CASE WHEN _submit THEN 'submitted_for_verification' ELSE 'draft_saved' END,jsonb_build_object('step',meta->'step'));
 RETURN app_id;
END $$;
REVOKE ALL ON FUNCTION public.partner_save_property_setup(uuid,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.partner_save_property_setup(uuid,jsonb,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.handle_hotel_application_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE new_hotel_id uuid;
BEGIN
 IF NEW.status='approved' AND OLD.status<>'approved' THEN
  IF NEW.setup_hotel_id IS NOT NULL THEN
   UPDATE public.partner_hotels SET is_active=true,onboarding_status='published',published_at=COALESCE(published_at,now()),updated_at=now() WHERE id=NEW.setup_hotel_id AND manager_id=NEW.user_id RETURNING id INTO new_hotel_id;
   IF new_hotel_id IS NULL THEN RAISE EXCEPTION 'Setup property does not belong to applicant'; END IF;
  ELSE
   INSERT INTO public.partner_hotels(name,city,locality,address,latitude,longitude,contact_email,contact_phone,total_rooms,price_per_night,check_in_time,check_out_time,amenities,images,manager_id,is_active,description) VALUES(NEW.hotel_name,NEW.city,NEW.locality,NEW.address,NEW.latitude,NEW.longitude,NEW.email,NEW.phone,COALESCE(NEW.total_rooms,10),COALESCE(NEW.price_min,1500),NEW.check_in_time,NEW.check_out_time,NEW.amenities,NEW.photos,NEW.user_id,true,'Verified partner hotel — '||NEW.business_type) RETURNING id INTO new_hotel_id;
  END IF;
  NEW.approved_hotel_id:=new_hotel_id;
  IF NEW.user_id IS NOT NULL THEN INSERT INTO public.notifications(user_id,title,message,type,link) VALUES(NEW.user_id,'🎉 Hotel Partnership Approved',NEW.hotel_name||' is now live as a verified partner hotel.','success','/hotels/'||new_hotel_id); END IF;
 ELSIF NEW.status='rejected' AND OLD.status<>'rejected' THEN
  IF NEW.user_id IS NOT NULL THEN INSERT INTO public.notifications(user_id,title,message,type,link) VALUES(NEW.user_id,'Hotel Partnership Update','Your application for '||NEW.hotel_name||' needs revision: '||COALESCE(NEW.rejection_reason,'See admin notes.'),'alert',CASE WHEN NEW.setup_hotel_id IS NOT NULL THEN '/partners/property-setup?hotel='||NEW.setup_hotel_id ELSE '/hotels/partner/status' END); END IF;
 END IF;
 RETURN NEW;
END $$;