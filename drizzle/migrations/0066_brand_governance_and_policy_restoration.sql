CREATE OR REPLACE FUNCTION public.validate_partner_brand_write() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE s jsonb; item record;
BEGIN
IF current_user IN ('authenticated','anon','authenticator') AND (TG_OP='INSERT' AND NEW.brand_settings IS NOT NULL OR TG_OP='UPDATE' AND NEW.brand_settings IS DISTINCT FROM OLD.brand_settings) THEN RAISE EXCEPTION 'Use the authorized brand workflow'; END IF;
IF NEW.brand_settings IS NOT NULL THEN
s:=NEW.brand_settings;
IF jsonb_typeof(s)<>'object' OR octet_length(s::text)>100000 OR coalesce(length(trim(s->>'name')),0) NOT BETWEEN 2 AND 160 OR coalesce(s->>'code','') !~ '^[A-Za-z0-9-]{1,12}$' OR coalesce(s->>'status','') NOT IN ('active','draft') THEN RAISE EXCEPTION 'Invalid brand profile'; END IF;
IF coalesce(s->'shared'->>'check_in','') !~ '^$|^([01][0-9]|2[0-3]):[0-5][0-9]$' OR coalesce(s->'shared'->>'check_out','') !~ '^$|^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN RAISE EXCEPTION 'Invalid check-in or check-out time'; END IF;
FOR item IN SELECT key,value FROM jsonb_each_text(coalesce(s->'policies','{}')) UNION ALL SELECT key,value FROM jsonb_each_text(coalesce(s->'standards','{}')) LOOP IF length(item.key)>100 OR length(item.value)>3000 THEN RAISE EXCEPTION 'Policy or standard exceeds length limit'; END IF; END LOOP;
IF EXISTS(SELECT 1 FROM public.partner_businesses WHERE partner_id=NEW.partner_id AND id<>NEW.id AND brand_settings IS NOT NULL AND (lower(brand_settings->>'code')=lower(s->>'code') OR lower(brand_settings->>'name')=lower(s->>'name'))) THEN RAISE EXCEPTION 'Brand name or code already exists'; END IF;
END IF;RETURN NEW;
END $$;
CREATE TRIGGER validate_partner_brand_write BEFORE INSERT OR UPDATE ON public.partner_businesses FOR EACH ROW EXECUTE FUNCTION public.validate_partner_brand_write();
CREATE OR REPLACE FUNCTION public.guard_direct_brand_mapping() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
IF current_user IN ('authenticated','anon','authenticator') AND (TG_OP='INSERT' AND NEW.brand_id IS NOT NULL OR TG_OP='UPDATE' AND NEW.brand_id IS DISTINCT FROM OLD.brand_id) THEN RAISE EXCEPTION 'Use the authorized brand mapping workflow'; END IF;RETURN NEW;END $$;
CREATE TRIGGER guard_direct_brand_mapping BEFORE INSERT OR UPDATE ON public.partner_hotels FOR EACH ROW EXECUTE FUNCTION public.guard_direct_brand_mapping();
CREATE OR REPLACE FUNCTION public.apply_partner_brand_defaults() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s jsonb; owner_id uuid; snapshot jsonb; old_defaults jsonb; item record; editing boolean:=false;
BEGIN
IF TG_OP='UPDATE' THEN editing:=NEW.policies IS DISTINCT FROM OLD.policies OR NEW.check_in_time IS DISTINCT FROM OLD.check_in_time OR NEW.check_out_time IS DISTINCT FROM OLD.check_out_time;
IF NEW.brand_id IS DISTINCT FROM OLD.brand_id AND OLD.brand_id IS NOT NULL THEN
snapshot:=OLD.type_details->'brand_original';
IF snapshot IS NOT NULL AND coalesce(OLD.type_details->>'brand_override','false')<>'true' THEN NEW.policies:=snapshot->'policies';NEW.check_in_time:=snapshot->>'check_in_time';NEW.check_out_time:=snapshot->>'check_out_time'; END IF;
NEW.type_details:=coalesce(NEW.type_details,'{}')-'brand_original'-'brand_defaults'-'brand_name'-'chain_name';
END IF; END IF;
IF NEW.brand_id IS NULL THEN RETURN NEW; END IF;
SELECT b.brand_settings,a.owner_user_id INTO s,owner_id FROM public.partner_businesses b JOIN public.partner_accounts a ON a.id=b.partner_id WHERE b.id=NEW.brand_id;
IF s IS NULL OR owner_id IS DISTINCT FROM NEW.manager_id THEN RAISE EXCEPTION 'Brand must belong to the property owner'; END IF;
IF NOT (coalesce(NEW.type_details,'{}') ? 'brand_original') THEN NEW.type_details:=coalesce(NEW.type_details,'{}')||jsonb_build_object('brand_original',jsonb_build_object('policies',coalesce(NEW.policies,'{}'),'check_in_time',NEW.check_in_time,'check_out_time',NEW.check_out_time)); END IF;
IF editing AND TG_OP='UPDATE' AND NEW.brand_id=OLD.brand_id AND coalesce(s->'governance'->>'allow_overrides','true')='true' THEN NEW.type_details:=NEW.type_details||jsonb_build_object('brand_override',true); END IF;
IF coalesce(s->'governance'->>'allow_overrides','true')<>'true' THEN NEW.type_details:=NEW.type_details||jsonb_build_object('brand_override',false); END IF;
IF coalesce(s->'governance'->>'use_branding','true')='true' THEN NEW.type_details:=NEW.type_details||jsonb_build_object('brand_name',s->>'name','chain_name',s->>'parent_company'); ELSE NEW.type_details:=NEW.type_details-'brand_name'-'chain_name'; END IF;
IF coalesce(NEW.type_details->>'brand_override','false')<>'true' AND coalesce(NEW.source_channel,'manual')<>'hyperguest' THEN
snapshot:=NEW.type_details->'brand_original';old_defaults:=NEW.type_details->'brand_defaults';
FOR item IN SELECT key FROM jsonb_each(coalesce(old_defaults->'policies','{}')) LOOP
IF snapshot->'policies' ? item.key THEN NEW.policies:=coalesce(NEW.policies,'{}')||jsonb_build_object(item.key,snapshot->'policies'->item.key); ELSE NEW.policies:=coalesce(NEW.policies,'{}')-item.key; END IF;
END LOOP;
IF nullif(old_defaults->'shared'->>'check_in','') IS NOT NULL THEN NEW.check_in_time:=snapshot->>'check_in_time'; END IF;
IF nullif(old_defaults->'shared'->>'check_out','') IS NOT NULL THEN NEW.check_out_time:=snapshot->>'check_out_time'; END IF;
IF s->>'status'='active' THEN
IF coalesce(s->'governance'->>'apply_policies','true')='true' THEN NEW.policies:=coalesce(NEW.policies,'{}')||coalesce(s->'policies','{}'); END IF;
IF nullif(s->'shared'->>'check_in','') IS NOT NULL THEN NEW.check_in_time:=s->'shared'->>'check_in'; END IF;
IF nullif(s->'shared'->>'check_out','') IS NOT NULL THEN NEW.check_out_time:=s->'shared'->>'check_out'; END IF;
END IF;
END IF;
NEW.type_details:=NEW.type_details||jsonb_build_object('brand_defaults',s-'pending');RETURN NEW;
END $$;