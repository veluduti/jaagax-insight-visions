-- Add INSERT policies for properties, agents, and projects tables to allow seeding

-- Properties: Allow anyone to insert (for demo/seeding purposes)
CREATE POLICY "Anyone can insert properties"
ON public.properties
FOR INSERT
WITH CHECK (true);

-- Agents: Allow anyone to insert (for demo/seeding purposes)
CREATE POLICY "Anyone can insert agents"
ON public.agents
FOR INSERT
WITH CHECK (true);

-- Projects: Allow anyone to insert (for demo/seeding purposes)
CREATE POLICY "Anyone can insert projects"
ON public.projects
FOR INSERT
WITH CHECK (true);

-- Builders: Allow anyone to insert (for demo/seeding purposes)
CREATE POLICY "Anyone can insert builders"
ON public.builders
FOR INSERT
WITH CHECK (true);