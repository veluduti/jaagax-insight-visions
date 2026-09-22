-- 1) Enable RLS on every public table that still has it disabled
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
  END LOOP;
END $$;

-- 2) feature_flags: public read, admin-only write
DO $$
BEGIN
  IF to_regclass('public.feature_flags') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "feature_flags_public_read" ON public.feature_flags';
    EXECUTE 'DROP POLICY IF EXISTS "feature_flags_admin_write" ON public.feature_flags';
    EXECUTE 'CREATE POLICY "feature_flags_public_read" ON public.feature_flags FOR SELECT TO anon, authenticated USING (true)';
    EXECUTE 'CREATE POLICY "feature_flags_admin_write" ON public.feature_flags FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))';
    EXECUTE 'GRANT SELECT ON public.feature_flags TO anon';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flags TO authenticated';
    EXECUTE 'GRANT ALL ON public.feature_flags TO service_role';
  END IF;
END $$;

-- 3) financial_* tables: scope to the owning financial provider (+ admins)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['financial_activities','financial_meetings','financial_tasks','financial_team_members']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name=t AND column_name='provider_id') THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_provider_all', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_all', t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.financial_providers fp WHERE fp.id = %I.provider_id AND fp.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.financial_providers fp WHERE fp.id = %I.provider_id AND fp.user_id = auth.uid()))',
        t || '_provider_all', t, t, t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))',
        t || '_admin_all', t);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    END IF;
  END LOOP;
END $$;

-- 4) hotel_partner_applications: owner + admin only, never anon
DO $$
BEGIN
  IF to_regclass('public.hotel_partner_applications') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "hpa_owner_all" ON public.hotel_partner_applications';
    EXECUTE 'DROP POLICY IF EXISTS "hpa_admin_all" ON public.hotel_partner_applications';
    EXECUTE 'CREATE POLICY "hpa_owner_all" ON public.hotel_partner_applications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "hpa_admin_all" ON public.hotel_partner_applications FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))';
    EXECUTE 'REVOKE ALL ON public.hotel_partner_applications FROM anon';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_partner_applications TO authenticated';
    EXECUTE 'GRANT ALL ON public.hotel_partner_applications TO service_role';
  END IF;
END $$;

-- 5) builder_profiles_data: keep public marketing data readable, hide PII from anonymous callers
DO $$
DECLARE col text;
BEGIN
  IF to_regclass('public.builder_profiles_data') IS NOT NULL THEN
    FOREACH col IN ARRAY ARRAY['phone','rera_number','rera_id','email','contact_phone','contact_email']
    LOOP
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='builder_profiles_data' AND column_name=col) THEN
        EXECUTE format('REVOKE SELECT (%I) ON public.builder_profiles_data FROM anon', col);
      END IF;
    END LOOP;
    EXECUTE 'DROP POLICY IF EXISTS "Public can view builder data" ON public.builder_profiles_data';
    EXECUTE 'CREATE POLICY "Public can view builder data" ON public.builder_profiles_data FOR SELECT TO anon, authenticated USING (true)';
  END IF;
END $$;

-- 6) Pin search_path on all public functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, '{}'::text[])) cfg WHERE cfg LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
  END LOOP;
END $$;

-- 7) Views run with the querying user's permissions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'v'
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(c.reloptions, '{}'::text[])) o WHERE o LIKE 'security_invoker=%'
      )
  LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = on)', r.relname);
  END LOOP;
END $$;

-- 8) Storage: remove the wildcard authenticated policy, scope to the user's own folder
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users manage own storage folder" ON storage.objects;
CREATE POLICY "Users manage own storage folder"
  ON storage.objects FOR ALL TO authenticated
  USING (auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);