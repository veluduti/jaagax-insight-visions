-- Fix user_roles RLS policy to allow signup
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can insert their own roles on signup" ON public.user_roles;

-- Create new policy that allows insert during signup
-- This is safe because we validate user_id matches auth.uid() in the check
CREATE POLICY "Users can insert their own role during signup" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  -- Allow insert if user_id matches the authenticated user
  -- OR if this is during the signup process (user just created)
  user_id = auth.uid()
);

-- Also ensure users can view their own roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());