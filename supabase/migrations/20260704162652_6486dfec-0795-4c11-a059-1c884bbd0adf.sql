
DO $$ BEGIN
  CREATE TYPE public.nl_role AS ENUM ('customer','farmer','land_owner','admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.nl_kyc_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.nl_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.nl_role NOT NULL DEFAULT 'customer',
  full_name TEXT,
  phone TEXT,
  city TEXT,
  state TEXT,
  bio TEXT,
  avatar_url TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_profiles TO authenticated;
GRANT ALL ON public.nl_profiles TO service_role;
ALTER TABLE public.nl_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nl_profiles_self_select" ON public.nl_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "nl_profiles_self_insert" ON public.nl_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND role <> 'admin');
CREATE POLICY "nl_profiles_self_update" ON public.nl_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK ((auth.uid() = user_id AND role <> 'admin') OR public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.nl_kyc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id_type TEXT NOT NULL,
  id_number TEXT NOT NULL,
  id_document_url TEXT,
  address_proof_url TEXT,
  status public.nl_kyc_status NOT NULL DEFAULT 'pending',
  reviewer_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_kyc TO authenticated;
GRANT ALL ON public.nl_kyc TO service_role;
ALTER TABLE public.nl_kyc ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nl_kyc_self_select" ON public.nl_kyc
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "nl_kyc_self_insert" ON public.nl_kyc
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nl_kyc_self_update" ON public.nl_kyc
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.nl_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_nl_profiles_updated ON public.nl_profiles;
CREATE TRIGGER trg_nl_profiles_updated BEFORE UPDATE ON public.nl_profiles
  FOR EACH ROW EXECUTE FUNCTION public.nl_touch_updated_at();

DROP TRIGGER IF EXISTS trg_nl_kyc_updated ON public.nl_kyc;
CREATE TRIGGER trg_nl_kyc_updated BEFORE UPDATE ON public.nl_kyc
  FOR EACH ROW EXECUTE FUNCTION public.nl_touch_updated_at();
