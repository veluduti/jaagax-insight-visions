-- Temporary: allow public approve/update on properties (will restrict later)
DROP POLICY IF EXISTS "Public can update properties (temp)" ON public.properties;
CREATE POLICY "Public can update properties (temp)"
ON public.properties
FOR UPDATE
USING (true)
WITH CHECK (true);