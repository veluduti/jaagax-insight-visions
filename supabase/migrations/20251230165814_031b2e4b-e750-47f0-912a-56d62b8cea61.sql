-- Create agent_call_context table
CREATE TABLE public.agent_call_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL,
  property_id INTEGER NOT NULL REFERENCES public.properties(id),
  agent_id INTEGER REFERENCES public.agents(id),
  intent TEXT[] NOT NULL,
  buyer_fear TEXT[] NULL,
  buyer_context JSONB NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  preferred_slot JSONB NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(buyer_id, property_id)
);

-- Enable RLS
ALTER TABLE public.agent_call_context ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert their own call context"
ON public.agent_call_context
FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can view their own call context"
ON public.agent_call_context
FOR SELECT
USING (auth.uid() = buyer_id);

CREATE POLICY "Users can update their own call context"
ON public.agent_call_context
FOR UPDATE
USING (auth.uid() = buyer_id);

-- Agents can view contexts assigned to them
CREATE POLICY "Agents can view their assigned contexts"
ON public.agent_call_context
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM agents 
    WHERE agents.id = agent_call_context.agent_id 
    AND agents.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_agent_call_context_updated_at
BEFORE UPDATE ON public.agent_call_context
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();