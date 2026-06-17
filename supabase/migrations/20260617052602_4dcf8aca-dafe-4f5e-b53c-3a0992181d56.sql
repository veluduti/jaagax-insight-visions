
-- ============ PHASE 5: BADGES ============
CREATE TABLE public.badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  tier INTEGER NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  description TEXT,
  requirements JSONB DEFAULT '{}'::jsonb,
  min_properties INTEGER NOT NULL DEFAULT 0,
  min_reviews INTEGER NOT NULL DEFAULT 0,
  min_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badge_definitions TO anon, authenticated;
GRANT ALL ON public.badge_definitions TO service_role;
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badge defs readable by everyone" ON public.badge_definitions FOR SELECT USING (true);
CREATE POLICY "Admins manage badge defs" ON public.badge_definitions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER badge_definitions_updated_at BEFORE UPDATE ON public.badge_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_profile_id UUID NOT NULL REFERENCES public.builder_profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (builder_profile_id, badge_id)
);
CREATE INDEX user_badges_builder_idx ON public.user_badges(builder_profile_id);
CREATE INDEX user_badges_current_idx ON public.user_badges(builder_profile_id) WHERE is_current;
GRANT SELECT ON public.user_badges TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User badges public read" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "Builders manage their badges" ON public.user_badges FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.builder_profiles bp WHERE bp.id = builder_profile_id AND bp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.builder_profiles bp WHERE bp.id = builder_profile_id AND bp.user_id = auth.uid()));
CREATE POLICY "Admins manage all user badges" ON public.user_badges FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER user_badges_updated_at BEFORE UPDATE ON public.user_badges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed 8 tiers
INSERT INTO public.badge_definitions (name, tier, icon, color, description, min_properties, min_reviews, min_rating, requirements) VALUES
('Standard Agent', 1, 'Shield', '#9CA3AF', 'Default badge for new builders', 0, 0, 0, '{"kyc":false,"rera":false}'::jsonb),
('Blue Badge', 2, 'BadgeCheck', '#3B82F6', 'Completed KYC verification', 0, 0, 0, '{"kyc":true}'::jsonb),
('Verified Agent', 3, 'CheckCircle2', '#0EA5E9', 'RERA verified with 5+ properties', 5, 0, 0, '{"kyc":true,"rera":true}'::jsonb),
('Green Badge', 4, 'Award', '#10B981', '10+ properties with 3+ reviews at 4.0+', 10, 3, 4.0, '{"kyc":true,"rera":true}'::jsonb),
('Premium Agent', 5, 'Star', '#8B5CF6', '25+ properties with 10+ reviews at 4.5+', 25, 10, 4.5, '{"kyc":true,"rera":true}'::jsonb),
('Gold Badge', 6, 'Crown', '#F59E0B', '50+ properties with 25+ reviews at 4.5+', 50, 25, 4.5, '{"kyc":true,"rera":true}'::jsonb),
('Elite Partner', 7, 'Trophy', '#EF4444', '100+ properties with 50+ reviews at 4.8+', 100, 50, 4.8, '{"kyc":true,"rera":true}'::jsonb),
('Black Premium Badge', 8, 'Gem', '#111827', '200+ properties with 100+ reviews at 4.9+', 200, 100, 4.9, '{"kyc":true,"rera":true}'::jsonb);

-- ============ PHASE 6: REFERRAL ============
CREATE TABLE public.referral_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_profile_id UUID NOT NULL REFERENCES public.builder_profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  referral_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  max_referrals INTEGER,
  referral_code TEXT NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX referral_programs_builder_idx ON public.referral_programs(builder_profile_id);
CREATE INDEX referral_programs_code_idx ON public.referral_programs(referral_code);
GRANT SELECT ON public.referral_programs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.referral_programs TO authenticated;
GRANT ALL ON public.referral_programs TO service_role;
ALTER TABLE public.referral_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Referral programs public read" ON public.referral_programs FOR SELECT USING (true);
CREATE POLICY "Builders manage their referral programs" ON public.referral_programs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.builder_profiles bp WHERE bp.id = builder_profile_id AND bp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.builder_profiles bp WHERE bp.id = builder_profile_id AND bp.user_id = auth.uid()));
CREATE TRIGGER referral_programs_updated_at BEFORE UPDATE ON public.referral_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.referral_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_program_id UUID NOT NULL REFERENCES public.referral_programs(id) ON DELETE CASCADE,
  referrer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visitor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visit_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'clicked' CHECK (status IN ('clicked','visit_scheduled','deal_closed','paid')),
  commission_amount NUMERIC(12,2) DEFAULT 0,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX referral_tracking_program_idx ON public.referral_tracking(referral_program_id);
CREATE INDEX referral_tracking_referrer_idx ON public.referral_tracking(referrer_id);
GRANT SELECT, INSERT ON public.referral_tracking TO anon, authenticated;
GRANT UPDATE, DELETE ON public.referral_tracking TO authenticated;
GRANT ALL ON public.referral_tracking TO service_role;
ALTER TABLE public.referral_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can record a click" ON public.referral_tracking FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners/referrer/visitor read" ON public.referral_tracking FOR SELECT USING (
  referrer_id = auth.uid()
  OR visitor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.referral_programs rp
    JOIN public.builder_profiles bp ON bp.id = rp.builder_profile_id
    WHERE rp.id = referral_program_id AND bp.user_id = auth.uid()
  )
);
CREATE POLICY "Builders update tracking on their programs" ON public.referral_tracking FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.referral_programs rp
    JOIN public.builder_profiles bp ON bp.id = rp.builder_profile_id
    WHERE rp.id = referral_program_id AND bp.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.referral_programs rp
    JOIN public.builder_profiles bp ON bp.id = rp.builder_profile_id
    WHERE rp.id = referral_program_id AND bp.user_id = auth.uid()
  )
);
CREATE TRIGGER referral_tracking_updated_at BEFORE UPDATE ON public.referral_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
