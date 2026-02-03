-- Create buyer_context table
CREATE TABLE public.buyer_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  life_stage TEXT,
  budget_comfort TEXT CHECK (budget_comfort IN ('strict', 'flexible', 'premium')),
  primary_fear TEXT[],
  decision_mode TEXT CHECK (decision_mode IN ('buy_now', 'wait', 'rent_then_buy')),
  confidence_score INTEGER DEFAULT 50,
  last_ai_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.buyer_context ENABLE ROW LEVEL SECURITY;

-- Users can view their own context
CREATE POLICY "Users can view their own buyer context"
ON public.buyer_context FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own context
CREATE POLICY "Users can insert their own buyer context"
ON public.buyer_context FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own context
CREATE POLICY "Users can update their own buyer context"
ON public.buyer_context FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_buyer_context_updated_at
BEFORE UPDATE ON public.buyer_context
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();