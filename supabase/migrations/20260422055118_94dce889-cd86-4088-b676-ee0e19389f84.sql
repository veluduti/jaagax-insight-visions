
-- RERA Verifications table
CREATE TABLE IF NOT EXISTS public.rera_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rera_number TEXT NOT NULL,
  document_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rera_verifications_property ON public.rera_verifications(property_id);
CREATE INDEX IF NOT EXISTS idx_rera_verifications_rera_number ON public.rera_verifications(rera_number);
CREATE INDEX IF NOT EXISTS idx_rera_verifications_status ON public.rera_verifications(status);

ALTER TABLE public.rera_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rera verifications"
  ON public.rera_verifications FOR SELECT
  USING (true);

CREATE POLICY "Users can submit own rera verifications"
  ON public.rera_verifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rera verifications"
  ON public.rera_verifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all rera verifications"
  ON public.rera_verifications FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_rera_verifications_updated_at
  BEFORE UPDATE ON public.rera_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for rera-documents bucket (bucket already exists & is public)
DO $$ BEGIN
  CREATE POLICY "RERA docs are publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'rera-documents');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can upload RERA docs to own folder"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'rera-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can update own RERA docs"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'rera-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
