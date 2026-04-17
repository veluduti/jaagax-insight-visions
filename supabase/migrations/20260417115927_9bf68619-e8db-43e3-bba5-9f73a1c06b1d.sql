-- Add RERA fields to properties so builders can upload RERA per property
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS rera_id text,
  ADD COLUMN IF NOT EXISTS rera_document_url text;

CREATE INDEX IF NOT EXISTS idx_properties_rera_id ON public.properties(rera_id);

-- Storage bucket for RERA documents (public read so verification team can view)
INSERT INTO storage.buckets (id, name, public)
VALUES ('rera-documents', 'rera-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for RERA documents
DROP POLICY IF EXISTS "Authenticated users can upload RERA docs" ON storage.objects;
CREATE POLICY "Authenticated users can upload RERA docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'rera-documents');

DROP POLICY IF EXISTS "Public can view RERA docs" ON storage.objects;
CREATE POLICY "Public can view RERA docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'rera-documents');

DROP POLICY IF EXISTS "Owners can update own RERA docs" ON storage.objects;
CREATE POLICY "Owners can update own RERA docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'rera-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Owners can delete own RERA docs" ON storage.objects;
CREATE POLICY "Owners can delete own RERA docs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'rera-documents' AND auth.uid()::text = (storage.foldername(name))[1]);