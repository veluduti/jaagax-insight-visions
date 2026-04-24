-- TEMPORARY: allow any authenticated user to approve/reject. Will be restricted later.
DROP POLICY IF EXISTS "Authenticated can moderate properties" ON public.properties;
CREATE POLICY "Authenticated can moderate properties"
ON public.properties
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can moderate projects" ON public.projects;
CREATE POLICY "Authenticated can moderate projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant admin role to current user (by email) so admin-only UI/functions work
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'
FROM auth.users u
WHERE u.email = 'veludutuvenkatesh@lbrce.ac.in'
ON CONFLICT (user_id, role) DO NOTHING;