-- 1. New lifecycle stages
ALTER TYPE public.property_lifecycle_status ADD VALUE IF NOT EXISTS 'country_queue';
ALTER TYPE public.property_lifecycle_status ADD VALUE IF NOT EXISTS 'country_hold';
ALTER TYPE public.property_lifecycle_status ADD VALUE IF NOT EXISTS 'country_verified';
ALTER TYPE public.property_lifecycle_status ADD VALUE IF NOT EXISTS 'state_queue';
ALTER TYPE public.property_lifecycle_status ADD VALUE IF NOT EXISTS 'state_hold';
ALTER TYPE public.property_lifecycle_status ADD VALUE IF NOT EXISTS 'state_verified';
ALTER TYPE public.property_lifecycle_status ADD VALUE IF NOT EXISTS 'district_queue';
ALTER TYPE public.property_lifecycle_status ADD VALUE IF NOT EXISTS 'district_hold';
ALTER TYPE public.property_lifecycle_status ADD VALUE IF NOT EXISTS 'district_verified';
ALTER TYPE public.property_lifecycle_status ADD VALUE IF NOT EXISTS 'owner_review';
ALTER TYPE public.property_lifecycle_status ADD VALUE IF NOT EXISTS 'sold';
ALTER TYPE public.property_lifecycle_status ADD VALUE IF NOT EXISTS 'closed';

-- 2. Property workflow columns
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS needs_agent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS queue_level text,
  ADD COLUMN IF NOT EXISTS queue_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS queue_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hold_admin_id uuid,
  ADD COLUMN IF NOT EXISTS hold_admin_role text,
  ADD COLUMN IF NOT EXISTS hold_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS hold_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by_admin_id uuid,
  ADD COLUMN IF NOT EXISTS verified_level text,
  ADD COLUMN IF NOT EXISTS owner_review_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE INDEX IF NOT EXISTS idx_properties_queue_level ON public.properties(queue_level);
CREATE INDEX IF NOT EXISTS idx_properties_hold_admin ON public.properties(hold_admin_id);

-- 3. Per-admin countdown timers
CREATE TABLE IF NOT EXISTS public.property_admin_timers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL,
  level text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  paused_at timestamptz,
  remaining_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, admin_id, level)
);
GRANT SELECT ON public.property_admin_timers TO authenticated;
GRANT ALL ON public.property_admin_timers TO service_role;
ALTER TABLE public.property_admin_timers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read own timers"
  ON public.property_admin_timers FOR SELECT TO authenticated
  USING (admin_id = auth.uid() OR public.is_admin(auth.uid()));

-- 4. Hold / release / reject audit trail
CREATE TABLE IF NOT EXISTS public.property_hold_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  admin_id uuid,
  level text,
  action text NOT NULL,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.property_hold_events TO authenticated;
GRANT ALL ON public.property_hold_events TO service_role;
ALTER TABLE public.property_hold_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and owners read hold events"
  ON public.property_hold_events FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR admin_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.submitted_by = auth.uid())
  );

-- 5. Super-admin configurable workflow rules
CREATE TABLE IF NOT EXISTS public.workflow_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_timer_minutes integer NOT NULL DEFAULT 30,
  state_timer_minutes integer NOT NULL DEFAULT 30,
  district_timer_minutes integer NOT NULL DEFAULT 30,
  max_hold_hours integer NOT NULL DEFAULT 48,
  visit_window_days integer NOT NULL DEFAULT 2,
  owner_approval_hours integer NOT NULL DEFAULT 48,
  auto_release_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workflow_settings TO authenticated, anon;
GRANT INSERT, UPDATE ON public.workflow_settings TO authenticated;
GRANT ALL ON public.workflow_settings TO service_role;
ALTER TABLE public.workflow_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read workflow settings"
  ON public.workflow_settings FOR SELECT USING (true);
CREATE POLICY "Super admin manages workflow settings"
  ON public.workflow_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.workflow_settings (id)
SELECT gen_random_uuid() WHERE NOT EXISTS (SELECT 1 FROM public.workflow_settings);

CREATE TRIGGER trg_timers_updated_at BEFORE UPDATE ON public.property_admin_timers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_workflow_settings_updated_at BEFORE UPDATE ON public.workflow_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();