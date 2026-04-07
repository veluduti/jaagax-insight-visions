
-- 1. Re-enable RLS on projects table with public read access
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Keep existing "Anyone can view projects" policy (already exists)
-- No INSERT/UPDATE/DELETE for public - admin-only via service role

-- 2. Restrict user_roles self-assignment to safe roles only (buyer, agent, builder, hotel_manager)
DROP POLICY IF EXISTS "Users can self-assign non-admin roles on signup" ON public.user_roles;
CREATE POLICY "Users can self-assign safe roles on signup"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND role IN ('buyer', 'agent', 'builder', 'hotel_manager')
);

-- 3. Tighten ad_interactions SELECT to own records or admin
DROP POLICY IF EXISTS "Authenticated users can view ad interactions" ON public.ad_interactions;
CREATE POLICY "Users can view own ad interactions"
ON public.ad_interactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
