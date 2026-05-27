
-- ============ 1. Column-level PII protection ============
REVOKE SELECT (email, phone) ON public.agents FROM anon;
REVOKE SELECT (email, phone, whatsapp) ON public.builder_profiles FROM anon;

-- builder_profiles_data: re-apply (column may or may not exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='builder_profiles_data' AND column_name='phone') THEN
    EXECUTE 'REVOKE SELECT (phone) ON public.builder_profiles_data FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='builder_profiles_data' AND column_name='rera_number') THEN
    EXECUTE 'REVOKE SELECT (rera_number) ON public.builder_profiles_data FROM anon';
  END IF;
END $$;

-- ============ 2. signup_email_otps — lock down completely ============
REVOKE ALL ON public.signup_email_otps FROM anon, authenticated;
GRANT ALL ON public.signup_email_otps TO service_role;
-- Explicit deny policy for any remaining role (RLS denies by default with no policy, but make it explicit)
DROP POLICY IF EXISTS "Service role only access" ON public.signup_email_otps;
CREATE POLICY "Service role only access"
  ON public.signup_email_otps
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============ 3. hotel_partner_applications — drop anon insert ============
DROP POLICY IF EXISTS "Anyone can submit hotel application" ON public.hotel_partner_applications;
-- "Users can submit own applications" already requires auth.uid() = user_id

-- ============ 4. notifications — restrict insert to own user or admin ============
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ============ 5. Storage: tighten unrestricted INSERTs ============
DROP POLICY IF EXISTS "Authenticated can upload project media" ON storage.objects;
CREATE POLICY "Authenticated upload own project media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-media'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Authenticated users can upload RERA docs" ON storage.objects;
-- folder-scoped policy "Authenticated can upload RERA docs to own folder" remains

-- Drop duplicate public SELECT policy on rera-documents
DROP POLICY IF EXISTS "Public can view RERA docs" ON storage.objects;
-- "RERA docs are publicly readable" remains for now (bucket is public-by-design)

DROP POLICY IF EXISTS "Authenticated users can upload property doc files" ON storage.objects;
CREATE POLICY "Authenticated upload own property doc files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'property-documents-files'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- ============ 6. weekend_booking_activity_log — restrict insert ============
DROP POLICY IF EXISTS "Authenticated can log activity" ON public.weekend_booking_activity_log;
CREATE POLICY "Users log activity on own bookings"
  ON public.weekend_booking_activity_log FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR booking_id IN (SELECT id FROM public.weekend_bookings WHERE buyer_id = auth.uid())
    OR booking_id IN (
      SELECT wb.id FROM public.weekend_bookings wb
      JOIN public.agents a ON a.id = wb.agent_id
      WHERE a.user_id = auth.uid()
    )
  );
