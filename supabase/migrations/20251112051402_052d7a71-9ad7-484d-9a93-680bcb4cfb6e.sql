-- Create market insights cache table
CREATE TABLE IF NOT EXISTS public.market_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  locality TEXT,
  insight_type TEXT NOT NULL, -- 'price_trend', 'appreciation', 'investment_score', 'market_summary'
  data JSONB NOT NULL,
  ai_analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '24 hours'),
  UNIQUE(city, locality, insight_type)
);

-- Enable RLS
ALTER TABLE public.market_insights ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read market insights
CREATE POLICY "Anyone can view market insights"
  ON public.market_insights
  FOR SELECT
  USING (true);

-- Only allow service role to insert/update
CREATE POLICY "Service role can manage insights"
  ON public.market_insights
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Create index for faster lookups
CREATE INDEX idx_market_insights_location ON public.market_insights(city, locality);
CREATE INDEX idx_market_insights_expires ON public.market_insights(expires_at);

-- Create function to clean expired insights
CREATE OR REPLACE FUNCTION public.clean_expired_insights()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.market_insights
  WHERE expires_at < now();
END;
$$;

-- Create daily market data aggregation view
CREATE OR REPLACE VIEW public.daily_market_stats AS
SELECT 
  city,
  locality,
  COUNT(*) as total_properties,
  AVG(price) as avg_price,
  AVG(trust_score) as avg_trust_score,
  COUNT(CASE WHEN verified = true THEN 1 END) as verified_count,
  DATE(submitted_at) as date
FROM public.properties
WHERE submitted_at >= now() - INTERVAL '30 days'
GROUP BY city, locality, DATE(submitted_at);

-- Create trigger to update updated_at
CREATE TRIGGER update_market_insights_updated_at
  BEFORE UPDATE ON public.market_insights
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();