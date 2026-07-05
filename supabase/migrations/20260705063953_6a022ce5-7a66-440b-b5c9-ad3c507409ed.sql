
CREATE TABLE public.nl_farm_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.nl_farms(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  spent_on DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_farm_expenses TO authenticated;
GRANT ALL ON public.nl_farm_expenses TO service_role;
ALTER TABLE public.nl_farm_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nl_expenses owner all" ON public.nl_farm_expenses FOR ALL
  USING (EXISTS (SELECT 1 FROM public.nl_farms f WHERE f.id = farm_id AND (f.owner_user_id = auth.uid() OR public.is_admin(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.nl_farms f WHERE f.id = farm_id AND (f.owner_user_id = auth.uid() OR public.is_admin(auth.uid()))));
CREATE TRIGGER nl_expenses_updated BEFORE UPDATE ON public.nl_farm_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX ON public.nl_farm_expenses(farm_id);

CREATE TABLE public.nl_farm_harvests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.nl_farms(id) ON DELETE CASCADE,
  plot_id UUID REFERENCES public.nl_plots(id) ON DELETE SET NULL,
  crop_id UUID REFERENCES public.nl_crops(id) ON DELETE SET NULL,
  quantity_kg NUMERIC NOT NULL DEFAULT 0,
  quality_grade TEXT,
  harvest_date DATE NOT NULL DEFAULT CURRENT_DATE,
  price_per_kg NUMERIC,
  total_revenue NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_farm_harvests TO authenticated;
GRANT ALL ON public.nl_farm_harvests TO service_role;
ALTER TABLE public.nl_farm_harvests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nl_harvests owner all" ON public.nl_farm_harvests FOR ALL
  USING (EXISTS (SELECT 1 FROM public.nl_farms f WHERE f.id = farm_id AND (f.owner_user_id = auth.uid() OR public.is_admin(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.nl_farms f WHERE f.id = farm_id AND (f.owner_user_id = auth.uid() OR public.is_admin(auth.uid()))));
CREATE TRIGGER nl_harvests_updated BEFORE UPDATE ON public.nl_farm_harvests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX ON public.nl_farm_harvests(farm_id);
CREATE INDEX ON public.nl_farm_harvests(crop_id);
