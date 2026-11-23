CREATE TABLE public.hotel_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text, email text,
  source text NOT NULL DEFAULT 'walk_in',
  stage text NOT NULL DEFAULT 'new',
  interest text, budget numeric, preferred_move_in date,
  assignee_name text, follow_up_at timestamptz, visit_at timestamptz,
  notes text,
  timeline jsonb NOT NULL DEFAULT '[]',
  converted_stay_id uuid REFERENCES public.hotel_long_stays(id) ON DELETE SET NULL,
  converted_booking_id uuid REFERENCES public.hotel_bookings(id) ON DELETE SET NULL,
  lost_reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hotel_leads_hotel_idx ON public.hotel_leads(hotel_id, stage);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_leads TO authenticated;
GRANT ALL ON public.hotel_leads TO service_role;
ALTER TABLE public.hotel_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage leads" ON public.hotel_leads FOR ALL TO authenticated
  USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));
CREATE TRIGGER trg_hotel_leads_touch BEFORE UPDATE ON public.hotel_leads FOR EACH ROW EXECUTE FUNCTION public.hotel_touch_updated_at();

ALTER TABLE public.hotel_long_stays
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS dob date,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS documents jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS timeline jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS checkout_notes text;