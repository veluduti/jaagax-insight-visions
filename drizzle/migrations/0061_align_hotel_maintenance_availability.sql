CREATE OR REPLACE FUNCTION public.room_free_units(_room_id uuid, _check_in date, _check_out date)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT COALESCE(MIN(CASE WHEN r.is_active IS FALSE THEN 0 ELSE
 GREATEST(COALESCE(r.total_units,r.number_of_available_rooms,1)
 - COALESCE((SELECT SUM(b.units) FROM public.hotel_availability_blocks b WHERE b.room_id=r.id AND b.start_date<=d::date AND b.end_date>d::date),0)
 - (SELECT COUNT(*) FROM public.hotel_inventory_units u WHERE u.room_id=r.id AND u.status IN ('maintenance','inactive') AND NOT EXISTS (SELECT 1 FROM public.hotel_availability_blocks b WHERE b.unit_id=u.id AND b.room_id=r.id AND b.start_date<=d::date AND b.end_date>d::date)),0) END),0)::integer
 FROM public.hotel_rooms r, generate_series(_check_in,_check_out-1,interval '1 day') d WHERE r.id=_room_id
$$;
GRANT EXECUTE ON FUNCTION public.room_free_units(uuid,date,date) TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.guard_inventory_unit_room() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE hotel uuid;
BEGIN
 IF TG_OP='DELETE' THEN PERFORM 1 FROM public.hotel_rooms WHERE id=OLD.room_id FOR UPDATE; RETURN OLD; END IF;
 IF TG_OP='UPDATE' AND (NEW.room_id IS DISTINCT FROM OLD.room_id OR NEW.hotel_id IS DISTINCT FROM OLD.hotel_id) THEN RAISE EXCEPTION 'Units cannot be moved to another room or property'; END IF;
 SELECT hotel_id INTO hotel FROM public.hotel_rooms WHERE id=NEW.room_id FOR UPDATE;
 IF hotel IS NULL OR hotel IS DISTINCT FROM NEW.hotel_id THEN RAISE EXCEPTION 'Unit must belong to the selected property'; END IF;
 IF NEW.status NOT IN ('active','maintenance','inactive') THEN RAISE EXCEPTION 'Invalid inventory unit status'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER hotel_inventory_unit_room_guard BEFORE INSERT OR UPDATE OR DELETE ON public.hotel_inventory_units FOR EACH ROW EXECUTE FUNCTION public.guard_inventory_unit_room();