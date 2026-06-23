ALTER TABLE public.financial_leads
  ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS full_details jsonb DEFAULT '{}'::jsonb;