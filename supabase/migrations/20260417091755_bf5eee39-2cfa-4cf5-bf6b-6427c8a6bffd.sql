
DROP POLICY IF EXISTS "Users update own bookings" ON public.hotel_bookings;
CREATE POLICY "Users update own bookings"
ON public.hotel_bookings FOR UPDATE TO authenticated
USING (auth.uid() = user_id);
