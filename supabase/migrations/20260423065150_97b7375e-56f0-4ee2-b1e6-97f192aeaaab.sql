-- Allow public uploads to the builder-profiles folder of property-images bucket
-- This supports the public "Add Builder Profile" form

DROP POLICY IF EXISTS "Public can upload builder profile media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view builder profile media" ON storage.objects;
DROP POLICY IF EXISTS "Public can update builder profile media" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete builder profile media" ON storage.objects;

CREATE POLICY "Public can upload builder profile media"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = 'builder-profiles'
);

CREATE POLICY "Public can view builder profile media"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = 'builder-profiles'
);

CREATE POLICY "Public can update builder profile media"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = 'builder-profiles'
);

CREATE POLICY "Public can delete builder profile media"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = 'builder-profiles'
);