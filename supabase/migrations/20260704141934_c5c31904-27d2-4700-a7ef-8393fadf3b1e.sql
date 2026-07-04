
-- 1. Inventory table
CREATE TABLE public.hotel_room_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  date date NOT NULL,
  available_units integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, date)
);

CREATE INDEX idx_hri_room_date ON public.hotel_room_inventory(room_id, date);
CREATE INDEX idx_hri_hotel_date ON public.hotel_room_inventory(hotel_id, date);

GRANT SELECT ON public.hotel_room_inventory TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hotel_room_inventory TO authenticated;
GRANT ALL ON public.hotel_room_inventory TO service_role;

ALTER TABLE public.hotel_room_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read inventory" ON public.hotel_room_inventory
  FOR SELECT USING (true);

CREATE POLICY "owner or admin write inventory" ON public.hotel_room_inventory
  FOR ALL
  USING (public.user_owns_hotel(hotel_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.user_owns_hotel(hotel_id) OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_hri_updated
  BEFORE UPDATE ON public.hotel_room_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Availability helper (falls back to total_units - confirmed booking overlap
--    when there is no explicit inventory row for a date)
CREATE OR REPLACE FUNCTION public.check_room_availability(
  _room_id uuid,
  _check_in date,
  _check_out date
) RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_hotel uuid;
  v_min int;
  d date;
  v_day_avail int;
  v_confirmed int;
BEGIN
  IF _check_out <= _check_in THEN RETURN 0; END IF;
  SELECT total_units, hotel_id INTO v_total, v_hotel
    FROM public.hotel_rooms WHERE id = _room_id;
  IF v_total IS NULL THEN RETURN 0; END IF;

  v_min := v_total;
  d := _check_in;
  WHILE d < _check_out LOOP
    SELECT available_units INTO v_day_avail
      FROM public.hotel_room_inventory
      WHERE room_id = _room_id AND date = d;

    IF v_day_avail IS NULL THEN
      -- No explicit row → derive from confirmed overlapping bookings
      SELECT COALESCE(SUM(COALESCE(num_rooms,1)), 0) INTO v_confirmed
        FROM public.hotel_bookings
        WHERE hotel_id = v_hotel
          AND status IN ('confirmed','modified')
          AND check_in <= d
          AND check_out > d
          AND (room_type IS NULL OR room_type = (SELECT room_type FROM public.hotel_rooms WHERE id = _room_id));
      v_day_avail := v_total - v_confirmed;
    END IF;

    IF v_day_avail < v_min THEN v_min := v_day_avail; END IF;
    IF v_min <= 0 THEN RETURN 0; END IF;
    d := d + 1;
  END LOOP;
  RETURN GREATEST(v_min, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_room_availability(uuid, date, date) TO anon, authenticated, service_role;

-- 3. Trigger to sync inventory when a booking is confirmed or cancelled
CREATE OR REPLACE FUNCTION public.sync_hotel_inventory_on_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d date;
  v_room_id uuid;
  v_total int;
  v_delta int;
BEGIN
  -- Best-effort: match on room_type text if room_id not present on booking
  SELECT id, total_units INTO v_room_id, v_total
    FROM public.hotel_rooms
    WHERE hotel_id = COALESCE(NEW.hotel_id, OLD.hotel_id)
      AND room_type = COALESCE(NEW.room_type, OLD.room_type)
    LIMIT 1;
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
      VALUES (v_room_id, COALESCE(NEW.hotel_id, OLD.hotel_id), d, v_total + v_delta)
      ON CONFLICT (room_id, date) DO UPDATE
        SET available_units = GREATEST(public.hotel_room_inventory.available_units + v_delta, 0),
            updated_at = now();
    d := d + 1;
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_inventory_on_booking ON public.hotel_bookings;
CREATE TRIGGER trg_sync_inventory_on_booking
  AFTER INSERT OR UPDATE OF status ON public.hotel_bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_hotel_inventory_on_booking();
