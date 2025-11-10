-- Enable RLS on market_trends table
ALTER TABLE public.market_trends ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to view market trends (public data)
CREATE POLICY "Anyone can view market trends" 
ON public.market_trends 
FOR SELECT 
USING (true);

-- Only admins can insert/update market trends
CREATE POLICY "Only admins can modify market trends" 
ON public.market_trends 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);