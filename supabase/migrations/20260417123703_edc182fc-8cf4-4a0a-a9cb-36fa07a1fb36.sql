CREATE POLICY "Authenticated users can verify properties"
ON public.properties
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);