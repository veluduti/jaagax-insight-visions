-- Owners (uploaders) can manage their own files (path prefix = their user id)
CREATE POLICY "financial_docs_owner_all"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'financial-documents' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'financial-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Financial providers (any signed-in user with a provider row) can read all docs
CREATE POLICY "financial_docs_providers_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'financial-documents'
  AND EXISTS (SELECT 1 FROM public.financial_providers fp WHERE fp.user_id = auth.uid())
);