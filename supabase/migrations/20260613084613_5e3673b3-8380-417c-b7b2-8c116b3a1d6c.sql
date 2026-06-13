
-- agent_kyc_verifications
CREATE TABLE IF NOT EXISTS public.agent_kyc_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aadhaar_front_url TEXT,
  aadhaar_back_url TEXT,
  pan_card_url TEXT,
  selfie_url TEXT,
  rera_certificate_url TEXT,
  business_proof_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  trust_score INT NOT NULL DEFAULT 0,
  verified_badge BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_kyc_verifications TO authenticated;
GRANT ALL ON public.agent_kyc_verifications TO service_role;
ALTER TABLE public.agent_kyc_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents manage own KYC" ON public.agent_kyc_verifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all agent KYC" ON public.agent_kyc_verifications FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins update agent KYC" ON public.agent_kyc_verifications FOR UPDATE USING (public.is_admin(auth.uid()));

-- agent_subscriptions
CREATE TABLE IF NOT EXISTS public.agent_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'free',
  plan_name TEXT,
  price NUMERIC(12,2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_subscriptions TO authenticated;
GRANT ALL ON public.agent_subscriptions TO service_role;
ALTER TABLE public.agent_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents manage own subscription" ON public.agent_subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all subscriptions" ON public.agent_subscriptions FOR SELECT USING (public.is_admin(auth.uid()));

-- agent_badges
CREATE TABLE IF NOT EXISTS public.agent_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_level INT NOT NULL DEFAULT 1,
  badge_name TEXT NOT NULL DEFAULT 'Standard Agent',
  badge_color TEXT NOT NULL DEFAULT 'gray',
  trust_score_required INT NOT NULL DEFAULT 0,
  sales_required INT NOT NULL DEFAULT 0,
  achieved_at TIMESTAMPTZ,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_badges TO authenticated;
GRANT ALL ON public.agent_badges TO service_role;
GRANT SELECT ON public.agent_badges TO anon;
ALTER TABLE public.agent_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read agent badges" ON public.agent_badges FOR SELECT USING (true);
CREATE POLICY "Agents manage own badges" ON public.agent_badges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- agent_success_logs
CREATE TABLE IF NOT EXISTS public.agent_success_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response_time_avg NUMERIC(8,2),
  conversion_rate NUMERIC(5,2),
  verified_listings INT,
  avg_customer_rating NUMERIC(3,2),
  visit_success_rate NUMERIC(5,2),
  success_score INT,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_success_logs TO authenticated;
GRANT ALL ON public.agent_success_logs TO service_role;
ALTER TABLE public.agent_success_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents manage own success logs" ON public.agent_success_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all success logs" ON public.agent_success_logs FOR SELECT USING (public.is_admin(auth.uid()));

-- agent_team_members
CREATE TABLE IF NOT EXISTS public.agent_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  member_name TEXT NOT NULL,
  member_phone TEXT,
  member_email TEXT,
  role TEXT NOT NULL DEFAULT 'team_member',
  assigned_leads JSONB NOT NULL DEFAULT '[]'::jsonb,
  performance_score INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_team_members TO authenticated;
GRANT ALL ON public.agent_team_members TO service_role;
ALTER TABLE public.agent_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents manage own team" ON public.agent_team_members FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- agent_referrals
CREATE TABLE IF NOT EXISTS public.agent_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_user_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_amount NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_referrals TO authenticated;
GRANT ALL ON public.agent_referrals TO service_role;
ALTER TABLE public.agent_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents manage own referrals" ON public.agent_referrals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- agent_promotions
CREATE TABLE IF NOT EXISTS public.agent_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  promotion_type TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_promotions TO authenticated;
GRANT ALL ON public.agent_promotions TO service_role;
ALTER TABLE public.agent_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents manage own promotions" ON public.agent_promotions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public view active promotions" ON public.agent_promotions FOR SELECT USING (status = 'active');

-- updated_at triggers
CREATE TRIGGER trg_agent_kyc_updated BEFORE UPDATE ON public.agent_kyc_verifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_agent_sub_updated BEFORE UPDATE ON public.agent_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_agent_team_updated BEFORE UPDATE ON public.agent_team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
