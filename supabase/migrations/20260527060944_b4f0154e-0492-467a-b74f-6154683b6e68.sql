
-- 1. Tighten properties SELECT policy: drop blanket authenticated-read-all
DROP POLICY IF EXISTS "Authenticated users can view all properties" ON public.properties;

-- Public/anon and authenticated users can see only verified live listings
DROP POLICY IF EXISTS "Public can view verified live properties" ON public.properties;
CREATE POLICY "Public can view verified live properties"
ON public.properties
FOR SELECT
TO anon, authenticated
USING (verified = true AND is_live = true AND COALESCE(is_draft, false) = false);

-- Owners can see their own listings (any status)
DROP POLICY IF EXISTS "Owners can view their own properties" ON public.properties;
CREATE POLICY "Owners can view their own properties"
ON public.properties
FOR SELECT
TO authenticated
USING (submitted_by = auth.uid());

-- Assigned agent can see properties assigned to them
DROP POLICY IF EXISTS "Assigned agent can view property" ON public.properties;
CREATE POLICY "Assigned agent can view property"
ON public.properties
FOR SELECT
TO authenticated
USING (
  assigned_agent_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = properties.assigned_agent_id AND a.user_id = auth.uid()
  )
);

-- Admins can see everything
DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;
CREATE POLICY "Admins can view all properties"
ON public.properties
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 2. Make property-documents-files bucket private; remove public read policy
UPDATE storage.buckets SET public = false WHERE id = 'property-documents-files';

DROP POLICY IF EXISTS "Anyone can view property doc files" ON storage.objects;

-- Owners can read their own files (folder convention: first folder = user uuid)
CREATE POLICY "Owners can read own property doc files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'property-documents-files'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Admins can read all property doc files
CREATE POLICY "Admins can read all property doc files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'property-documents-files'
  AND public.is_admin(auth.uid())
);
