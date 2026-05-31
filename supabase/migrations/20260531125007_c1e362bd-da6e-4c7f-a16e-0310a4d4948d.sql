DROP POLICY IF EXISTS "Public can view verified live properties" ON public.properties;
DROP POLICY IF EXISTS "Public can view verified properties" ON public.properties;

CREATE POLICY "Public can view verified properties"
ON public.properties
FOR SELECT
TO anon, authenticated
USING (verified = true AND COALESCE(is_draft, false) = false);