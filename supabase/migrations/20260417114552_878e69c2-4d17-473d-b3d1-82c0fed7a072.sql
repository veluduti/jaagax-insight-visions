-- Add ownership and verification tracking columns to properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_properties_submitted_by ON public.properties(submitted_by);
CREATE INDEX IF NOT EXISTS idx_properties_verification_status ON public.properties(verification_status);

-- RLS: allow builders to manage their own properties
DROP POLICY IF EXISTS "Builders can insert own properties" ON public.properties;
CREATE POLICY "Builders can insert own properties"
  ON public.properties FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Builders can view own properties" ON public.properties;
CREATE POLICY "Builders can view own properties"
  ON public.properties FOR SELECT
  TO authenticated
  USING (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Builders can update own properties" ON public.properties;
CREATE POLICY "Builders can update own properties"
  ON public.properties FOR UPDATE
  TO authenticated
  USING (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Builders can delete own properties" ON public.properties;
CREATE POLICY "Builders can delete own properties"
  ON public.properties FOR DELETE
  TO authenticated
  USING (auth.uid() = submitted_by);

-- Admins can manage all properties (for verification workflow)
DROP POLICY IF EXISTS "Admins can manage all properties" ON public.properties;
CREATE POLICY "Admins can manage all properties"
  ON public.properties FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));