-- Create public storage bucket for property media (images, videos, documents)
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-media', 'property-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read access
CREATE POLICY "Public can read property media"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-media');

-- Authenticated users upload to their own folder (folder name = user id)
CREATE POLICY "Users upload property media to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update/delete their own files
CREATE POLICY "Users update own property media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete own property media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);