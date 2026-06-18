
-- Property posts tracker (one free per month)
CREATE TABLE IF NOT EXISTS public.property_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  is_free_post boolean NOT NULL DEFAULT true,
  month_year text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_property_posts_user_month ON public.property_posts(user_id, month_year);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_posts TO authenticated;
GRANT ALL ON public.property_posts TO service_role;
ALTER TABLE public.property_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own posts" ON public.property_posts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User subscriptions
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_type text NOT NULL CHECK (plan_type IN ('free','pro','agent')),
  is_active boolean NOT NULL DEFAULT true,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  auto_renew boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON public.user_subscriptions(user_id, is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.user_subscriptions TO service_role;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subscriptions" ON public.user_subscriptions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_user_subscriptions_updated
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Assigned agents to properties
CREATE TABLE IF NOT EXISTS public.assigned_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','switched'))
);
CREATE INDEX IF NOT EXISTS idx_assigned_agents_property ON public.assigned_agents(property_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assigned_agents TO authenticated;
GRANT SELECT ON public.assigned_agents TO anon;
GRANT ALL ON public.assigned_agents TO service_role;
ALTER TABLE public.assigned_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read assigned agents" ON public.assigned_agents FOR SELECT USING (true);
CREATE POLICY "property owner manages agents" ON public.assigned_agents FOR ALL
  USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.submitted_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.submitted_by = auth.uid()));

-- Add is_premium column to properties (if missing)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;
