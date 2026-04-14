CREATE POLICY "Anyone can create builder profiles"
ON public.builder_profiles
FOR INSERT
TO public
WITH CHECK (true);