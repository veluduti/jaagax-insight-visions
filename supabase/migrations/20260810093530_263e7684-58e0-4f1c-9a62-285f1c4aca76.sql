CREATE OR REPLACE FUNCTION public.sync_hotel_inventory_on_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  d date;
  v_room_id uuid;
  v_total int;
  v_delta int;
  v_hotel uuid := COALESCE(NEW.hotel_id, OLD.hotel_id);
BEGIN
  -- Prefer the exact room booked; fall back to room_type text matching.
  v_room_id := COALESCE(NEW.room_id, OLD.room_id);

  IF v_room_id IS NOT NULL THEN
    SELECT id, total_units INTO v_room_id, v_total
      FROM public.hotel_rooms WHERE id = v_room_id;
  END IF;

  IF v_room_id IS NULL THEN
    SELECT id, total_units INTO v_room_id, v_total
      FROM public.hotel_rooms
      WHERE hotel_id = v_hotel
        AND room_type = COALESCE(NEW.room_type, OLD.room_type)
      LIMIT 1;
  END IF;

  IF v_room_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  IF TG_OP = 'INSERT' AND NEW.status IN ('confirmed','modified') THEN
    v_delta := -COALESCE(NEW.num_rooms, 1);
  ELSIF TG_OP = 'UPDATE' AND OLD.status NOT IN ('confirmed','modified') AND NEW.status IN ('confirmed','modified') THEN
    v_delta := -COALESCE(NEW.num_rooms, 1);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IN ('confirmed','modified') AND NEW.status NOT IN ('confirmed','modified') THEN
    v_delta := COALESCE(OLD.num_rooms, 1);
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  d := COALESCE(NEW.check_in, OLD.check_in);
  WHILE d < COALESCE(NEW.check_out, OLD.check_out) LOOP
    INSERT INTO public.hotel_room_inventory(room_id, hotel_id, date, available_units)
      VALUES (v_room_id, v_hotel, d, GREATEST(COALESCE(v_total,0) + v_delta, 0))
      ON CONFLICT (room_id, date) DO UPDATE
        SET available_units = GREATEST(public.hotel_room_inventory.available_units + v_delta, 0),
            updated_at = now();
    d := d + 1;
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_room_availability(_room_id uuid, _check_in date, _check_out date)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total int;
  v_hotel uuid;
  v_type text;
  v_min int;
  d date;
  v_day_avail int;
  v_confirmed int;
BEGIN
  IF _check_out <= _check_in THEN RETURN 0; END IF;
  SELECT total_units, hotel_id, room_type INTO v_total, v_hotel, v_type
    FROM public.hotel_rooms WHERE id = _room_id;
  IF v_total IS NULL THEN RETURN 0; END IF;

  v_min := v_total;
  d := _check_in;
  WHILE d < _check_out LOOP
    SELECT available_units INTO v_day_avail
      FROM public.hotel_room_inventory
      WHERE room_id = _room_id AND date = d;

    IF v_day_avail IS NULL THEN
      SELECT COALESCE(SUM(COALESCE(num_rooms,1)), 0) INTO v_confirmed
        FROM public.hotel_bookings
        WHERE hotel_id = v_hotel
          AND status IN ('confirmed','modified')
          AND check_in <= d
          AND check_out > d
          AND (
            (room_id IS NOT NULL AND room_id = _room_id)
            OR (room_id IS NULL AND (room_type IS NULL OR room_type = v_type))
          );
      v_day_avail := v_total - v_confirmed;
    END IF;

    IF v_day_avail < v_min THEN v_min := v_day_avail; END IF;
    IF v_min <= 0 THEN RETURN 0; END IF;
    d := d + 1;
  END LOOP;
  RETURN GREATEST(v_min, 0);
END;
$function$;