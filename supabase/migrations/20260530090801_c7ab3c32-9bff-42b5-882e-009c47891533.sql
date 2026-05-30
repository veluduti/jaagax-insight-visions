DROP POLICY IF EXISTS "Anyone can view projects" ON public.projects;

CREATE POLICY "Public can view verified projects"
ON public.projects
FOR SELECT
TO anon, authenticated
USING (verified = true AND COALESCE(is_draft, false) = false);

CREATE POLICY "Builders can view own projects"
ON public.projects
FOR SELECT
TO authenticated
USING (auth.uid() = submitted_by);
