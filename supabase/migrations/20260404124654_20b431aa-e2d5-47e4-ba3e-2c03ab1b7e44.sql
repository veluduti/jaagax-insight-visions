
-- Fix the hotel_bookings insert policy to be more restrictive
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.hotel_bookings;

CREATE POLICY "Authenticated users can create own bookings" ON public.hotel_bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
