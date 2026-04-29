-- property_details: key-value store for any per-property field captured by the AI conversational listing flow
CREATE TABLE IF NOT EXISTS public.property_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_property_details_property ON public.property_details(property_id);

ALTER TABLE public.property_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view property_details"
  ON public.property_details FOR SELECT
  USING (true);

CREATE POLICY "Owners insert own property_details"
  ON public.property_details FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.submitted_by = auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Owners update own property_details"
  ON public.property_details FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.submitted_by = auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Owners delete own property_details"
  ON public.property_details FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.submitted_by = auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE TRIGGER trg_property_details_updated_at
  BEFORE UPDATE ON public.property_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();