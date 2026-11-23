ALTER TABLE public.hotel_leads
  ADD COLUMN IF NOT EXISTS lead_type text NOT NULL DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS stay_type text,
  ADD COLUMN IF NOT EXISTS preferred_unit text,
  ADD COLUMN IF NOT EXISTS check_out_date date,
  ADD COLUMN IF NOT EXISTS guests int,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS verification jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS application_code text,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS hotel_leads_phone_idx ON public.hotel_leads(hotel_id, phone);

CREATE OR REPLACE FUNCTION public.hotel_lead_stamp()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.application_code IS NULL AND (NEW.lead_type = 'application' OR NEW.stage IN ('application','verification','approved','converted')) THEN
    NEW.application_code := 'APP-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 6));
  END IF;
  NEW.last_activity_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_hotel_lead_stamp BEFORE INSERT OR UPDATE ON public.hotel_leads FOR EACH ROW EXECUTE FUNCTION public.hotel_lead_stamp();
REVOKE EXECUTE ON FUNCTION public.hotel_lead_stamp() FROM PUBLIC, anon, authenticated;