-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', false);

-- Allow authenticated users to upload verification documents
CREATE POLICY "Users can upload verification documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to view their own verification documents
CREATE POLICY "Users can view own verification documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow admins to view all verification documents
CREATE POLICY "Admins can view all verification documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-docs' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Update verifications table policies to allow users to insert verifications
CREATE POLICY "Authenticated users can submit verifications"
ON public.verifications
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id AND builder_id = auth.uid()
  )
);

-- Allow users to view their own verification submissions
CREATE POLICY "Users can view own verification submissions"
ON public.verifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id AND builder_id = auth.uid()
  )
);

-- Allow admins to view all verifications
CREATE POLICY "Admins can view all verifications"
ON public.verifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);