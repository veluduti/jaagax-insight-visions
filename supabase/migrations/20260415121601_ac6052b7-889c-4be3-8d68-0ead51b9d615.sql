-- Allow anyone (including anon) to insert signup requests via the RPC
-- The submit_signup_request function is SECURITY DEFINER so this is handled.
-- But we need a policy for users to insert their own request directly if needed.
CREATE POLICY "Anyone can insert their own signup request"
ON public.signup_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
