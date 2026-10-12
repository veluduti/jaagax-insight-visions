CREATE OR REPLACE FUNCTION public.can_organize_events(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role::text IN ('agent','builder'))
    OR EXISTS (SELECT 1 FROM public.agents WHERE user_id = _uid)
    OR EXISTS (SELECT 1 FROM public.builder_profiles WHERE user_id = _uid)
  )
$$;

CREATE OR REPLACE FUNCTION public.event_tickets_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE other numeric;
BEGIN
  IF NEW.kind = 'free' THEN NEW.price := 0; NEW.requires_payment := false; END IF;
  IF NEW.kind IN ('paid','vip') THEN NEW.requires_payment := true; END IF;
  IF NEW.kind = 'vip' THEN
    IF COALESCE(NEW.price,0) <= 0 THEN RAISE EXCEPTION 'VIP tickets must have a price'; END IF;
    SELECT max(price) INTO other FROM public.event_ticket_types WHERE event_id = NEW.event_id AND kind = 'paid' AND id <> NEW.id;
    IF other IS NOT NULL AND NEW.price <= other THEN RAISE EXCEPTION 'VIP ticket must cost more than the General ticket'; END IF;
  END IF;
  IF NEW.kind = 'paid' THEN
    SELECT min(price) INTO other FROM public.event_ticket_types WHERE event_id = NEW.event_id AND kind = 'vip' AND id <> NEW.id;
    IF other IS NOT NULL AND NEW.price >= other THEN RAISE EXCEPTION 'General ticket must cost less than the VIP ticket'; END IF;
  END IF;
  IF NEW.sales_start IS NOT NULL AND NEW.sales_end IS NOT NULL AND NEW.sales_end <= NEW.sales_start THEN
    RAISE EXCEPTION 'Ticket sales end must be after sales start';
  END IF;
  RETURN NEW;
END $$;