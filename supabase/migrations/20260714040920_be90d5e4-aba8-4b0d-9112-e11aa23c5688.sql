
-- 1. Extend user_roles CHECK constraint to allow new admin sub-roles
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role = ANY (ARRAY['buyer','seller','agent','builder','financial','hotel_manager','admin','customer','driver','country_admin','state_admin','district_admin']));

-- 2. admin_scopes table — one row per admin user describing their territorial scope
CREATE TABLE IF NOT EXISTS public.admin_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('global_admin','country_admin','state_admin','district_admin')),
  country TEXT,
  state TEXT,
  district TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_scopes TO authenticated;
GRANT ALL ON public.admin_scopes TO service_role;

ALTER TABLE public.admin_scopes ENABLE ROW LEVEL SECURITY;

-- Helper: current user's admin role (highest priority global > country > state > district)
CREATE OR REPLACE FUNCTION public.get_admin_role(_user_id UUID)
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.admin_scopes
  WHERE user_id = _user_id AND is_active = true
  ORDER BY CASE role
    WHEN 'global_admin' THEN 1
    WHEN 'country_admin' THEN 2
    WHEN 'state_admin' THEN 3
    WHEN 'district_admin' THEN 4 END
  LIMIT 1;
$$;

-- Policies: users see their own scope; global admins manage all
CREATE POLICY "Users view own admin scope" ON public.admin_scopes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Global admins manage all scopes" ON public.admin_scopes
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Sub-admins can view scopes they created (for listing their downstream admins)
CREATE POLICY "Admins view scopes they created" ON public.admin_scopes
  FOR SELECT TO authenticated USING (created_by = auth.uid());

-- updated_at trigger
CREATE TRIGGER update_admin_scopes_updated_at
  BEFORE UPDATE ON public.admin_scopes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Auto-promote every existing global admin (role='admin' in user_roles)
INSERT INTO public.admin_scopes (user_id, role, country, state, district, is_active)
SELECT ur.user_id, 'global_admin', NULL, NULL, NULL, true
FROM public.user_roles ur
WHERE ur.role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;
