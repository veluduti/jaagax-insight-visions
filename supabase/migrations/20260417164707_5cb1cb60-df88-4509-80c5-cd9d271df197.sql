-- Promotion plans (catalog)
CREATE TABLE public.promotion_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tier text NOT NULL,
  duration_days integer NOT NULL,
  price numeric NOT NULL,
  benefits text[] DEFAULT '{}',
  badge_label text,
  search_boost integer DEFAULT 0,
  map_highlight boolean DEFAULT false,
  homepage_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.promotion_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON public.promotion_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage plans"
  ON public.promotion_plans FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Active promotions purchased by builders
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id uuid NOT NULL,
  plan_id uuid REFERENCES public.promotion_plans(id),
  project_id uuid,
  property_id uuid,
  target_type text NOT NULL CHECK (target_type IN ('project', 'property')),
  plan_name text NOT NULL,
  tier text NOT NULL,
  duration_days integer NOT NULL,
  amount_paid numeric NOT NULL,
  payment_status text NOT NULL DEFAULT 'paid',
  payment_reference text,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'stopped')),
  search_boost integer DEFAULT 0,
  map_highlight boolean DEFAULT false,
  homepage_featured boolean DEFAULT false,
  badge_label text,
  views_at_start integer DEFAULT 0,
  leads_at_start integer DEFAULT 0,
  views_count integer DEFAULT 0,
  leads_count integer DEFAULT 0,
  clicks_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_promotions_builder ON public.promotions(builder_id);
CREATE INDEX idx_promotions_status_end ON public.promotions(status, end_date);
CREATE INDEX idx_promotions_project ON public.promotions(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_promotions_property ON public.promotions(property_id) WHERE property_id IS NOT NULL;

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active promotions"
  ON public.promotions FOR SELECT
  USING (status = 'active' AND end_date > now());

CREATE POLICY "Builders view own promotions"
  ON public.promotions FOR SELECT
  TO authenticated
  USING (auth.uid() = builder_id);

CREATE POLICY "Builders create own promotions"
  ON public.promotions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = builder_id);

CREATE POLICY "Builders update own promotions"
  ON public.promotions FOR UPDATE
  TO authenticated
  USING (auth.uid() = builder_id);

CREATE POLICY "Admins manage all promotions"
  ON public.promotions FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Track interactions (views/clicks/leads) for promoted items
CREATE TABLE public.promotion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view', 'click', 'lead')),
  user_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_promo_events_promo ON public.promotion_events(promotion_id, event_type);

ALTER TABLE public.promotion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log promo events"
  ON public.promotion_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Builders view own promo events"
  ON public.promotion_events FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.promotions p WHERE p.id = promotion_id AND p.builder_id = auth.uid()));

-- Trigger: update counters on promotion_events insert
CREATE OR REPLACE FUNCTION public.bump_promotion_counter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.event_type = 'view' THEN
    UPDATE public.promotions SET views_count = views_count + 1, updated_at = now() WHERE id = NEW.promotion_id;
  ELSIF NEW.event_type = 'click' THEN
    UPDATE public.promotions SET clicks_count = clicks_count + 1, updated_at = now() WHERE id = NEW.promotion_id;
  ELSIF NEW.event_type = 'lead' THEN
    UPDATE public.promotions SET leads_count = leads_count + 1, updated_at = now() WHERE id = NEW.promotion_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bump_promotion_counter
  AFTER INSERT ON public.promotion_events
  FOR EACH ROW EXECUTE FUNCTION public.bump_promotion_counter();

-- updated_at trigger for promotions
CREATE TRIGGER trg_promotions_updated
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 3 default plans
INSERT INTO public.promotion_plans (name, tier, duration_days, price, benefits, badge_label, search_boost, map_highlight, homepage_featured, sort_order)
VALUES
  ('Basic Boost', 'basic', 7, 999,
    ARRAY['Increased visibility in search results', 'Boosted ranking for 7 days', 'Basic performance analytics'],
    'Boosted', 10, false, false, 1),
  ('Featured Listing', 'featured', 15, 2999,
    ARRAY['Appears at top of search results', '"Featured" highlight badge', 'Priority in recommendations', '15 days of premium exposure'],
    'Featured', 50, false, false, 2),
  ('Premium Promotion', 'premium', 30, 6999,
    ARRAY['Top placement in search', 'Highlighted pin on map', 'Included in homepage recommendations', 'Featured badge + priority leads', '30 days maximum exposure'],
    'Premium', 100, true, true, 3);