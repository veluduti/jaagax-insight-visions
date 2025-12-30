-- Create agent_effort_log table
CREATE TABLE public.agent_effort_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES public.agents(id),
  buyer_id UUID NOT NULL,
  property_id INTEGER REFERENCES public.properties(id),
  effort_type TEXT NOT NULL CHECK (effort_type IN ('explanation', 'visit', 'negotiation', 'closure')),
  units INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create seller_engagement_settings table
CREATE TABLE public.seller_engagement_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  min_effort_threshold INTEGER NOT NULL DEFAULT 5,
  engagement_fee_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(seller_id)
);

-- Enable RLS
ALTER TABLE public.agent_effort_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_engagement_settings ENABLE ROW LEVEL SECURITY;

-- Agent effort log policies (agents see their own, admins see all)
CREATE POLICY "Agents can view their own effort logs"
ON public.agent_effort_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM agents 
    WHERE agents.id = agent_effort_log.agent_id 
    AND agents.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all effort logs"
ON public.agent_effort_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert effort logs"
ON public.agent_effort_log
FOR INSERT
WITH CHECK (true);

-- Seller engagement settings policies
CREATE POLICY "Sellers can view own settings"
ON public.seller_engagement_settings
FOR SELECT
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert own settings"
ON public.seller_engagement_settings
FOR INSERT
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own settings"
ON public.seller_engagement_settings
FOR UPDATE
USING (auth.uid() = seller_id);

CREATE POLICY "Admins can view all settings"
ON public.seller_engagement_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on seller settings
CREATE TRIGGER update_seller_engagement_settings_updated_at
BEFORE UPDATE ON public.seller_engagement_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to log agent effort
CREATE OR REPLACE FUNCTION public.log_agent_effort(
  p_agent_id INTEGER,
  p_buyer_id UUID,
  p_property_id INTEGER,
  p_effort_type TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_units INTEGER;
  v_log_id UUID;
BEGIN
  -- Determine units based on effort type
  CASE p_effort_type
    WHEN 'explanation' THEN v_units := 1;
    WHEN 'visit' THEN v_units := 3;
    WHEN 'negotiation' THEN v_units := 5;
    WHEN 'closure' THEN v_units := 10;
    ELSE v_units := 1;
  END CASE;

  -- Insert effort log
  INSERT INTO agent_effort_log (agent_id, buyer_id, property_id, effort_type, units)
  VALUES (p_agent_id, p_buyer_id, p_property_id, p_effort_type, v_units)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Function to get agent effort summary
CREATE OR REPLACE FUNCTION public.get_agent_effort_summary(p_agent_id INTEGER)
RETURNS TABLE(
  total_units BIGINT,
  explanation_count BIGINT,
  visit_count BIGINT,
  negotiation_count BIGINT,
  closure_count BIGINT,
  unique_buyers BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(units), 0) as total_units,
    COUNT(*) FILTER (WHERE effort_type = 'explanation') as explanation_count,
    COUNT(*) FILTER (WHERE effort_type = 'visit') as visit_count,
    COUNT(*) FILTER (WHERE effort_type = 'negotiation') as negotiation_count,
    COUNT(*) FILTER (WHERE effort_type = 'closure') as closure_count,
    COUNT(DISTINCT buyer_id) as unique_buyers
  FROM agent_effort_log
  WHERE agent_id = p_agent_id;
END;
$$;