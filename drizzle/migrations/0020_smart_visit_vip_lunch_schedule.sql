ALTER TABLE public.smart_visit_plans
  ADD COLUMN IF NOT EXISTS vip_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_vip numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vip_max_people integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS lunch_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_lunch numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lunch_details text,
  ADD COLUMN IF NOT EXISTS property_schedule jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.smart_visit_bookings
  ADD COLUMN IF NOT EXISTS is_vip boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lunch_opted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lunch_amount numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.smart_visit_booking_extras()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.smart_visit_plans%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' AND NOT public.is_admin(auth.uid()) THEN
    NEW.is_vip := OLD.is_vip; NEW.lunch_opted := OLD.lunch_opted;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.total_amount IS NOT DISTINCT FROM OLD.total_amount
     AND NEW.is_vip = OLD.is_vip AND NEW.lunch_opted = OLD.lunch_opted THEN
    RETURN NEW;
  END IF;
  SELECT * INTO p FROM public.smart_visit_plans WHERE id = NEW.plan_id;
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_vip AND NOT p.vip_available THEN RAISE EXCEPTION 'VIP car is not offered for this visit'; END IF;
    IF NEW.is_vip AND NEW.pickup_type <> 'home' THEN RAISE EXCEPTION 'VIP car needs a home pickup address'; END IF;
    IF NEW.is_vip AND NEW.seats > p.vip_max_people THEN RAISE EXCEPTION 'VIP car fits up to % people', p.vip_max_people; END IF;
    IF NEW.lunch_opted AND NOT p.lunch_available THEN RAISE EXCEPTION 'Lunch is not offered for this visit'; END IF;
  END IF;
  IF NEW.is_vip THEN NEW.price_per_person := p.price_vip; END IF;
  NEW.lunch_amount := CASE WHEN NEW.lunch_opted THEN p.price_lunch * NEW.seats ELSE 0 END;
  NEW.total_amount := (CASE WHEN NEW.is_vip THEN p.price_vip ELSE NEW.price_per_person * NEW.seats END) + NEW.lunch_amount;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS smart_visit_booking_zextras_trg ON public.smart_visit_bookings;
CREATE TRIGGER smart_visit_booking_zextras_trg BEFORE INSERT OR UPDATE ON public.smart_visit_bookings
FOR EACH ROW EXECUTE FUNCTION public.smart_visit_booking_extras();