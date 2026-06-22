CREATE POLICY "Assigned agents can update their properties"
ON public.properties
FOR UPDATE
TO authenticated
USING (
  assigned_agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
)
WITH CHECK (
  assigned_agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
);