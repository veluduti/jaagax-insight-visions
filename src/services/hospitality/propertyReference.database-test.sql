-- Run through the database data-query tool. All property mutations are rolled back.
-- Sequence values are deliberately never reclaimed.
BEGIN;
DO $$
DECLARE a public.partner_hotels%ROWTYPE; b public.partner_hotels%ROWTYPE;
        listing public.properties%ROWTYPE; unchanged text; rejected boolean;
        kind text; expected text;
BEGIN
  FOR kind, expected IN SELECT * FROM (VALUES
    ('hotel','HOT'),('pg','PG'),('resort','RES'),('hostel','HST'),
    ('apartment','APT'),('serviced_apartment','SAP'),('coliving','COL'),
    ('luxury','LUX'),('corporate','COR'),('homestay','HOM'),('farm_stay','FRM'),
    ('villa','VIL'),('guest_house','GST'),('boutique','BTQ'),
    ('private_room','PRM'),('shared_room','SHR'),('other','OTH')
  ) AS cases(kind,expected) LOOP
    IF public.property_reference_prefix(kind) <> expected THEN
      RAISE EXCEPTION 'Wrong prefix for %', kind;
    END IF;
  END LOOP;
  INSERT INTO public.partner_hotels(name,city,locality,is_active,business_types,property_reference)
    VALUES('Property ID rollback QA','Hyderabad','QA',false,ARRAY['hotel'],'JGX-HOT-43344') RETURNING * INTO a;
  INSERT INTO public.partner_hotels(name,city,locality,is_active,business_types)
    VALUES('Property ID rollback QA PG','Hyderabad','QA',false,ARRAY['pg']) RETURNING * INTO b;
  IF a.property_reference !~ '^JGX-HOT-[0-9]{5,}$' OR a.property_reference='JGX-HOT-43344' THEN
    RAISE EXCEPTION 'HOT reference not assigned automatically';
  END IF;
  IF b.property_reference !~ '^JGX-PG-[0-9]{5,}$' THEN RAISE EXCEPTION 'PG reference missing'; END IF;
  IF split_part(b.property_reference,'-',3)::bigint <> split_part(a.property_reference,'-',3)::bigint+1 THEN
    RAISE EXCEPTION 'Property numbers are not sequential';
  END IF;
  UPDATE public.partner_hotels SET name='Renamed QA',business_types=ARRAY['resort'] WHERE id=a.id
    RETURNING property_reference INTO unchanged;
  IF unchanged <> a.property_reference THEN RAISE EXCEPTION 'Property ID changed after type edit'; END IF;
  rejected:=false;
  BEGIN
    UPDATE public.partner_hotels SET property_reference=b.property_reference WHERE id=a.id;
  EXCEPTION WHEN SQLSTATE '22023' THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Manual duplicate update accepted'; END IF;
  rejected:=false;
  BEGIN
    UPDATE public.partner_hotels SET property_reference=NULL WHERE id=a.id;
  EXCEPTION WHEN SQLSTATE '22023' THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Property ID clearing accepted'; END IF;
  IF EXISTS(SELECT property_reference FROM (
    SELECT property_reference FROM public.partner_hotels UNION ALL
    SELECT property_reference FROM public.properties
  ) refs GROUP BY property_reference HAVING count(*)>1) THEN RAISE EXCEPTION 'Duplicate Property IDs'; END IF;
  IF has_sequence_privilege('authenticated','public.property_reference_number_seq','USAGE') OR
     has_sequence_privilege('anon','public.property_reference_number_seq','UPDATE') THEN
    RAISE EXCEPTION 'Sequence can be manipulated by clients';
  END IF;
END $$;
ROLLBACK;