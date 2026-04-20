-- Extend properties for seller listings
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS listing_type text DEFAULT 'sale',
  ADD COLUMN IF NOT EXISTS furnishing text,
  ADD COLUMN IF NOT EXISTS property_age text,
  ADD COLUMN IF NOT EXISTS balconies integer,
  ADD COLUMN IF NOT EXISTS floor_number integer,
  ADD COLUMN IF NOT EXISTS pincode text,
  ADD COLUMN IF NOT EXISTS amenities text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS price_negotiable boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_charges numeric,
  ADD COLUMN IF NOT EXISTS booking_amount numeric,
  ADD COLUMN IF NOT EXISTS document_urls jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false;

-- Allow sellers (any authenticated user) to see their own pending/rejected properties
DROP POLICY IF EXISTS "Sellers can view own properties" ON public.properties;
CREATE POLICY "Sellers can view own properties"
  ON public.properties FOR SELECT
  TO authenticated
  USING (auth.uid() = submitted_by);

-- Storage buckets for seller media
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('property-documents', 'property-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: property-images (public read, owner write)
DROP POLICY IF EXISTS "Public can view property images" ON storage.objects;
CREATE POLICY "Public can view property images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images');

DROP POLICY IF EXISTS "Auth users can upload property images" ON storage.objects;
CREATE POLICY "Auth users can upload property images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Owners can update property images" ON storage.objects;
CREATE POLICY "Owners can update property images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Owners can delete property images" ON storage.objects;
CREATE POLICY "Owners can delete property images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: property-documents (private, owner + admin)
DROP POLICY IF EXISTS "Owners can view own documents" ON storage.objects;
CREATE POLICY "Owners can view own documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'property-documents' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "Auth users can upload documents" ON storage.objects;
CREATE POLICY "Auth users can upload documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'property-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Owners can delete own documents" ON storage.objects;
CREATE POLICY "Owners can delete own documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'property-documents' AND auth.uid()::text = (storage.foldername(name))[1]);