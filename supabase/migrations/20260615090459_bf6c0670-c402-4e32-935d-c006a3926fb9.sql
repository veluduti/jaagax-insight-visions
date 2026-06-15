
-- ============================================================
-- A) Allow `financial` role across auth surface
-- ============================================================
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_type_check
  CHECK (type = ANY (ARRAY['buyer','seller','agent','builder','financial']));

ALTER TABLE public.signup_requests DROP CONSTRAINT IF EXISTS signup_requests_requested_role_check;
ALTER TABLE public.signup_requests ADD CONSTRAINT signup_requests_requested_role_check
  CHECK (requested_role = ANY (ARRAY['customer','buyer','seller','agent','builder','admin','hotel_manager','driver','financial']));

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role = ANY (ARRAY['admin','agent','builder','customer','driver','hotel_manager','financial']));

-- Extend assign_user_role and submit_signup_request to accept financial
CREATE OR REPLACE FUNCTION public.assign_user_role(_user_id uuid, _role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _role NOT IN ('customer','agent','builder','financial') THEN
    RAISE EXCEPTION 'Invalid role: %', _role;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.submit_signup_request(
  _user_id uuid, _email text, _full_name text, _city text, _requested_role text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _requested_role NOT IN ('customer','buyer','seller','agent','builder','financial') THEN
    RAISE EXCEPTION 'Invalid requested role: %', _requested_role;
  END IF;
  INSERT INTO public.signup_requests (user_id, email, full_name, city, requested_role, status, rejection_reason, reviewed_by, reviewed_at)
  VALUES (_user_id, _email, _full_name, _city, _requested_role, 'pending', NULL, NULL, NULL)
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, city = EXCLUDED.city,
      requested_role = EXCLUDED.requested_role, status = 'pending',
      rejection_reason = NULL, reviewed_by = NULL, reviewed_at = NULL, updated_at = now();
END $$;

-- Update auto_assign_role_on_profile to handle financial
CREATE OR REPLACE FUNCTION public.auto_assign_role_on_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_db_role text;
BEGIN
  v_db_role := CASE
    WHEN NEW.type IN ('buyer','seller') THEN 'customer'
    ELSE NEW.type
  END;
  IF v_db_role IN ('customer','agent','builder','financial') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, v_db_role)
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

-- ============================================================
-- B) Tables
-- ============================================================

-- 1) financial_providers
CREATE TABLE IF NOT EXISTS public.financial_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  company_name TEXT,
  entity_type TEXT CHECK (entity_type IN ('individual','proprietorship','partnership','private_limited')),
  services_offered TEXT[] DEFAULT '{}',
  pan_url TEXT,
  gst_url TEXT,
  rbi_registration TEXT,
  company_reg_cert_url TEXT,
  signatory_id_url TEXT,
  logo_url TEXT,
  kyc_status TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending','submitted','verified','rejected')),
  kyc_rejection_reason TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'inactive' CHECK (subscription_status IN ('active','inactive','expired')),
  subscription_expires_at TIMESTAMPTZ,
  rating NUMERIC(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  featured_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_providers TO authenticated;
GRANT SELECT ON public.financial_providers TO anon;
GRANT ALL ON public.financial_providers TO service_role;
ALTER TABLE public.financial_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fp_select_own_or_public" ON public.financial_providers FOR SELECT TO authenticated, anon
  USING (true);
CREATE POLICY "fp_modify_own" ON public.financial_providers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fp_admin_all" ON public.financial_providers FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 2) financial_branches
CREATE TABLE IF NOT EXISTS public.financial_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.financial_providers(id) ON DELETE CASCADE,
  head_office TEXT NOT NULL,
  branch_locations JSONB DEFAULT '[]'::jsonb,
  service_areas TEXT[] DEFAULT '{}',
  operating_states TEXT[] DEFAULT '{}',
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_branches TO authenticated;
GRANT SELECT ON public.financial_branches TO anon;
GRANT ALL ON public.financial_branches TO service_role;
ALTER TABLE public.financial_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fb_read_all" ON public.financial_branches FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "fb_write_own" ON public.financial_branches FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.financial_providers fp WHERE fp.id = provider_id AND fp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.financial_providers fp WHERE fp.id = provider_id AND fp.user_id = auth.uid()));

-- 3) financial_loan_applications
CREATE TABLE IF NOT EXISTS public.financial_loan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.financial_providers(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_phone TEXT,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  property_title TEXT,
  property_value NUMERIC(14,2),
  loan_amount NUMERIC(14,2) NOT NULL,
  tenure_months INTEGER,
  monthly_income NUMERIC(12,2),
  employment_type TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','documents_pending','under_review','approved','rejected','disbursed')),
  assigned_rm_id UUID,
  assigned_rm_name TEXT,
  sanction_letter_url TEXT,
  rejection_reason TEXT,
  disbursed_amount NUMERIC(14,2),
  disbursed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_loan_applications TO authenticated;
GRANT ALL ON public.financial_loan_applications TO service_role;
ALTER TABLE public.financial_loan_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fla_provider_all" ON public.financial_loan_applications FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.financial_providers fp WHERE fp.id = provider_id AND fp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.financial_providers fp WHERE fp.id = provider_id AND fp.user_id = auth.uid()));
CREATE POLICY "fla_buyer_read" ON public.financial_loan_applications FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id);
CREATE POLICY "fla_admin" ON public.financial_loan_applications FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 4) financial_loan_documents
CREATE TABLE IF NOT EXISTS public.financial_loan_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.financial_loan_applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_path TEXT,
  verified_status TEXT NOT NULL DEFAULT 'pending' CHECK (verified_status IN ('pending','verified','rejected','missing')),
  verified_by UUID,
  notes TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_loan_documents TO authenticated;
GRANT ALL ON public.financial_loan_documents TO service_role;
ALTER TABLE public.financial_loan_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fld_provider_all" ON public.financial_loan_documents FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.financial_loan_applications a
    JOIN public.financial_providers fp ON fp.id = a.provider_id
    WHERE a.id = application_id AND fp.user_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.financial_loan_applications a
    JOIN public.financial_providers fp ON fp.id = a.provider_id
    WHERE a.id = application_id AND fp.user_id = auth.uid()));

-- 5) financial_leads
CREATE TABLE IF NOT EXISTS public.financial_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_type TEXT NOT NULL CHECK (lead_type IN ('buyer','investor','agent_referral','builder_referral','hotel_financing')),
  customer_name TEXT NOT NULL,
  requirement TEXT,
  budget NUMERIC(14,2),
  location TEXT,
  city TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  source_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  price NUMERIC(8,2) NOT NULL DEFAULT 99,
  is_purchased BOOLEAN NOT NULL DEFAULT FALSE,
  purchased_by_provider_id UUID REFERENCES public.financial_providers(id) ON DELETE SET NULL,
  purchased_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.financial_leads TO authenticated;
GRANT ALL ON public.financial_leads TO service_role;
ALTER TABLE public.financial_leads ENABLE ROW LEVEL SECURITY;
-- Everyone authenticated can see leads (contact masked at app layer until purchased)
CREATE POLICY "leads_read_all_auth" ON public.financial_leads FOR SELECT TO authenticated USING (true);
-- Anyone authenticated may insert a lead (e.g. agent/builder referrals)
CREATE POLICY "leads_insert_auth" ON public.financial_leads FOR INSERT TO authenticated WITH CHECK (true);
-- Only the purchasing provider can update (purchase) via function
CREATE POLICY "leads_update_purchaser" ON public.financial_leads FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.financial_providers fp WHERE fp.id = purchased_by_provider_id AND fp.user_id = auth.uid()))
  WITH CHECK (true);

-- 6) financial_promotions
CREATE TABLE IF NOT EXISTS public.financial_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.financial_providers(id) ON DELETE CASCADE,
  package_type TEXT NOT NULL CHECK (package_type IN ('homepage_featured','top_search','preferred_partner','premium_verified')),
  amount NUMERIC(10,2) NOT NULL,
  duration_days INTEGER NOT NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_promotions TO authenticated;
GRANT SELECT ON public.financial_promotions TO anon;
GRANT ALL ON public.financial_promotions TO service_role;
ALTER TABLE public.financial_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fpromo_read_all" ON public.financial_promotions FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "fpromo_write_own" ON public.financial_promotions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.financial_providers fp WHERE fp.id = provider_id AND fp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.financial_providers fp WHERE fp.id = provider_id AND fp.user_id = auth.uid()));

-- 7) financial_team_members
CREATE TABLE IF NOT EXISTS public.financial_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.financial_providers(id) ON DELETE CASCADE,
  member_user_id UUID,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  team_role TEXT NOT NULL CHECK (team_role IN ('relationship_manager','document_verifier','admin')),
  performance JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_team_members TO authenticated;
GRANT ALL ON public.financial_team_members TO service_role;
ALTER TABLE public.financial_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ftm_provider_all" ON public.financial_team_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.financial_providers fp WHERE fp.id = provider_id AND fp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.financial_providers fp WHERE fp.id = provider_id AND fp.user_id = auth.uid()));

-- 8) financial_notifications
CREATE TABLE IF NOT EXISTS public.financial_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.financial_providers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  channel TEXT DEFAULT 'in_app' CHECK (channel IN ('in_app','email','sms','whatsapp','mobile')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_notifications TO authenticated;
GRANT ALL ON public.financial_notifications TO service_role;
ALTER TABLE public.financial_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fn_provider_all" ON public.financial_notifications FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.financial_providers fp WHERE fp.id = provider_id AND fp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.financial_providers fp WHERE fp.id = provider_id AND fp.user_id = auth.uid()));

-- ============================================================
-- C) updated_at triggers
-- ============================================================
CREATE TRIGGER trg_fp_updated_at BEFORE UPDATE ON public.financial_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fb_updated_at BEFORE UPDATE ON public.financial_branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fla_updated_at BEFORE UPDATE ON public.financial_loan_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fld_updated_at BEFORE UPDATE ON public.financial_loan_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ftm_updated_at BEFORE UPDATE ON public.financial_team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- D) RPC: purchase_financial_lead + check_financial_kyc
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_financial_kyc(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.financial_providers
                 WHERE user_id = _user_id AND kyc_status = 'verified');
$$;

CREATE OR REPLACE FUNCTION public.purchase_financial_lead(_lead_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_provider public.financial_providers%ROWTYPE;
  v_lead public.financial_leads%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  SELECT * INTO v_provider FROM public.financial_providers WHERE user_id = v_uid;
  IF v_provider.id IS NULL THEN RAISE EXCEPTION 'Financial provider profile not found'; END IF;
  IF v_provider.kyc_status <> 'verified' THEN RAISE EXCEPTION 'Complete KYC before purchasing leads'; END IF;

  SELECT * INTO v_lead FROM public.financial_leads WHERE id = _lead_id FOR UPDATE;
  IF v_lead.id IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF v_lead.is_purchased THEN RAISE EXCEPTION 'Lead already purchased'; END IF;

  -- Debit wallet (raises on insufficient funds)
  PERFORM public.decrement_wallet_balance(v_uid, v_lead.price,
    'Financial lead purchase', 'financial_lead:' || _lead_id::text);

  UPDATE public.financial_leads
    SET is_purchased = TRUE, purchased_by_provider_id = v_provider.id, purchased_at = now()
    WHERE id = _lead_id;

  INSERT INTO public.financial_notifications (provider_id, title, message, link)
    VALUES (v_provider.id, 'Lead purchased',
      'You unlocked contact for ' || v_lead.customer_name, '/dashboard/financial/leads');

  RETURN jsonb_build_object('success', true, 'lead_id', _lead_id, 'charged', v_lead.price);
END $$;
