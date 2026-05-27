
-- 1. Drop testing/overly-permissive policies
DROP POLICY IF EXISTS "Public can insert notifications (testing)" ON public.notifications;
DROP POLICY IF EXISTS "Public can insert partner hotels (testing)" ON public.partner_hotels;
DROP POLICY IF EXISTS "Public can update projects (testing)" ON public.projects;
DROP POLICY IF EXISTS "Authenticated can moderate projects" ON public.projects;
DROP POLICY IF EXISTS "Public can update properties (testing)" ON public.properties;
DROP POLICY IF EXISTS "Authenticated can moderate properties" ON public.properties;
DROP POLICY IF EXISTS "Public can view hotel applications (testing)" ON public.hotel_partner_applications;
DROP POLICY IF EXISTS "Public can update hotel applications (testing)" ON public.hotel_partner_applications;
DROP POLICY IF EXISTS "Public can view all visit bookings" ON public.visit_bookings;
DROP POLICY IF EXISTS "Anyone can view property documents" ON public.property_documents;
DROP POLICY IF EXISTS "Anyone can view rera verifications" ON public.rera_verifications;
DROP POLICY IF EXISTS "Authenticated can create tasks" ON public.agent_tasks;
DROP POLICY IF EXISTS "Public can view all agents" ON public.agents;

-- 2. Replacement scoped policies
CREATE POLICY "Owners and admins view property documents"
  ON public.property_documents FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Owners and admins view rera verifications"
  ON public.rera_verifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- agent_tasks: only admins may create (admins covered by existing ALL policy; add explicit for clarity is unneeded)

-- 3. Restrict PII columns on agents/builder_profiles from anonymous role
REVOKE SELECT (email, phone) ON public.agents FROM anon;
REVOKE SELECT (email, phone, whatsapp) ON public.builder_profiles FROM anon;

-- builder_profiles_data: revoke phone/rera from anon if columns exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='builder_profiles_data' AND column_name='phone') THEN
    EXECUTE 'REVOKE SELECT (phone) ON public.builder_profiles_data FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='builder_profiles_data' AND column_name='rera_number') THEN
    EXECUTE 'REVOKE SELECT (rera_number) ON public.builder_profiles_data FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='builder_profiles_data' AND column_name='rera_id') THEN
    EXECUTE 'REVOKE SELECT (rera_id) ON public.builder_profiles_data FROM anon';
  END IF;
END $$;

-- 4. Fix privilege escalation: remove agent/builder from self-assignable roles
DROP POLICY IF EXISTS "Users can self-assign safe roles on signup" ON public.user_roles;
CREATE POLICY "Users can self-assign customer role on signup"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role IN ('buyer','customer'));

-- 5. Tighten signup_requests INSERT: require matching authenticated email
DROP POLICY IF EXISTS "Anyone can insert their own signup request" ON public.signup_requests;
CREATE POLICY "Users insert own signup request with matching email"
  ON public.signup_requests FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email',''))
  );

-- 6. Storage: drop unrestricted public write policies
DROP POLICY IF EXISTS "Public can upload hotel documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload hotel photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload builder profile media" ON storage.objects;
DROP POLICY IF EXISTS "Public can update builder profile media" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete builder profile media" ON storage.objects;

-- Replace with authenticated-only owner-scoped policies for builder profile media
CREATE POLICY "Authenticated upload builder profile media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'property-images'
    AND (storage.foldername(name))[1] = 'builder-profiles'
  );

CREATE POLICY "Owners update builder profile media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'property-images'
    AND (storage.foldername(name))[1] = 'builder-profiles'
    AND owner = auth.uid()
  );

CREATE POLICY "Owners delete builder profile media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'property-images'
    AND (storage.foldername(name))[1] = 'builder-profiles'
    AND owner = auth.uid()
  );

-- 7. Pin search_path on remaining SECURITY DEFINER functions
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
