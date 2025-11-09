-- Drop existing INSERT policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Anyone can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Anyone can insert agents" ON public.agents;
DROP POLICY IF EXISTS "Anyone can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can insert builders" ON public.builders;

-- Re-create INSERT policies for seeding (demo purposes)
CREATE POLICY "Anyone can insert properties"
ON public.properties
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can insert agents"
ON public.agents
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can insert projects"
ON public.projects
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can insert builders"
ON public.builders
FOR INSERT
TO public
WITH CHECK (true);