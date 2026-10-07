ALTER TABLE public.smart_visit_plans ADD COLUMN IF NOT EXISTS latitude double precision, ADD COLUMN IF NOT EXISTS longitude double precision;

CREATE OR REPLACE FUNCTION public.notify_nearby_on_smart_visit_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _lat double precision := NEW.latitude; _lng double precision := NEW.longitude;
BEGIN
  IF NEW.status <> 'approved' OR (TG_OP = 'UPDATE' AND OLD.status = 'approved') THEN RETURN NEW; END IF;
  IF _lat IS NULL OR _lng IS NULL THEN
    SELECT (location_data->>'latitude')::double precision, (location_data->>'longitude')::double precision
      INTO _lat, _lng FROM profiles WHERE user_id = NEW.agent_user_id AND location_data ? 'latitude' LIMIT 1;
  END IF;
  INSERT INTO notifications (user_id, type, title, message, link, is_read, read)
  SELECT DISTINCT p.user_id, 'visit_reminder', 'New Smart Visit near you',
    NEW.title || ' on ' || to_char(NEW.visit_date, 'Dy, DD Mon') || COALESCE(' · ' || NEW.city, '') || '. Seats are limited — book now.',
    '/smart-visits?plan=' || NEW.id, false, false
  FROM profiles p
  WHERE p.user_id IS NOT NULL AND p.user_id <> NEW.agent_user_id AND p.location_data IS NOT NULL
    AND (
      (_lat IS NOT NULL AND p.location_data ? 'latitude' AND
        6371 * 2 * asin(sqrt(power(sin(radians(((p.location_data->>'latitude')::double precision) - _lat)/2),2)
          + cos(radians(_lat)) * cos(radians((p.location_data->>'latitude')::double precision))
          * power(sin(radians(((p.location_data->>'longitude')::double precision) - _lng)/2),2))) <= 10)
      OR (_lat IS NULL AND NEW.city IS NOT NULL AND lower(p.location_data->>'city') = lower(NEW.city))
    );
  RETURN NEW;
EXCEPTION WHEN others THEN RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_smart_visit_nearby_notify ON public.smart_visit_plans;
CREATE TRIGGER trg_smart_visit_nearby_notify AFTER INSERT OR UPDATE OF status ON public.smart_visit_plans
FOR EACH ROW EXECUTE FUNCTION public.notify_nearby_on_smart_visit_approved();