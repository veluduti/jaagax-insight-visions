
CREATE POLICY "fin_kyc_own_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'financial-kyc' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "fin_kyc_own_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'financial-kyc' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "fin_kyc_own_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'financial-kyc' AND (storage.foldername(name))[1] = auth.uid()::text);
