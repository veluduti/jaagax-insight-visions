-- Unpaid bookings older than 20 minutes release their rooms. Called whenever a new
-- quote/booking is made (so freed rooms show immediately) plus an hourly backstop.
CREATE OR REPLACE FUNCTION public.release_expired_payment_holds()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  WITH expired AS (
    UPDATE public.hotel_bookings
       SET status = 'cancelled', cancellation_reason = 'Payment not completed in time'
     WHERE status = 'pending' AND coalesce(payment_status,'pending') IN ('pending','failed')
       AND created_at < now() - interval '20 minutes'
    RETURNING id)
  , del AS (DELETE FROM public.hotel_availability_blocks WHERE booking_id IN (SELECT id FROM expired) RETURNING 1)
  SELECT count(*) INTO n FROM expired;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.release_expired_payment_holds() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_payment_holds() TO service_role;

SELECT cron.schedule('release-expired-payment-holds', '0 * * * *', 'SELECT public.release_expired_payment_holds()');

CREATE POLICY "Hotel staff view bookings" ON public.hotel_bookings FOR SELECT TO authenticated
  USING (public.is_hotel_member(hotel_id, auth.uid()));
CREATE POLICY "Hotel staff update bookings" ON public.hotel_bookings FOR UPDATE TO authenticated
  USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));

CREATE POLICY "Guest reviews own completed stay" ON public.hotel_reviews FOR INSERT TO authenticated
  WITH CHECK (guest_user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.hotel_bookings b WHERE b.id = booking_id AND b.user_id = auth.uid()
      AND b.hotel_id = hotel_reviews.hotel_id AND (b.status = 'checked_out' OR b.check_out <= current_date)));