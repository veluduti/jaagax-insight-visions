
-- 1. Enable RLS on projects (currently missing)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Add public read policy for projects
CREATE POLICY "Anyone can view projects" ON public.projects FOR SELECT USING (true);

-- 2. Remove overly permissive anon testing policies
DROP POLICY IF EXISTS "Anon can insert properties for testing" ON public.properties;
DROP POLICY IF EXISTS "Anon can view properties for testing" ON public.properties;
DROP POLICY IF EXISTS "Anon can create bookings for testing" ON public.hotel_bookings;
DROP POLICY IF EXISTS "Anon can view bookings for testing" ON public.hotel_bookings;

-- 3. Add proper policy: authenticated users can view all properties (verified or not)
CREATE POLICY "Authenticated users can view all properties" ON public.properties FOR SELECT TO authenticated USING (true);

-- 4. Add policy: anyone (including anon) can view verified properties (keep existing but ensure it works for public browsing)
-- Already exists: "Anyone can view verified properties" with USING (verified = true)

-- 5. Fix user_roles: remove self-assignment policy (privilege escalation)
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;

-- 6. Add admin-only role assignment via security definer function
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Allow admins to manage roles
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Allow role insertion during signup (only for non-admin roles)
CREATE POLICY "Users can self-assign non-admin roles on signup" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND role != 'admin'
);

-- 7. Restrict hotel_bookings: only authenticated users can create/view their own
-- (existing policies for authenticated users are fine, we just removed anon ones)

-- 8. Add authenticated-only SELECT for hotel_bookings to cover users viewing own bookings
-- Already exists: "Users can view their bookings" and "Hotel managers can view bookings for their hotels"
