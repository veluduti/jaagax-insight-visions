CREATE OR REPLACE FUNCTION public.smart_stay_booking_visible(_booking_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM smart_stay_bookings b WHERE b.id = _booking_id AND (b.customer_id = _uid OR b.creator_id = _uid))
      OR EXISTS (SELECT 1 FROM smart_stay_reservations r WHERE r.booking_id = _booking_id AND is_hotel_member(r.hotel_id, _uid))
$$;
REVOKE EXECUTE ON FUNCTION public.smart_stay_booking_visible(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.smart_stay_booking_visible(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "bk read" ON public.smart_stay_bookings;
CREATE POLICY "bk read" ON public.smart_stay_bookings FOR SELECT TO authenticated
USING (customer_id = auth.uid() OR creator_id = auth.uid() OR is_admin(auth.uid()) OR public.smart_stay_booking_visible(id, auth.uid()));

DROP POLICY IF EXISTS "res read" ON public.smart_stay_reservations;
CREATE POLICY "res read" ON public.smart_stay_reservations FOR SELECT TO authenticated
USING (is_hotel_member(hotel_id, auth.uid()) OR is_admin(auth.uid()) OR public.smart_stay_booking_visible(booking_id, auth.uid()));

DROP POLICY IF EXISTS "ev read" ON public.smart_stay_events;
CREATE POLICY "ev read" ON public.smart_stay_events FOR SELECT TO authenticated
USING (is_admin(auth.uid())
  OR (booking_id IS NOT NULL AND public.smart_stay_booking_visible(booking_id, auth.uid()))
  OR (smart_stay_id IS NOT NULL AND EXISTS (SELECT 1 FROM smart_stays s WHERE s.id = smart_stay_events.smart_stay_id AND s.creator_id = auth.uid())));