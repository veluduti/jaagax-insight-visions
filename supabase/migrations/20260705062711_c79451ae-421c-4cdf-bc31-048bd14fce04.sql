
-- Volume 3: My Digital Farm — geography → farmer → farm → plot → crop → subscription

-- Geography
CREATE TABLE public.nl_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  hero_image_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nl_states TO anon, authenticated;
GRANT ALL ON public.nl_states TO service_role;
ALTER TABLE public.nl_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nl_states public read" ON public.nl_states FOR SELECT USING (true);
CREATE POLICY "nl_states admin write" ON public.nl_states FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.nl_districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id UUID NOT NULL REFERENCES public.nl_states(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  hero_image_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(state_id, slug)
);
GRANT SELECT ON public.nl_districts TO anon, authenticated;
GRANT ALL ON public.nl_districts TO service_role;
ALTER TABLE public.nl_districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nl_districts public read" ON public.nl_districts FOR SELECT USING (true);
CREATE POLICY "nl_districts admin write" ON public.nl_districts FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.nl_villages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID NOT NULL REFERENCES public.nl_districts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  population INT,
  latitude NUMERIC,
  longitude NUMERIC,
  hero_image_url TEXT,
  description TEXT,
  coordinator_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(district_id, slug)
);
GRANT SELECT ON public.nl_villages TO anon, authenticated;
GRANT ALL ON public.nl_villages TO service_role;
ALTER TABLE public.nl_villages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nl_villages public read" ON public.nl_villages FOR SELECT USING (true);
CREATE POLICY "nl_villages admin write" ON public.nl_villages FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Farms (owned by a farmer / land_owner user)
CREATE TABLE public.nl_farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  village_id UUID REFERENCES public.nl_villages(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  total_area_acres NUMERIC NOT NULL DEFAULT 0,
  certification TEXT,
  farming_method TEXT,
  description TEXT,
  hero_image_url TEXT,
  gallery JSONB DEFAULT '[]'::jsonb,
  latitude NUMERIC,
  longitude NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nl_farms TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.nl_farms TO authenticated;
GRANT ALL ON public.nl_farms TO service_role;
ALTER TABLE public.nl_farms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nl_farms public read approved" ON public.nl_farms FOR SELECT USING (status = 'approved' OR owner_user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "nl_farms owner insert" ON public.nl_farms FOR INSERT WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "nl_farms owner update" ON public.nl_farms FOR UPDATE USING (owner_user_id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (owner_user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "nl_farms owner delete" ON public.nl_farms FOR DELETE USING (owner_user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE TRIGGER nl_farms_updated BEFORE UPDATE ON public.nl_farms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Plots inside a farm
CREATE TABLE public.nl_plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.nl_farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size_acres NUMERIC NOT NULL DEFAULT 0,
  soil_type TEXT,
  water_source TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  description TEXT,
  hero_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nl_plots TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.nl_plots TO authenticated;
GRANT ALL ON public.nl_plots TO service_role;
ALTER TABLE public.nl_plots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nl_plots public read" ON public.nl_plots FOR SELECT USING (true);
CREATE POLICY "nl_plots owner write" ON public.nl_plots FOR ALL
  USING (EXISTS (SELECT 1 FROM public.nl_farms f WHERE f.id = farm_id AND (f.owner_user_id = auth.uid() OR public.is_admin(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.nl_farms f WHERE f.id = farm_id AND (f.owner_user_id = auth.uid() OR public.is_admin(auth.uid()))));
CREATE TRIGGER nl_plots_updated BEFORE UPDATE ON public.nl_plots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Crops planted on a plot
CREATE TABLE public.nl_crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID NOT NULL REFERENCES public.nl_plots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  variety TEXT,
  season TEXT,
  planted_at DATE,
  expected_harvest_at DATE,
  status TEXT NOT NULL DEFAULT 'growing',
  yield_kg NUMERIC,
  price_per_kg NUMERIC,
  hero_image_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nl_crops TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.nl_crops TO authenticated;
GRANT ALL ON public.nl_crops TO service_role;
ALTER TABLE public.nl_crops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nl_crops public read" ON public.nl_crops FOR SELECT USING (true);
CREATE POLICY "nl_crops owner write" ON public.nl_crops FOR ALL
  USING (EXISTS (SELECT 1 FROM public.nl_plots p JOIN public.nl_farms f ON f.id = p.farm_id WHERE p.id = plot_id AND (f.owner_user_id = auth.uid() OR public.is_admin(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.nl_plots p JOIN public.nl_farms f ON f.id = p.farm_id WHERE p.id = plot_id AND (f.owner_user_id = auth.uid() OR public.is_admin(auth.uid()))));
CREATE TRIGGER nl_crops_updated BEFORE UPDATE ON public.nl_crops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Subscription plans (customer subscribes to a farm/plot/crop)
CREATE TABLE public.nl_subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID REFERENCES public.nl_farms(id) ON DELETE CASCADE,
  plot_id UUID REFERENCES public.nl_plots(id) ON DELETE CASCADE,
  crop_id UUID REFERENCES public.nl_crops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'standard',
  frequency TEXT NOT NULL DEFAULT 'monthly',
  price INT NOT NULL,
  included_kg NUMERIC,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nl_subscription_plans TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.nl_subscription_plans TO authenticated;
GRANT ALL ON public.nl_subscription_plans TO service_role;
ALTER TABLE public.nl_subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nl_plans public read" ON public.nl_subscription_plans FOR SELECT USING (true);
CREATE POLICY "nl_plans owner write" ON public.nl_subscription_plans FOR ALL
  USING (
    public.is_admin(auth.uid()) OR
    (farm_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.nl_farms f WHERE f.id = farm_id AND f.owner_user_id = auth.uid()))
  )
  WITH CHECK (
    public.is_admin(auth.uid()) OR
    (farm_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.nl_farms f WHERE f.id = farm_id AND f.owner_user_id = auth.uid()))
  );
CREATE TRIGGER nl_plans_updated BEFORE UPDATE ON public.nl_subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Customer subscriptions
CREATE TABLE public.nl_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.nl_subscription_plans(id) ON DELETE RESTRICT,
  farm_id UUID REFERENCES public.nl_farms(id) ON DELETE SET NULL,
  plot_id UUID REFERENCES public.nl_plots(id) ON DELETE SET NULL,
  crop_id UUID REFERENCES public.nl_crops(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  starts_on DATE NOT NULL DEFAULT CURRENT_DATE,
  ends_on DATE,
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_pincode TEXT,
  amount_paid INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_subscriptions TO authenticated;
GRANT ALL ON public.nl_subscriptions TO service_role;
ALTER TABLE public.nl_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nl_subs customer read" ON public.nl_subscriptions FOR SELECT
  USING (
    customer_user_id = auth.uid() OR
    public.is_admin(auth.uid()) OR
    (farm_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.nl_farms f WHERE f.id = farm_id AND f.owner_user_id = auth.uid()))
  );
CREATE POLICY "nl_subs customer insert" ON public.nl_subscriptions FOR INSERT WITH CHECK (customer_user_id = auth.uid());
CREATE POLICY "nl_subs customer update" ON public.nl_subscriptions FOR UPDATE
  USING (customer_user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (customer_user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "nl_subs customer delete" ON public.nl_subscriptions FOR DELETE
  USING (customer_user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE TRIGGER nl_subs_updated BEFORE UPDATE ON public.nl_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helpful indexes
CREATE INDEX ON public.nl_districts(state_id);
CREATE INDEX ON public.nl_villages(district_id);
CREATE INDEX ON public.nl_farms(village_id);
CREATE INDEX ON public.nl_farms(owner_user_id);
CREATE INDEX ON public.nl_plots(farm_id);
CREATE INDEX ON public.nl_crops(plot_id);
CREATE INDEX ON public.nl_subscription_plans(farm_id);
CREATE INDEX ON public.nl_subscriptions(customer_user_id);

-- Seed a few states/districts/villages for demo browsing
INSERT INTO public.nl_states (name, slug, description) VALUES
  ('Telangana','telangana','Rice bowl of the Deccan with rich black soil villages.'),
  ('Karnataka','karnataka','Coffee, ragi and organic farming heartland.'),
  ('Maharashtra','maharashtra','Sugarcane, grapes and cotton belts.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.nl_districts (state_id, name, slug, description)
SELECT s.id, d.name, d.slug, d.description
FROM public.nl_states s
JOIN (VALUES
  ('telangana','Warangal','warangal','Cotton and rice heartland'),
  ('telangana','Medak','medak','Turmeric and millet villages'),
  ('karnataka','Mysuru','mysuru','Ragi and organic vegetables'),
  ('karnataka','Chikmagalur','chikmagalur','Coffee estates and spice farms'),
  ('maharashtra','Nashik','nashik','Grapes, onions and vineyards')
) AS d(state_slug, name, slug, description) ON d.state_slug = s.slug
ON CONFLICT DO NOTHING;

INSERT INTO public.nl_villages (district_id, name, slug, description, population)
SELECT d.id, v.name, v.slug, v.description, v.population
FROM public.nl_districts d
JOIN (VALUES
  ('warangal','Aatmakur','aatmakur','Organic paddy cluster',2400),
  ('warangal','Narsampet','narsampet','Community farming village',3100),
  ('medak','Toopran','toopran','Turmeric growers cooperative',1800),
  ('mysuru','Hunsur','hunsur','Ragi & vegetable belt',2900),
  ('chikmagalur','Mudigere','mudigere','Coffee estate hamlet',1600),
  ('nashik','Dindori','dindori','Grape growing village',4200)
) AS v(district_slug, name, slug, description, population) ON v.district_slug = d.slug
ON CONFLICT DO NOTHING;
