ALTER TABLE public.partner_businesses ADD COLUMN IF NOT EXISTS brand_settings jsonb;
ALTER TABLE public.partner_hotels ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.partner_businesses(id);
CREATE INDEX IF NOT EXISTS partner_hotels_brand_idx ON public.partner_hotels(brand_id);
CREATE POLICY "owners read brand audit" ON public.hospitality_audit_log FOR SELECT TO authenticated USING(entity='property_brand' AND EXISTS(SELECT 1 FROM public.partner_businesses b JOIN public.partner_accounts a ON a.id=b.partner_id WHERE b.id=entity_id AND a.owner_user_id=auth.uid()));
CREATE OR REPLACE FUNCTION public.partner_brand_action(_partner_id uuid, _action text, _brand_id uuid DEFAULT NULL, _settings jsonb DEFAULT NULL, _hotel_ids uuid[] DEFAULT '{}') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.partner_businesses; s jsonb; owner_id uuid; result_id uuid; h uuid;
BEGIN
SELECT owner_user_id INTO owner_id FROM public.partner_accounts WHERE id=_partner_id;
IF auth.uid() IS NULL OR (owner_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin(auth.uid())) THEN RAISE EXCEPTION 'Brand access denied'; END IF;
IF _brand_id IS NOT NULL THEN SELECT * INTO b FROM public.partner_businesses WHERE id=_brand_id AND partner_id=_partner_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Brand not found'; END IF; END IF;
result_id:=_brand_id;
IF _action='save' THEN
s:=_settings;
IF s IS NULL OR jsonb_typeof(s)<>'object' OR octet_length(s::text)>100000 OR length(trim(s->>'name')) NOT BETWEEN 2 AND 160 OR coalesce(s->>'code','') !~ '^[A-Za-z0-9-]{1,12}$' OR s->>'status' NOT IN ('active','draft') THEN RAISE EXCEPTION 'Invalid brand profile'; END IF;
IF coalesce(s->'shared'->>'check_in','') !~ '^$|^[0-2][0-9]:[0-5][0-9]$' OR coalesce(s->'shared'->>'check_out','') !~ '^$|^[0-2][0-9]:[0-5][0-9]$' THEN RAISE EXCEPTION 'Invalid check-in or check-out time'; END IF;
IF EXISTS(SELECT 1 FROM public.partner_businesses WHERE partner_id=_partner_id AND brand_settings IS NOT NULL AND id IS DISTINCT FROM _brand_id AND (lower(brand_settings->>'code')=lower(s->>'code') OR lower(brand_settings->>'name')=lower(s->>'name'))) THEN RAISE EXCEPTION 'Brand name or code already exists'; END IF;
s:=s-'approval'-'pending';
IF _brand_id IS NULL THEN
s:=s||jsonb_build_object('approval','approved');
INSERT INTO public.partner_businesses(partner_id,legal_name,brand_settings) VALUES(_partner_id,s->>'name',s) RETURNING id INTO result_id;
ELSIF coalesce(b.brand_settings->'governance'->>'require_approval','false')='true' AND NOT public.is_admin(auth.uid()) THEN
UPDATE public.partner_businesses SET brand_settings=b.brand_settings||jsonb_build_object('pending',s,'approval','pending'),updated_at=now() WHERE id=_brand_id;
ELSE UPDATE public.partner_businesses SET brand_settings=s||jsonb_build_object('approval','approved'),updated_at=now() WHERE id=_brand_id; END IF;
ELSIF _action='approve' OR _action='reject' THEN
IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Global Admin approval required'; END IF;
IF b.brand_settings->'pending' IS NULL THEN RAISE EXCEPTION 'No pending brand changes'; END IF;
UPDATE public.partner_businesses SET brand_settings=CASE WHEN _action='approve' THEN (b.brand_settings->'pending')||jsonb_build_object('approval','approved') ELSE (b.brand_settings-'pending')||jsonb_build_object('approval','approved') END,updated_at=now() WHERE id=_brand_id;
ELSIF _action IN ('map','unmap','override','inherit') THEN
IF b.brand_settings IS NULL THEN RAISE EXCEPTION 'Brand not found'; END IF;
IF cardinality(_hotel_ids)=0 OR EXISTS(SELECT 1 FROM unnest(_hotel_ids) i WHERE NOT EXISTS(SELECT 1 FROM public.partner_hotels WHERE id=i AND manager_id=owner_id)) THEN RAISE EXCEPTION 'Choose your own properties'; END IF;
IF _action IN ('override','inherit','unmap') AND EXISTS(SELECT 1 FROM public.partner_hotels WHERE id=ANY(_hotel_ids) AND brand_id IS DISTINCT FROM _brand_id) THEN RAISE EXCEPTION 'Property is not in this brand'; END IF;
IF _action='override' AND coalesce(b.brand_settings->'governance'->>'allow_overrides','true')<>'true' THEN RAISE EXCEPTION 'Brand restricts property overrides'; END IF;
UPDATE public.partner_hotels SET brand_id=CASE WHEN _action='map' THEN _brand_id WHEN _action='unmap' THEN NULL ELSE brand_id END,type_details=coalesce(type_details,'{}')||jsonb_build_object('brand_override',_action='override'),updated_at=now() WHERE id=ANY(_hotel_ids);
ELSIF _action='delete' THEN
IF EXISTS(SELECT 1 FROM public.partner_hotels WHERE brand_id=_brand_id) THEN RAISE EXCEPTION 'Remove mapped properties first'; END IF;
UPDATE public.partner_businesses SET brand_settings=NULL,updated_at=now() WHERE id=_brand_id;
ELSE RAISE EXCEPTION 'Unknown brand action'; END IF;
INSERT INTO public.hospitality_audit_log(actor_id,entity,entity_id,action,details) VALUES(auth.uid(),'property_brand',result_id,'Brand '||_action,jsonb_build_object('properties',_hotel_ids));
IF _action IN ('save','approve') THEN UPDATE public.partner_hotels SET updated_at=now() WHERE brand_id=result_id; END IF;
RETURN result_id;
END $$;
REVOKE ALL ON FUNCTION public.partner_brand_action(uuid,text,uuid,jsonb,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.partner_brand_action(uuid,text,uuid,jsonb,uuid[]) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.apply_partner_brand_defaults() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s jsonb; owner_id uuid; snapshot jsonb; previous jsonb; p jsonb;
BEGIN
IF TG_OP='UPDATE' AND NEW.brand_id IS DISTINCT FROM OLD.brand_id AND OLD.brand_id IS NOT NULL THEN
snapshot:=OLD.type_details->'brand_original';
IF snapshot IS NOT NULL THEN NEW.policies:=snapshot->'policies'; NEW.check_in_time:=snapshot->>'check_in_time';NEW.check_out_time:=snapshot->>'check_out_time'; END IF;
NEW.type_details:=coalesce(NEW.type_details,'{}')-'brand_original'-'brand_defaults'-'brand_name'-'chain_name';
END IF;
IF NEW.brand_id IS NULL THEN RETURN NEW; END IF;
SELECT b.brand_settings,a.owner_user_id INTO s,owner_id FROM public.partner_businesses b JOIN public.partner_accounts a ON a.id=b.partner_id WHERE b.id=NEW.brand_id;
IF s IS NULL OR owner_id IS DISTINCT FROM NEW.manager_id THEN RAISE EXCEPTION 'Brand must belong to the property owner'; END IF;
IF NOT (coalesce(NEW.type_details,'{}') ? 'brand_original') THEN NEW.type_details:=coalesce(NEW.type_details,'{}')||jsonb_build_object('brand_original',jsonb_build_object('policies',coalesce(NEW.policies,'{}'),'check_in_time',NEW.check_in_time,'check_out_time',NEW.check_out_time)); END IF;
IF coalesce(s->'governance'->>'allow_overrides','true')<>'true' THEN NEW.type_details:=NEW.type_details||jsonb_build_object('brand_override',false); END IF;
NEW.type_details:=NEW.type_details||jsonb_build_object('brand_name',s->>'name','chain_name',s->>'parent_company','brand_defaults',s-'pending');
IF s->>'status'='active' AND coalesce(NEW.type_details->>'brand_override','false')<>'true' AND coalesce(NEW.source_channel,'manual') NOT IN ('hyperguest') THEN
p:=coalesce(s->'policies','{}');NEW.policies:=coalesce(NEW.policies,'{}')||p;
IF nullif(s->'shared'->>'check_in','') IS NOT NULL THEN NEW.check_in_time:=s->'shared'->>'check_in'; END IF;
IF nullif(s->'shared'->>'check_out','') IS NOT NULL THEN NEW.check_out_time:=s->'shared'->>'check_out'; END IF;
END IF;
RETURN NEW;
END $$;
CREATE TRIGGER apply_partner_brand_defaults BEFORE INSERT OR UPDATE ON public.partner_hotels FOR EACH ROW EXECUTE FUNCTION public.apply_partner_brand_defaults();