-- Create buyer_context table
CREATE TABLE public.buyer_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  life_stage text,
  budget_comfort text CHECK (budget_comfort IN ('strict', 'flexible', 'premium')),
  primary_fear text[],
  decision_mode text CHECK (decision_mode IN ('buy_now', 'wait', 'rent_then_buy')),
  confidence_score integer DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  last_ai_update timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.buyer_context ENABLE ROW LEVEL SECURITY;

-- Users can read their own context
CREATE POLICY "Users can read own buyer context"
ON public.buyer_context
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own context
CREATE POLICY "Users can insert own buyer context"
ON public.buyer_context
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own context
CREATE POLICY "Users can update own buyer context"
ON public.buyer_context
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own context
CREATE POLICY "Users can delete own buyer context"
ON public.buyer_context
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can read all buyer contexts
CREATE POLICY "Admins can read all buyer contexts"
ON public.buyer_context
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_buyer_context_updated_at
BEFORE UPDATE ON public.buyer_context
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();