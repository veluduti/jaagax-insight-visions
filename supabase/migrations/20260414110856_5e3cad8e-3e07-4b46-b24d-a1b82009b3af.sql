CREATE POLICY "Anyone can update builder profiles"
ON public.builder_profiles
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);