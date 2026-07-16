
CREATE POLICY "NL land uploads: owner read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'nl-land-uploads' AND owner = auth.uid());
CREATE POLICY "NL land uploads: owner insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'nl-land-uploads' AND owner = auth.uid());
CREATE POLICY "NL land uploads: owner delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'nl-land-uploads' AND owner = auth.uid());
