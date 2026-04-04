-- Fix hotel_bookings SELECT policies: restrict to authenticated only
DROP POLICY IF EXISTS "Users can view their bookings" ON public.hotel_bookings;
CREATE POLICY "Users can view their bookings" ON public.hotel_bookings FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Hotel managers can view bookings for their hotels" ON public.hotel_bookings;
CREATE POLICY "Hotel managers can view bookings for their hotels" ON public.hotel_bookings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM partner_hotels WHERE partner_hotels.id = hotel_bookings.hotel_id AND partner_hotels.manager_id = auth.uid()));

DROP POLICY IF EXISTS "Hotel managers can update bookings for their hotels" ON public.hotel_bookings;
CREATE POLICY "Hotel managers can update bookings for their hotels" ON public.hotel_bookings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM partner_hotels WHERE partner_hotels.id = hotel_bookings.hotel_id AND partner_hotels.manager_id = auth.uid()));

-- Fix ad_interactions: restrict public SELECT to exclude user_ids, replace with authenticated-only full access
DROP POLICY IF EXISTS "Anyone can view ad interactions" ON public.ad_interactions;
CREATE POLICY "Authenticated users can view ad interactions" ON public.ad_interactions FOR SELECT TO authenticated USING (true);

-- Fix user_roles: restrict SELECT to authenticated only
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);