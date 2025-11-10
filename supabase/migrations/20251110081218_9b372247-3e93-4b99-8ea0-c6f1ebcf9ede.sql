-- Create builder_performance table to track dynamic performance metrics
CREATE TABLE IF NOT EXISTS public.builder_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id UUID NOT NULL REFERENCES auth.users(id),
  project_id INTEGER REFERENCES public.projects(id),
  month DATE NOT NULL,
  views INTEGER DEFAULT 0,
  leads INTEGER DEFAULT 0,
  units_sold INTEGER DEFAULT 0,
  revenue BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(builder_id, project_id, month)
);

-- Enable RLS
ALTER TABLE public.builder_performance ENABLE ROW LEVEL SECURITY;

-- Policies for builder_performance
CREATE POLICY "Builders can view their own performance"
  ON public.builder_performance FOR SELECT
  USING (auth.uid() = builder_id);

CREATE POLICY "Builders can insert their own performance"
  ON public.builder_performance FOR INSERT
  WITH CHECK (auth.uid() = builder_id);

CREATE POLICY "Builders can update their own performance"
  ON public.builder_performance FOR UPDATE
  USING (auth.uid() = builder_id);

-- Create trigger for updated_at
CREATE TRIGGER update_builder_performance_updated_at
  BEFORE UPDATE ON public.builder_performance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create analytics views aggregate function
CREATE OR REPLACE FUNCTION get_builder_analytics(p_builder_id UUID, p_months INTEGER DEFAULT 3)
RETURNS TABLE (
  total_views BIGINT,
  total_leads BIGINT,
  total_units_sold BIGINT,
  total_revenue BIGINT,
  avg_views NUMERIC,
  growth_rate NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month_views BIGINT;
  previous_month_views BIGINT;
BEGIN
  -- Get aggregated data for the period
  SELECT 
    COALESCE(SUM(views), 0),
    COALESCE(SUM(leads), 0),
    COALESCE(SUM(units_sold), 0),
    COALESCE(SUM(revenue), 0),
    COALESCE(AVG(views), 0)
  INTO 
    total_views,
    total_leads,
    total_units_sold,
    total_revenue,
    avg_views
  FROM builder_performance
  WHERE builder_id = p_builder_id
    AND month >= (CURRENT_DATE - (p_months || ' months')::INTERVAL);

  -- Calculate growth rate (comparing last month to previous month)
  SELECT COALESCE(SUM(views), 0) INTO current_month_views
  FROM builder_performance
  WHERE builder_id = p_builder_id
    AND month = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');

  SELECT COALESCE(SUM(views), 0) INTO previous_month_views
  FROM builder_performance
  WHERE builder_id = p_builder_id
    AND month = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months');

  IF previous_month_views > 0 THEN
    growth_rate := ((current_month_views - previous_month_views)::NUMERIC / previous_month_views) * 100;
  ELSE
    growth_rate := 0;
  END IF;

  RETURN QUERY SELECT 
    total_views, 
    total_leads, 
    total_units_sold, 
    total_revenue, 
    avg_views,
    growth_rate;
END;
$$;