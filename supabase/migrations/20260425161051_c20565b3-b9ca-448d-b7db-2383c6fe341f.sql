
-- ============================================
-- 1. PROFILES (main multi-role table)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('buyer', 'agent', 'builder')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, type)
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_type ON public.profiles(type);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users insert own profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Force builder profiles to pending (backend enforcement, not frontend)
CREATE OR REPLACE FUNCTION public.enforce_profile_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.type = 'builder' AND TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
  ELSIF NEW.type IN ('buyer', 'agent') AND TG_OP = 'INSERT' THEN
    NEW.status := 'active';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_profile_defaults
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_defaults();

-- ============================================
-- 2. USER SETTINGS (active profile persistence)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own settings"
  ON public.user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users upsert own settings"
  ON public.user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own settings"
  ON public.user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. ROLE-SPECIFIC PROFILE DATA TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS public.buyer_profiles (
  profile_id UUID NOT NULL PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT,
  preferred_cities TEXT[] DEFAULT '{}',
  budget_min NUMERIC,
  budget_max NUMERIC,
  preferred_bhk TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.buyer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages buyer profile"
  ON public.buyer_profiles FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = buyer_profiles.profile_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = buyer_profiles.profile_id AND p.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.agent_profiles (
  profile_id UUID NOT NULL PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT,
  agency_name TEXT,
  phone TEXT,
  cities_served TEXT,
  experience_years INTEGER DEFAULT 0,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages agent profile"
  ON public.agent_profiles FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = agent_profiles.profile_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = agent_profiles.profile_id AND p.user_id = auth.uid()));

CREATE POLICY "Public can view agent profiles"
  ON public.agent_profiles FOR SELECT
  TO public USING (true);

CREATE TABLE IF NOT EXISTS public.builder_profiles_data (
  profile_id UUID NOT NULL PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT,
  phone TEXT,
  city TEXT,
  rera_number TEXT,
  established_year INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_profiles_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages builder data"
  ON public.builder_profiles_data FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = builder_profiles_data.profile_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = builder_profiles_data.profile_id AND p.user_id = auth.uid()));

CREATE POLICY "Public can view builder data"
  ON public.builder_profiles_data FOR SELECT
  TO public USING (true);

-- ============================================
-- 4. HELPER FUNCTIONS
-- ============================================
-- Get active profile type (used by route guards / RLS in future)
CREATE OR REPLACE FUNCTION public.get_active_profile_type(_user_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.type
  FROM public.user_settings us
  JOIN public.profiles p ON p.id = us.active_profile_id
  WHERE us.user_id = _user_id
  LIMIT 1;
$$;

-- Check if user owns a profile (for backend validation)
CREATE OR REPLACE FUNCTION public.user_owns_profile(_user_id UUID, _profile_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _profile_id AND user_id = _user_id
  );
$$;

-- ============================================
-- 5. AUTO-MIGRATE EXISTING USERS
-- ============================================
-- Map existing user_roles to profiles (buyer/customer → buyer, agent → agent, builder → builder)
INSERT INTO public.profiles (user_id, type, status)
SELECT DISTINCT
  ur.user_id,
  CASE
    WHEN ur.role IN ('buyer', 'customer') THEN 'buyer'
    WHEN ur.role = 'agent' THEN 'agent'
    WHEN ur.role = 'builder' THEN 'builder'
  END AS type,
  'active' AS status
FROM public.user_roles ur
WHERE ur.role IN ('buyer', 'customer', 'agent', 'builder')
ON CONFLICT (user_id, type) DO NOTHING;

-- Set default active profile for migrated users (prefer builder > agent > buyer)
INSERT INTO public.user_settings (user_id, active_profile_id)
SELECT DISTINCT ON (p.user_id) p.user_id, p.id
FROM public.profiles p
ORDER BY p.user_id,
  CASE p.type WHEN 'builder' THEN 1 WHEN 'agent' THEN 2 WHEN 'buyer' THEN 3 END
ON CONFLICT (user_id) DO NOTHING;
