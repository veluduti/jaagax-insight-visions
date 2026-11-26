CREATE SEQUENCE public.property_reference_number_seq AS bigint START WITH 1 NO CYCLE;
REVOKE ALL ON SEQUENCE public.property_reference_number_seq FROM PUBLIC, anon, authenticated;

ALTER TABLE public.partner_hotels ADD COLUMN property_reference text;
ALTER TABLE public.properties ADD COLUMN property_reference text;

CREATE FUNCTION public.property_reference_prefix(_type text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
 SELECT CASE lower(trim(COALESCE(_type,'')))
 WHEN 'hotel' THEN 'HOT' WHEN 'independent hotel' THEN 'HOT' WHEN 'chain / group' THEN 'HOT'
 WHEN 'pg' THEN 'PG' WHEN 'resort' THEN 'RES' WHEN 'hostel' THEN 'HST'
 WHEN 'apartment' THEN 'APT' WHEN 'serviced_apartment' THEN 'SAP' WHEN 'serviced apartments' THEN 'SAP'
 WHEN 'coliving' THEN 'COL' WHEN 'co-living' THEN 'COL' WHEN 'luxury' THEN 'LUX'
 WHEN 'corporate' THEN 'COR' WHEN 'homestay' THEN 'HOM' WHEN 'homestay / b&b' THEN 'HOM'
 WHEN 'farm_stay' THEN 'FRM' WHEN 'villa' THEN 'VIL' WHEN 'guest_house' THEN 'GST'
 WHEN 'boutique' THEN 'BTQ' WHEN 'boutique hotel' THEN 'BTQ' WHEN 'private_room' THEN 'PRM'
 WHEN 'shared_room' THEN 'SHR' WHEN 'plot' THEN 'PLT' WHEN 'plots' THEN 'PLT'
 WHEN 'land' THEN 'LND' WHEN 'agricultural land' THEN 'AGR' WHEN 'agriculture' THEN 'AGR'
 WHEN 'commercial' THEN 'COM' WHEN 'independent house' THEN 'HSE' WHEN 'house' THEN 'HSE'
 ELSE 'OTH' END
$$;

CREATE FUNCTION public.assign_permanent_property_reference() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE kind text; number_value text;
BEGIN
 IF TG_OP='UPDATE' AND OLD.property_reference IS NOT NULL THEN
  IF NEW.property_reference IS DISTINCT FROM OLD.property_reference THEN
   RAISE EXCEPTION 'Property ID is permanent and cannot be changed' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
 END IF;
 IF TG_TABLE_NAME='partner_hotels' THEN
  kind:=COALESCE(NULLIF(NEW.business_types[1],''),NULLIF(NEW.property_type,''),'hotel');
 ELSE
  kind:=NEW.type;
 END IF;
 number_value:=nextval('public.property_reference_number_seq'::regclass)::text;
 NEW.property_reference:='JGX-'||public.property_reference_prefix(kind)||'-'||lpad(number_value,greatest(5,length(number_value)),'0');
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.assign_permanent_property_reference() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER assign_permanent_property_reference BEFORE INSERT OR UPDATE ON public.partner_hotels
FOR EACH ROW EXECUTE FUNCTION public.assign_permanent_property_reference();
CREATE TRIGGER assign_permanent_property_reference BEFORE INSERT OR UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.assign_permanent_property_reference();

UPDATE public.partner_hotels SET property_reference=NULL WHERE property_reference IS NULL;
UPDATE public.properties SET property_reference=NULL WHERE property_reference IS NULL;
CREATE UNIQUE INDEX partner_hotels_property_reference_unique ON public.partner_hotels(property_reference);
CREATE UNIQUE INDEX properties_property_reference_unique ON public.properties(property_reference);
ALTER TABLE public.partner_hotels ADD CONSTRAINT partner_hotels_property_reference_required CHECK (property_reference IS NOT NULL);
ALTER TABLE public.properties ADD CONSTRAINT properties_property_reference_required CHECK (property_reference IS NOT NULL);
COMMENT ON COLUMN public.partner_hotels.property_reference IS 'Permanent server-generated JGX type-prefixed Property ID. UUID primary key and supplier IDs are unchanged. First selected category determines the immutable prefix.';
COMMENT ON COLUMN public.properties.property_reference IS 'Permanent server-generated JGX type-prefixed Property ID. Existing UUID primary key is unchanged.';
COMMENT ON SEQUENCE public.property_reference_number_seq IS 'Shared concurrency-safe increasing property numbers. Never reset or reuse; rollbacks and deleted drafts may leave gaps.';

DO $$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO definition FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='handle_hotel_application_review';
 IF definition IS NULL OR position('manager_id,is_active,description)' IN definition)=0 THEN RAISE EXCEPTION 'Hotel approval definition changed; inspect before updating'; END IF;
 definition:=replace(definition,'manager_id,is_active,description)','manager_id,is_active,description,business_types)');
 definition:=replace(definition,'''Verified partner hotel — ''||NEW.business_type)', '''Verified partner hotel — ''||NEW.business_type,CASE WHEN cardinality(NEW.business_types)>0 THEN NEW.business_types ELSE ARRAY[lower(NEW.business_type)] END)');
 EXECUTE definition;
END $$;