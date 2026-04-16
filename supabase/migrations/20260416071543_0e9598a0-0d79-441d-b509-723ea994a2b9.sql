
-- Create buyer_context table
CREATE TABLE public.buyer_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  life_stage TEXT,
  budget_comfort TEXT,
  primary_fear TEXT[],
  decision_mode TEXT,
  confidence_score INTEGER DEFAULT 50,
  last_ai_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.buyer_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own buyer context"
  ON public.buyer_context FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own buyer context"
  ON public.buyer_context FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own buyer context"
  ON public.buyer_context FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Assign admin role to gutta.mahesh@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('134d38b5-1389-45c2-a455-8c5916f39efc', 'admin')
ON CONFLICT DO NOTHING;
