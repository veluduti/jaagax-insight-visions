CREATE OR REPLACE FUNCTION public.sync_hotel_business_types()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.approved_hotel_id IS NOT NULL AND coalesce(array_length(NEW.business_types,1),0) > 0 THEN
    UPDATE public.partner_hotels SET business_types = NEW.business_types WHERE id = NEW.approved_hotel_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_sync_hotel_business_types
AFTER INSERT OR UPDATE OF approved_hotel_id, business_types ON public.hotel_partner_applications
FOR EACH ROW EXECUTE FUNCTION public.sync_hotel_business_types();