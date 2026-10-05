ALTER TABLE public.hotel_partner_applications ADD COLUMN IF NOT EXISTS business_types text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.partner_hotels ADD COLUMN IF NOT EXISTS business_types text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.partner_hotels ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS stay_unit text NOT NULL DEFAULT 'room';
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS min_stay_nights integer;
UPDATE public.hotel_partner_applications SET business_types = ARRAY[business_type] WHERE business_type IS NOT NULL AND business_type <> '' AND business_types = '{}';
UPDATE public.partner_hotels h SET business_types = a.business_types FROM public.hotel_partner_applications a WHERE a.approved_hotel_id = h.id AND h.business_types = '{}';
ALTER TABLE public.hotel_rooms ADD CONSTRAINT hotel_rooms_stay_unit_chk CHECK (stay_unit IN ('room','bed','unit'));
CREATE INDEX IF NOT EXISTS partner_hotels_business_types_idx ON public.partner_hotels USING gin (business_types);

CREATE TABLE public.hotel_user_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type text NOT NULL CHECK (signal_type IN ('search','view','shortlist','book')),
  hotel_id uuid,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.hotel_user_signals TO authenticated;
GRANT ALL ON public.hotel_user_signals TO service_role;
ALTER TABLE public.hotel_user_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own signals read" ON public.hotel_user_signals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own signals insert" ON public.hotel_user_signals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own signals delete" ON public.hotel_user_signals FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX hotel_user_signals_user_idx ON public.hotel_user_signals (user_id, created_at DESC);