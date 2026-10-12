CREATE OR REPLACE FUNCTION public.event_tickets_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.benefits := COALESCE(NEW.benefits, '{}');
  NEW.requires_payment := COALESCE(NEW.requires_payment, NEW.kind <> 'free');
  NEW.max_per_booking := COALESCE(NEW.max_per_booking, 10);
  NEW.price := COALESCE(NEW.price, 0);
  IF NEW.kind = 'free' THEN NEW.price := 0; NEW.requires_payment := false; END IF;
  IF NEW.kind = 'paid' THEN NEW.requires_payment := true; END IF;
  IF NEW.kind = 'vip' AND NEW.price = 0 THEN NEW.requires_payment := false; END IF;
  IF NEW.sales_start IS NOT NULL AND NEW.sales_end IS NOT NULL AND NEW.sales_end <= NEW.sales_start THEN
    RAISE EXCEPTION 'Ticket sales end must be after sales start';
  END IF;
  RETURN NEW;
END $$;