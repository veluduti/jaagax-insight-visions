CREATE OR REPLACE FUNCTION public.integration_queue_booking_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c record; event_name text;
BEGIN
  event_name:=CASE WHEN NEW.status='cancelled' THEN 'reservation.cancelled' WHEN TG_OP='INSERT' THEN 'reservation.created' ELSE 'reservation.modified' END;
  FOR c IN SELECT * FROM public.hotel_channel_connections WHERE hotel_id=NEW.hotel_id AND is_active=true AND review_status='active' AND direction IN ('outbound','bidirectional') AND channel<>'hyperguest' LOOP
    IF c.channel=NEW.channel OR coalesce((c.settings->>'sync_reservations')::boolean,false)<>true THEN CONTINUE; END IF;
    INSERT INTO public.integration_webhook_deliveries(connection_id,hotel_id,event_type,payload) VALUES(c.id,NEW.hotel_id,event_name,jsonb_build_object('booking',to_jsonb(NEW),'external_property_id',c.channel_property_id));
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS integration_booking_outbox ON public.hotel_bookings;
CREATE TRIGGER integration_booking_outbox AFTER INSERT OR UPDATE ON public.hotel_bookings FOR EACH ROW EXECUTE FUNCTION public.integration_queue_booking_event();

CREATE OR REPLACE FUNCTION public.integration_queue_calendar_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c record;
BEGIN
  FOR c IN SELECT DISTINCT x.* FROM public.hotel_channel_connections x JOIN public.hotel_room_channel_mappings m ON m.connection_id=x.id AND m.room_id=NEW.room_id AND m.sync_enabled=true WHERE x.is_active=true AND x.review_status='active' AND x.direction IN ('outbound','bidirectional') AND x.channel<>'hyperguest' LOOP
    IF coalesce((c.settings->>'sync_rates')::boolean,false)<>true OR c.settings->>'rates_master'<>'jaagax' THEN CONTINUE; END IF;
    INSERT INTO public.integration_webhook_deliveries(connection_id,hotel_id,event_type,payload) VALUES(c.id,NEW.hotel_id,'rates.updated',jsonb_build_object('rows',jsonb_build_array(to_jsonb(NEW))));
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS integration_calendar_outbox ON public.hotel_rate_calendar;
CREATE TRIGGER integration_calendar_outbox AFTER INSERT OR UPDATE ON public.hotel_rate_calendar FOR EACH ROW EXECUTE FUNCTION public.integration_queue_calendar_event();

CREATE OR REPLACE FUNCTION public.integration_queue_availability_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c record; row_data jsonb;
BEGIN
  row_data:=jsonb_build_object('room_id',NEW.room_id,'start_date',NEW.start_date,'end_date',NEW.end_date,'units',NEW.units,'reason',NEW.reason,'booking_id',NEW.booking_id);
  FOR c IN SELECT DISTINCT x.* FROM public.hotel_channel_connections x JOIN public.hotel_room_channel_mappings m ON m.connection_id=x.id AND m.room_id=NEW.room_id AND m.sync_enabled=true WHERE x.is_active=true AND x.review_status='active' AND x.direction IN ('outbound','bidirectional') AND x.channel<>'hyperguest' LOOP
    IF coalesce((c.settings->>'sync_inventory')::boolean,false)<>true OR c.settings->>'inventory_master'<>'jaagax' THEN CONTINUE; END IF;
    INSERT INTO public.integration_webhook_deliveries(connection_id,hotel_id,event_type,payload) VALUES(c.id,NEW.hotel_id,'inventory.updated',jsonb_build_object('change',row_data));
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS integration_availability_outbox ON public.hotel_availability_blocks;
CREATE TRIGGER integration_availability_outbox AFTER INSERT OR UPDATE ON public.hotel_availability_blocks FOR EACH ROW EXECUTE FUNCTION public.integration_queue_availability_event();