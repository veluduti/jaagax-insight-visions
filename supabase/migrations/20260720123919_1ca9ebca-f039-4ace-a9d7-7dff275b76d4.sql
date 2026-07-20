
CREATE OR REPLACE FUNCTION public.nl_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- CORE ONBOARDING
CREATE TABLE public.nl_onboarding_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'welcome',
  progress_pct INTEGER NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  last_step TEXT,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
CREATE INDEX idx_nl_onboarding_state_user ON public.nl_onboarding_state(user_id);
CREATE INDEX idx_nl_onboarding_state_stage ON public.nl_onboarding_state(stage);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_onboarding_state TO authenticated;
GRANT ALL ON public.nl_onboarding_state TO service_role;
ALTER TABLE public.nl_onboarding_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own onboarding state" ON public.nl_onboarding_state
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_nl_onboarding_state_touch BEFORE UPDATE ON public.nl_onboarding_state
  FOR EACH ROW EXECUTE FUNCTION public.nl_touch_updated_at();

CREATE TABLE public.nl_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  icon TEXT,
  category TEXT,
  persona_tags TEXT[] NOT NULL DEFAULT '{}',
  interview_pack_code TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nl_goals_active ON public.nl_goals(is_active, sort_order);
GRANT SELECT ON public.nl_goals TO anon, authenticated;
GRANT ALL ON public.nl_goals TO service_role;
ALTER TABLE public.nl_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active goals" ON public.nl_goals FOR SELECT USING (is_active = true);
CREATE TRIGGER trg_nl_goals_touch BEFORE UPDATE ON public.nl_goals FOR EACH ROW EXECUTE FUNCTION public.nl_touch_updated_at();

CREATE TABLE public.nl_user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.nl_goals(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 1,
  intent_level TEXT NOT NULL DEFAULT 'exploring',
  notes TEXT,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, goal_id)
);
CREATE INDEX idx_nl_user_goals_user ON public.nl_user_goals(user_id);
CREATE INDEX idx_nl_user_goals_goal ON public.nl_user_goals(goal_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_user_goals TO authenticated;
GRANT ALL ON public.nl_user_goals TO service_role;
ALTER TABLE public.nl_user_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user goals" ON public.nl_user_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_nl_user_goals_touch BEFORE UPDATE ON public.nl_user_goals FOR EACH ROW EXECUTE FUNCTION public.nl_touch_updated_at();

-- INTERVIEW ENGINE
CREATE TABLE public.nl_interview_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  persona_tags TEXT[] NOT NULL DEFAULT '{}',
  goal_codes TEXT[] NOT NULL DEFAULT '{}',
  estimated_minutes INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nl_interview_packs_active ON public.nl_interview_packs(is_active);
GRANT SELECT ON public.nl_interview_packs TO anon, authenticated;
GRANT ALL ON public.nl_interview_packs TO service_role;
ALTER TABLE public.nl_interview_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active packs" ON public.nl_interview_packs FOR SELECT USING (is_active = true);
CREATE TRIGGER trg_nl_interview_packs_touch BEFORE UPDATE ON public.nl_interview_packs FOR EACH ROW EXECUTE FUNCTION public.nl_touch_updated_at();

CREATE TABLE public.nl_question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  pack_id UUID REFERENCES public.nl_interview_packs(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  helper_text TEXT,
  question_type TEXT NOT NULL DEFAULT 'text',
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  applies_when JSONB NOT NULL DEFAULT '{}'::jsonb,
  weight NUMERIC NOT NULL DEFAULT 1,
  category TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  tags TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nl_question_bank_pack ON public.nl_question_bank(pack_id);
CREATE INDEX idx_nl_question_bank_active ON public.nl_question_bank(is_active, sort_order);
GRANT SELECT ON public.nl_question_bank TO anon, authenticated;
GRANT ALL ON public.nl_question_bank TO service_role;
ALTER TABLE public.nl_question_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active questions" ON public.nl_question_bank FOR SELECT USING (is_active = true);
CREATE TRIGGER trg_nl_question_bank_touch BEFORE UPDATE ON public.nl_question_bank FOR EACH ROW EXECUTE FUNCTION public.nl_touch_updated_at();

CREATE TABLE public.nl_interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_id UUID REFERENCES public.nl_interview_packs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  progress_pct INTEGER NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  current_question_code TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  derived_tags TEXT[] NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nl_interview_sessions_user ON public.nl_interview_sessions(user_id);
CREATE INDEX idx_nl_interview_sessions_status ON public.nl_interview_sessions(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_interview_sessions TO authenticated;
GRANT ALL ON public.nl_interview_sessions TO service_role;
ALTER TABLE public.nl_interview_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own interview sessions" ON public.nl_interview_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_nl_interview_sessions_touch BEFORE UPDATE ON public.nl_interview_sessions FOR EACH ROW EXECUTE FUNCTION public.nl_touch_updated_at();

CREATE TABLE public.nl_interview_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.nl_interview_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.nl_question_bank(id) ON DELETE SET NULL,
  question_code TEXT,
  question_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  role TEXT NOT NULL DEFAULT 'ai',
  answer JSONB,
  answer_text TEXT,
  skipped BOOLEAN NOT NULL DEFAULT false,
  confidence NUMERIC,
  turn_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nl_interview_turns_session ON public.nl_interview_turns(session_id, turn_index);
CREATE INDEX idx_nl_interview_turns_user ON public.nl_interview_turns(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_interview_turns TO authenticated;
GRANT ALL ON public.nl_interview_turns TO service_role;
ALTER TABLE public.nl_interview_turns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own interview turns" ON public.nl_interview_turns FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AI PROFILE
CREATE TABLE public.nl_ai_profile_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  field_type TEXT NOT NULL DEFAULT 'score',
  category TEXT,
  min_value NUMERIC,
  max_value NUMERIC,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nl_ai_profile_fields_active ON public.nl_ai_profile_fields(is_active, sort_order);
GRANT SELECT ON public.nl_ai_profile_fields TO anon, authenticated;
GRANT ALL ON public.nl_ai_profile_fields TO service_role;
ALTER TABLE public.nl_ai_profile_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active profile fields" ON public.nl_ai_profile_fields FOR SELECT USING (is_active = true);
CREATE TRIGGER trg_nl_ai_profile_fields_touch BEFORE UPDATE ON public.nl_ai_profile_fields FOR EACH ROW EXECUTE FUNCTION public.nl_touch_updated_at();

CREATE TABLE public.nl_ai_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.nl_interview_sessions(id) ON DELETE SET NULL,
  persona TEXT,
  summary TEXT,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  strengths TEXT[] NOT NULL DEFAULT '{}',
  risks TEXT[] NOT NULL DEFAULT '{}',
  readiness_score NUMERIC,
  risk_score NUMERIC,
  intent_score NUMERIC,
  raw_output JSONB NOT NULL DEFAULT '{}'::jsonb,
  model TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
CREATE INDEX idx_nl_ai_profiles_user ON public.nl_ai_profiles(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_ai_profiles TO authenticated;
GRANT ALL ON public.nl_ai_profiles TO service_role;
ALTER TABLE public.nl_ai_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai profile" ON public.nl_ai_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_nl_ai_profiles_touch BEFORE UPDATE ON public.nl_ai_profiles FOR EACH ROW EXECUTE FUNCTION public.nl_touch_updated_at();

CREATE TABLE public.nl_ai_profile_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.nl_ai_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nl_ai_profile_versions_profile ON public.nl_ai_profile_versions(profile_id, version);
CREATE INDEX idx_nl_ai_profile_versions_user ON public.nl_ai_profile_versions(user_id);
GRANT SELECT, INSERT ON public.nl_ai_profile_versions TO authenticated;
GRANT ALL ON public.nl_ai_profile_versions TO service_role;
ALTER TABLE public.nl_ai_profile_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile versions" ON public.nl_ai_profile_versions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RECOMMENDATIONS
CREATE TABLE public.nl_recommendations_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.nl_ai_profiles(id) ON DELETE SET NULL,
  item_type TEXT NOT NULL,
  item_id TEXT,
  item_ref UUID,
  title TEXT,
  score NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  matched_tags TEXT[] NOT NULL DEFAULT '{}',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  rank INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nl_reco_cache_user ON public.nl_recommendations_cache(user_id, rank);
CREATE INDEX idx_nl_reco_cache_type ON public.nl_recommendations_cache(item_type);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_recommendations_cache TO authenticated;
GRANT ALL ON public.nl_recommendations_cache TO service_role;
ALTER TABLE public.nl_recommendations_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recommendations" ON public.nl_recommendations_cache FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_nl_reco_cache_touch BEFORE UPDATE ON public.nl_recommendations_cache FOR EACH ROW EXECUTE FUNCTION public.nl_touch_updated_at();

CREATE TABLE public.nl_recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES public.nl_recommendations_cache(id) ON DELETE CASCADE,
  item_type TEXT,
  item_id TEXT,
  action TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nl_reco_feedback_user ON public.nl_recommendation_feedback(user_id);
CREATE INDEX idx_nl_reco_feedback_reco ON public.nl_recommendation_feedback(recommendation_id);
GRANT SELECT, INSERT ON public.nl_recommendation_feedback TO authenticated;
GRANT ALL ON public.nl_recommendation_feedback TO service_role;
ALTER TABLE public.nl_recommendation_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reco feedback" ON public.nl_recommendation_feedback FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- LANDING SIGNALS
CREATE TABLE public.nl_landing_signals_view (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  signal_type TEXT NOT NULL,
  section TEXT,
  goal_code TEXT,
  utm JSONB NOT NULL DEFAULT '{}'::jsonb,
  device JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nl_landing_signals_type ON public.nl_landing_signals_view(signal_type, created_at DESC);
CREATE INDEX idx_nl_landing_signals_user ON public.nl_landing_signals_view(user_id);
GRANT INSERT ON public.nl_landing_signals_view TO anon, authenticated;
GRANT SELECT ON public.nl_landing_signals_view TO authenticated;
GRANT ALL ON public.nl_landing_signals_view TO service_role;
ALTER TABLE public.nl_landing_signals_view ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can log landing signal" ON public.nl_landing_signals_view FOR INSERT WITH CHECK (true);
CREATE POLICY "admins read landing signals" ON public.nl_landing_signals_view FOR SELECT USING (public.is_admin(auth.uid()));

-- SEED
INSERT INTO public.nl_goals (code, title, subtitle, description, icon, category, persona_tags, sort_order) VALUES
  ('return_to_farming','Return to Farming','Live and farm your own land','Full-time or part-time farming on your own land, returning to roots.','sprout','lifestyle',ARRAY['farmer','nri','returnee'],1),
  ('passive_land_investment','Passive Land Investment','Own land, earn quietly','Buy managed farmland that generates yield without daily involvement.','trending-up','investment',ARRAY['investor','professional','nri'],2),
  ('weekend_farmhouse','Weekend Farmhouse','Escape the city on weekends','A second home on farmland for weekend getaways with family.','home','lifestyle',ARRAY['professional','family'],3),
  ('retirement_living','Retirement Living','Slow, natural retirement','A peaceful natural-living setup for retirement years.','sun','lifestyle',ARRAY['retiree','senior'],4),
  ('organic_produce_business','Organic Produce Business','Grow and sell organic','Build an organic farming business with market access.','leaf','business',ARRAY['entrepreneur','farmer'],5),
  ('community_living','Community Living','Live with like-minded people','Join or build a natural-living community of shared land and values.','users','lifestyle',ARRAY['community','family'],6),
  ('agri_tourism','Agri-Tourism','Host guests on your farm','Turn farmland into an agri-tourism or farmstay business.','tent','business',ARRAY['entrepreneur','hospitality'],7),
  ('legacy_land','Legacy Land for Family','Land that outlives you','Secure land as a long-term legacy asset for the next generation.','shield','investment',ARRAY['family','nri','investor'],8)
ON CONFLICT (code) DO NOTHING;
