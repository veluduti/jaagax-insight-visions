-- Allow anonymous inserts for testing (no auth session)
CREATE POLICY "Anon can create bookings for testing" ON public.hotel_bookings FOR INSERT TO anon WITH CHECK (true);
-- Allow anon to read bookings for testing
CREATE POLICY "Anon can view bookings for testing" ON public.hotel_bookings FOR SELECT TO anon USING (true);