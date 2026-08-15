DROP POLICY IF EXISTS "Public can view verified properties" ON public.properties;

CREATE POLICY "Public can view non-draft properties"
ON public.properties
FOR SELECT
TO anon, authenticated
USING (COALESCE(is_draft, false) = false);

GRANT SELECT ON public.properties TO anon;
GRANT SELECT ON public.properties TO authenticated;