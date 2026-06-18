
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('aadhaar_front','aadhaar_back','pan','selfie')),
  file_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  verified_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user ON public.kyc_documents(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kyc_documents TO authenticated;
GRANT ALL ON public.kyc_documents TO service_role;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own kyc docs" ON public.kyc_documents FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_verified boolean NOT NULL DEFAULT false,
  trust_score integer NOT NULL DEFAULT 0,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_verification TO authenticated;
GRANT ALL ON public.user_verification TO service_role;
ALTER TABLE public.user_verification ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own verification" ON public.user_verification FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_user_verification_updated
  BEFORE UPDATE ON public.user_verification
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for kyc-documents bucket (per-user folder)
CREATE POLICY "kyc users read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "kyc users upload own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "kyc users update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "kyc users delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
