ALTER TABLE public.financial_loan_applications
  DROP CONSTRAINT IF EXISTS financial_loan_applications_status_check;

ALTER TABLE public.financial_loan_applications
  ADD CONSTRAINT financial_loan_applications_status_check
  CHECK (status IN ('new','accepted','documents_pending','under_review','approved','rejected','disbursed'));

ALTER TABLE public.financial_loan_applications
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;