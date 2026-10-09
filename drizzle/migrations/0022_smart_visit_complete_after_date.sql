CREATE OR REPLACE FUNCTION public.smart_visit_block_early_complete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed'
     AND NEW.visit_date::date > (now() AT TIME ZONE 'Asia/Kolkata')::date THEN
    RAISE EXCEPTION 'You can mark this trip completed only after the trip date and time';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS smart_visit_block_early_complete ON public.smart_visit_plans;
CREATE TRIGGER smart_visit_block_early_complete BEFORE UPDATE OF status ON public.smart_visit_plans
FOR EACH ROW EXECUTE FUNCTION public.smart_visit_block_early_complete();