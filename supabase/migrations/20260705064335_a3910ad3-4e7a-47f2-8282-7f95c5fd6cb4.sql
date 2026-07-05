
CREATE TABLE public.nl_land_parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  village_id UUID REFERENCES public.nl_villages(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  area_acres NUMERIC NOT NULL DEFAULT 0,
  soil_type TEXT,
  water_source TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  description TEXT,
  hero_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nl_land_parcels TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.nl_land_parcels TO authenticated;
GRANT ALL ON public.nl_land_parcels TO service_role;
ALTER TABLE public.nl_land_parcels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nl_parcels public read available" ON public.nl_land_parcels FOR SELECT
  USING (status IN ('available','partnered') OR owner_user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "nl_parcels owner insert" ON public.nl_land_parcels FOR INSERT WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "nl_parcels owner update" ON public.nl_land_parcels FOR UPDATE
  USING (owner_user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (owner_user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "nl_parcels owner delete" ON public.nl_land_parcels FOR DELETE
  USING (owner_user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE TRIGGER nl_parcels_updated BEFORE UPDATE ON public.nl_land_parcels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX ON public.nl_land_parcels(owner_user_id);
CREATE INDEX ON public.nl_land_parcels(village_id);

CREATE TABLE public.nl_land_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL REFERENCES public.nl_land_parcels(id) ON DELETE CASCADE,
  farmer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.nl_farms(id) ON DELETE SET NULL,
  revenue_share_pct NUMERIC NOT NULL DEFAULT 0,
  monthly_lease NUMERIC NOT NULL DEFAULT 0,
  starts_on DATE NOT NULL DEFAULT CURRENT_DATE,
  ends_on DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_land_partnerships TO authenticated;
GRANT ALL ON public.nl_land_partnerships TO service_role;
ALTER TABLE public.nl_land_partnerships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nl_partnerships read parties" ON public.nl_land_partnerships FOR SELECT
  USING (
    farmer_user_id = auth.uid() OR
    public.is_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM public.nl_land_parcels p WHERE p.id = parcel_id AND p.owner_user_id = auth.uid())
  );
CREATE POLICY "nl_partnerships owner insert" ON public.nl_land_partnerships FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.nl_land_parcels p WHERE p.id = parcel_id AND p.owner_user_id = auth.uid()));
CREATE POLICY "nl_partnerships parties update" ON public.nl_land_partnerships FOR UPDATE
  USING (
    farmer_user_id = auth.uid() OR
    public.is_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM public.nl_land_parcels p WHERE p.id = parcel_id AND p.owner_user_id = auth.uid())
  )
  WITH CHECK (
    farmer_user_id = auth.uid() OR
    public.is_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM public.nl_land_parcels p WHERE p.id = parcel_id AND p.owner_user_id = auth.uid())
  );
CREATE POLICY "nl_partnerships owner delete" ON public.nl_land_partnerships FOR DELETE
  USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.nl_land_parcels p WHERE p.id = parcel_id AND p.owner_user_id = auth.uid()));
CREATE TRIGGER nl_partnerships_updated BEFORE UPDATE ON public.nl_land_partnerships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX ON public.nl_land_partnerships(parcel_id);
CREATE INDEX ON public.nl_land_partnerships(farmer_user_id);
