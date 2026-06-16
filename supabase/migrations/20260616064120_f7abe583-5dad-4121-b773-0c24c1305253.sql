
-- =====================================================
-- BUILDER MODULE: PROJECT MANAGEMENT SCHEMA
-- =====================================================

-- ---------- PROJECTS ----------
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_profile_id UUID REFERENCES public.builder_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending_approval','approved','launched','under_construction','completed')),
  launch_date DATE,
  possession_date DATE,
  total_units INT,
  floors TEXT,
  towers INT,
  land_area TEXT,
  size_range TEXT,
  bhk_types TEXT,
  hero_image TEXT,
  master_plan_url TEXT,
  brochure_url TEXT,
  builder_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns that may be missing if table already exists
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS builder_profile_id UUID REFERENCES public.builder_profiles(id) ON DELETE CASCADE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS launch_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS total_units INT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS floors TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS towers INT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS land_area TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS size_range TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS hero_image TEXT;

-- ---------- PROJECT UNITS ----------
CREATE TABLE IF NOT EXISTS public.project_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  type TEXT,
  area_sqft INT,
  price DECIMAL,
  facing TEXT,
  floor_number INT,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available','booked','sold','reserved')),
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_amount DECIMAL,
  booked_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- CONSTRUCTION UPDATES ----------
CREATE TABLE IF NOT EXISTS public.construction_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  media_urls TEXT[],
  media_type TEXT CHECK (media_type IN ('photo','drone_video','milestone')),
  completion_percentage INT DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  milestone TEXT,
  is_delay BOOLEAN NOT NULL DEFAULT FALSE,
  delay_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- PROMOTION PLANS ----------
CREATE TABLE IF NOT EXISTS public.promotion_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tier TEXT CHECK (tier IN ('basic','featured','premium')),
  duration_days INT NOT NULL,
  price DECIMAL NOT NULL,
  benefits TEXT[],
  badge_label TEXT,
  search_boost INT NOT NULL DEFAULT 0,
  map_highlight BOOLEAN NOT NULL DEFAULT FALSE,
  homepage_featured BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- PROMOTIONS ----------
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_profile_id UUID REFERENCES public.builder_profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.promotion_plans(id) ON DELETE SET NULL,
  plan_name TEXT,
  tier TEXT,
  target_type TEXT CHECK (target_type IN ('project','property')),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  duration_days INT,
  amount_paid DECIMAL,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','failed','refunded')),
  payment_reference TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','expired','stopped')),
  search_boost INT NOT NULL DEFAULT 0,
  map_highlight BOOLEAN NOT NULL DEFAULT FALSE,
  homepage_featured BOOLEAN NOT NULL DEFAULT FALSE,
  badge_label TEXT,
  views_count INT NOT NULL DEFAULT 0,
  clicks_count INT NOT NULL DEFAULT 0,
  leads_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure missing columns on existing promotions
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS builder_profile_id UUID REFERENCES public.builder_profiles(id) ON DELETE CASCADE;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS plan_id UUID;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS plan_name TEXT;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS tier TEXT;

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_projects_builder_profile_id ON public.projects(builder_profile_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_units_project_id ON public.project_units(project_id);
CREATE INDEX IF NOT EXISTS idx_project_units_status ON public.project_units(status);

CREATE INDEX IF NOT EXISTS idx_construction_updates_project_id ON public.construction_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_construction_updates_created_at ON public.construction_updates(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promotions_builder_profile_id ON public.promotions(builder_profile_id);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON public.promotions(status);
CREATE INDEX IF NOT EXISTS idx_promotions_end_date ON public.promotions(end_date);

-- =====================================================
-- GRANTS
-- =====================================================
GRANT SELECT ON public.projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

GRANT SELECT ON public.project_units TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_units TO authenticated;
GRANT ALL ON public.project_units TO service_role;

GRANT SELECT ON public.construction_updates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.construction_updates TO authenticated;
GRANT ALL ON public.construction_updates TO service_role;

GRANT SELECT ON public.promotions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;

GRANT SELECT ON public.promotion_plans TO anon, authenticated;
GRANT ALL ON public.promotion_plans TO service_role;

-- =====================================================
-- ENABLE RLS
-- =====================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_plans ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- PROJECTS
DROP POLICY IF EXISTS "projects_builders_manage_own" ON public.projects;
CREATE POLICY "projects_builders_manage_own" ON public.projects
  FOR ALL TO authenticated
  USING (
    builder_profile_id IN (SELECT id FROM public.builder_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    builder_profile_id IN (SELECT id FROM public.builder_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "projects_public_view" ON public.projects;
CREATE POLICY "projects_public_view" ON public.projects
  FOR SELECT TO anon, authenticated
  USING (status IN ('launched','under_construction','completed'));

DROP POLICY IF EXISTS "projects_admins_view_all" ON public.projects;
CREATE POLICY "projects_admins_view_all" ON public.projects
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- PROJECT UNITS
DROP POLICY IF EXISTS "project_units_builders_manage" ON public.project_units;
CREATE POLICY "project_units_builders_manage" ON public.project_units
  FOR ALL TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.builder_profiles bp ON bp.id = p.builder_profile_id
      WHERE bp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.builder_profiles bp ON bp.id = p.builder_profile_id
      WHERE bp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "project_units_public_view" ON public.project_units;
CREATE POLICY "project_units_public_view" ON public.project_units
  FOR SELECT TO anon, authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE status IN ('launched','under_construction','completed')
    )
  );

-- CONSTRUCTION UPDATES
DROP POLICY IF EXISTS "construction_updates_builders_manage" ON public.construction_updates;
CREATE POLICY "construction_updates_builders_manage" ON public.construction_updates
  FOR ALL TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.builder_profiles bp ON bp.id = p.builder_profile_id
      WHERE bp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.builder_profiles bp ON bp.id = p.builder_profile_id
      WHERE bp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "construction_updates_public_view" ON public.construction_updates;
CREATE POLICY "construction_updates_public_view" ON public.construction_updates
  FOR SELECT TO anon, authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE status IN ('launched','under_construction','completed')
    )
  );

-- PROMOTIONS
DROP POLICY IF EXISTS "promotions_builders_manage" ON public.promotions;
CREATE POLICY "promotions_builders_manage" ON public.promotions
  FOR ALL TO authenticated
  USING (
    builder_profile_id IN (SELECT id FROM public.builder_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    builder_profile_id IN (SELECT id FROM public.builder_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "promotions_public_view_active" ON public.promotions;
CREATE POLICY "promotions_public_view_active" ON public.promotions
  FOR SELECT TO anon, authenticated
  USING (status = 'active');

-- PROMOTION PLANS
DROP POLICY IF EXISTS "promotion_plans_public_view" ON public.promotion_plans;
CREATE POLICY "promotion_plans_public_view" ON public.promotion_plans
  FOR SELECT TO anon, authenticated
  USING (is_active = TRUE);

-- =====================================================
-- TRIGGERS for updated_at
-- =====================================================
DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_promotions_updated_at ON public.promotions;
CREATE TRIGGER trg_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- VIEW: project_stats_view
-- =====================================================
DROP VIEW IF EXISTS public.project_stats_view;
CREATE VIEW public.project_stats_view AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.builder_name,
  p.status AS project_status,
  COUNT(u.id) AS total_units,
  COUNT(u.id) FILTER (WHERE u.status = 'available') AS available_units,
  COUNT(u.id) FILTER (WHERE u.status = 'booked') AS booked_units,
  COUNT(u.id) FILTER (WHERE u.status = 'sold') AS sold_units,
  COALESCE(SUM(u.price) FILTER (WHERE u.status = 'sold'), 0) AS revenue_generated
FROM public.projects p
LEFT JOIN public.project_units u ON u.project_id = p.id
GROUP BY p.id, p.name, p.builder_name, p.status;

GRANT SELECT ON public.project_stats_view TO anon, authenticated;

-- =====================================================
-- SEED: default promotion plans
-- =====================================================
INSERT INTO public.promotion_plans (name, tier, duration_days, price, benefits, badge_label, search_boost, map_highlight, homepage_featured, sort_order)
SELECT 'Basic Boost', 'basic', 30, 499,
  ARRAY['Higher search ranking','Boost badge'],
  'Boosted', 10, FALSE, FALSE, 1
WHERE NOT EXISTS (SELECT 1 FROM public.promotion_plans WHERE name = 'Basic Boost');

INSERT INTO public.promotion_plans (name, tier, duration_days, price, benefits, badge_label, search_boost, map_highlight, homepage_featured, sort_order)
SELECT 'Featured Listing', 'featured', 30, 999,
  ARRAY['Top search results','Map highlight','Featured badge'],
  'Featured', 25, TRUE, FALSE, 2
WHERE NOT EXISTS (SELECT 1 FROM public.promotion_plans WHERE name = 'Featured Listing');

INSERT INTO public.promotion_plans (name, tier, duration_days, price, benefits, badge_label, search_boost, map_highlight, homepage_featured, sort_order)
SELECT 'Premium Promotion', 'premium', 30, 1999,
  ARRAY['Homepage featured','Top search','Map highlight','Premium badge','Priority support'],
  'Premium', 50, TRUE, TRUE, 3
WHERE NOT EXISTS (SELECT 1 FROM public.promotion_plans WHERE name = 'Premium Promotion');
