
-- Allow public read on signup_requests for admin dashboard
CREATE POLICY "Public can view all signup requests"
ON public.signup_requests
FOR SELECT
TO public
USING (true);

-- Allow public read on visit_bookings for admin dashboard
CREATE POLICY "Public can view all visit bookings"
ON public.visit_bookings
FOR SELECT
TO public
USING (true);

-- Allow public read on all agents (not just verified)
CREATE POLICY "Public can view all agents"
ON public.agents
FOR SELECT
TO public
USING (true);

-- Allow public read on user_roles for admin dashboard
CREATE POLICY "Public can view all user roles"
ON public.user_roles
FOR SELECT
TO public
USING (true);

-- Allow public update on signup_requests for admin approvals
CREATE POLICY "Public can update signup requests"
ON public.signup_requests
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Allow public insert on user_roles for approval flow
CREATE POLICY "Public can insert user roles"
ON public.user_roles
FOR INSERT
TO public
WITH CHECK (true);
