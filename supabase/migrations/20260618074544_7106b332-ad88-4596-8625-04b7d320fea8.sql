
CREATE TABLE IF NOT EXISTS public.loan_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid NOT NULL REFERENCES public.financial_enquiries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL,
  file_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_loan_documents_enquiry ON public.loan_documents(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_loan_documents_user ON public.loan_documents(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_documents TO authenticated;
GRANT ALL ON public.loan_documents TO service_role;
ALTER TABLE public.loan_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own loan docs" ON public.loan_documents FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins read loan docs" ON public.loan_documents FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Storage policies for loan-documents bucket
CREATE POLICY "loan docs users read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "loan docs users upload own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "loan docs users update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "loan docs users delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
