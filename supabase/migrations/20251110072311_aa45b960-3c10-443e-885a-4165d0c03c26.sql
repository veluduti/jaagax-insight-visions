-- Add builder relationship to properties and projects
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS builder_id integer,
ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected'));

-- Update RLS policies for properties to allow builders to insert
DROP POLICY IF EXISTS "Anyone can insert properties" ON public.properties;

CREATE POLICY "Authenticated users can insert properties" 
ON public.properties 
FOR INSERT 
WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Builders can view their own properties" 
ON public.properties 
FOR SELECT 
USING (auth.uid() = submitted_by OR verified = true);

CREATE POLICY "Builders can update their own properties" 
ON public.properties 
FOR UPDATE 
USING (auth.uid() = submitted_by);

-- Update RLS policies for projects
DROP POLICY IF EXISTS "Anyone can insert projects" ON public.projects;

CREATE POLICY "Authenticated users can insert projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Builders can view their own projects" 
ON public.projects 
FOR SELECT 
USING (auth.uid() = submitted_by OR verified = true);

CREATE POLICY "Builders can update their own projects" 
ON public.projects 
FOR UPDATE 
USING (auth.uid() = submitted_by);

-- Admin policies for verification
CREATE POLICY "Admins can update any property" 
ON public.properties 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can update any project" 
ON public.projects 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Admins and agents can view all submissions
CREATE POLICY "Admins can view all properties" 
ON public.properties 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'agent')
  )
);