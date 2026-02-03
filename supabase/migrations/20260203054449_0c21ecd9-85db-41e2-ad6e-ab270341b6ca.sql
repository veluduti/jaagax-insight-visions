-- Update existing properties to be verified so they show across the site
UPDATE public.properties SET verified = true WHERE verified = false;

-- Also ensure the RLS policy allows public SELECT on properties
DROP POLICY IF EXISTS "Anyone can view verified properties" ON public.properties;
CREATE POLICY "Anyone can view verified properties" 
ON public.properties FOR SELECT 
USING (true);