-- Transactional regression: all fixture mutations roll back, existing bookings are untouched.
BEGIN;
DO $$
DECLARE hotel uuid; room uuid; unit uuid := gen_random_uuid(); before_bookings bigint;
BEGIN
  SELECT count(*) INTO before_bookings FROM public.hotel_bookings;
  SELECT id,hotel_id INTO room,hotel FROM public.hotel_rooms WHERE source_channel IS DISTINCT FROM 'hyperguest' LIMIT 1;
  IF room IS NULL THEN RAISE EXCEPTION 'A manual room is required for this regression'; END IF;
  -- Live total_units is NOT NULL; legacy-null compatibility is covered in inventoryRules.test.ts.
  UPDATE public.hotel_rooms SET total_units=8,number_of_available_rooms=8,is_active=true WHERE id=room;
  IF public.room_free_units(room,'2098-01-01','2098-01-02') <> 8 THEN RAISE EXCEPTION 'Capacity must be 8'; END IF;
  INSERT INTO public.hotel_inventory_units(id,hotel_id,room_id,label,status) VALUES(unit,hotel,room,'Regression ' || unit,'maintenance');
  IF public.room_free_units(room,'2098-01-01','2098-01-02') <> 7 THEN RAISE EXCEPTION 'Maintenance must remove one unit'; END IF;
  INSERT INTO public.hotel_availability_blocks(hotel_id,room_id,unit_id,start_date,end_date,units,reason)
  VALUES(hotel,room,unit,'2098-01-01','2098-01-02',1,'regression');
  IF public.room_free_units(room,'2098-01-01','2098-01-02') <> 7 THEN RAISE EXCEPTION 'Blocked maintenance cannot count twice'; END IF;
  UPDATE public.hotel_inventory_units SET status='active' WHERE id=unit;
  IF public.room_free_units(room,'2098-01-02','2098-01-03') <> 8 THEN RAISE EXCEPTION 'Checkout day must restore capacity'; END IF;
  UPDATE public.hotel_rooms SET is_active=false WHERE id=room;
  IF public.room_free_units(room,'2098-01-02','2098-01-03') <> 0 THEN RAISE EXCEPTION 'Inactive rooms cannot be sold'; END IF;
  IF (SELECT count(*) FROM public.hotel_bookings) <> before_bookings THEN RAISE EXCEPTION 'Bookings changed'; END IF;
END $$;
ROLLBACK;