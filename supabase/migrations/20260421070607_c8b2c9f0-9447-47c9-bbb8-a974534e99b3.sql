-- Remove stale weekend bookings created by non-buyer (agent/admin/builder) accounts
DELETE FROM public.weekend_booking_activity_log
WHERE booking_id IN (
  SELECT wb.id FROM public.weekend_bookings wb
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = wb.buyer_id
      AND ur.role IN ('agent','admin','builder','hotel_manager')
  )
);

DELETE FROM public.weekend_booking_itinerary
WHERE booking_id IN (
  SELECT wb.id FROM public.weekend_bookings wb
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = wb.buyer_id
      AND ur.role IN ('agent','admin','builder','hotel_manager')
  )
);

DELETE FROM public.weekend_bookings wb
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = wb.buyer_id
    AND ur.role IN ('agent','admin','builder','hotel_manager')
);

-- DB-level guard: prevent any future non-buyer from inserting weekend bookings
CREATE OR REPLACE FUNCTION public.enforce_buyer_only_weekend_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.buyer_id
      AND role IN ('agent','admin','builder','hotel_manager')
  ) THEN
    RAISE EXCEPTION 'Only buyer accounts can create Weekend Explorer bookings';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_buyer_only_weekend ON public.weekend_bookings;
CREATE TRIGGER trg_enforce_buyer_only_weekend
BEFORE INSERT ON public.weekend_bookings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_buyer_only_weekend_booking();