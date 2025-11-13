-- Fix the site_visits RLS policy that's causing "permission denied for table users"
-- The issue is that the policy tries to access auth.users which is not directly accessible

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view their site visits by email" ON public.site_visits;

-- Create a new policy that uses the public.users table instead
CREATE POLICY "Users can view their site visits by email" 
ON public.site_visits 
FOR SELECT 
USING (
  visitor_email IN (
    SELECT email 
    FROM public.users 
    WHERE id = auth.uid()
  )
);