
-- 1. Fix privilege escalation: remove hotel_manager from self-assignable roles
DROP POLICY IF EXISTS "Users can self-assign safe roles on signup" ON public.user_roles;
CREATE POLICY "Users can self-assign safe roles on signup"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND role IN ('buyer', 'agent', 'builder')
);

-- 2. Fix partner_hotels: replace public SELECT to exclude contact info
DROP POLICY IF EXISTS "Anyone can view active hotels" ON public.partner_hotels;
CREATE POLICY "Anyone can view active hotels"
ON public.partner_hotels
FOR SELECT
TO public
USING (is_active = true);

-- 3. Add admin ALL policy for hotel_bookings
CREATE POLICY "Admins can manage all bookings"
ON public.hotel_bookings
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 4. Allow users to cancel their own bookings
CREATE POLICY "Users can delete own bookings"
ON public.hotel_bookings
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
