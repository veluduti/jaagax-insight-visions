CREATE OR REPLACE FUNCTION public.enforce_buyer_only_weekend_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.buyer_id
      AND role IN ('admin','builder','hotel_manager')
  ) THEN
    RAISE EXCEPTION 'Only buyers and agents can create Weekend Explorer / Quick Visit bookings';
  END IF;
  RETURN NEW;
END;
$function$;