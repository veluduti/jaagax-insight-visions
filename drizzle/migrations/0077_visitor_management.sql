CREATE TABLE public.hotel_visitor_settings (
  hotel_id uuid PRIMARY KEY REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  visiting_start time NOT NULL DEFAULT '08:00',
  visiting_end time NOT NULL DEFAULT '21:00',
  max_per_host int NOT NULL DEFAULT 3,
  max_duration_minutes int NOT NULL DEFAULT 240,
  require_approval boolean NOT NULL DEFAULT true,
  require_id boolean NOT NULL DEFAULT false,
  pass_validity_hours int NOT NULL DEFAULT 6,
  restricted_areas text[] NOT NULL DEFAULT '{}',
  categories text[],
  retention_days int NOT NULL DEFAULT 365,
  pass_note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_visitor_settings TO authenticated;
GRANT ALL ON public.hotel_visitor_settings TO service_role;
ALTER TABLE public.hotel_visitor_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage visitor settings" ON public.hotel_visitor_settings FOR ALL TO authenticated
  USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));

CREATE TABLE public.hotel_visitor_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  reason text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  added_by uuid,
  removed_by uuid,
  removed_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz
);
CREATE INDEX hotel_visitor_blacklist_idx ON public.hotel_visitor_blacklist(hotel_id, phone) WHERE active;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_visitor_blacklist TO authenticated;
GRANT ALL ON public.hotel_visitor_blacklist TO service_role;
ALTER TABLE public.hotel_visitor_blacklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage blacklist" ON public.hotel_visitor_blacklist FOR ALL TO authenticated
  USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));

CREATE TABLE public.hotel_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  visitor_code text,
  name text NOT NULL,
  phone text,
  category text NOT NULL DEFAULT 'other',
  host_name text,
  long_stay_id uuid REFERENCES public.hotel_long_stays(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.hotel_bookings(id) ON DELETE SET NULL,
  area text,
  purpose text,
  entry_type text NOT NULL DEFAULT 'walk_in',
  status text NOT NULL DEFAULT 'pending',
  expected_at timestamptz,
  expected_out timestamptz,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  id_type text,
  id_verified boolean NOT NULL DEFAULT false,
  pass_code text NOT NULL DEFAULT encode(gen_random_bytes(9), 'hex'),
  pass_valid_until timestamptz,
  rating int CHECK (rating BETWEEN 1 AND 5),
  notes text,
  timeline jsonb NOT NULL DEFAULT '[]',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hotel_visitors_status_chk CHECK (status IN ('pending','approved','rejected','inside','checked_out','cancelled'))
);
CREATE INDEX hotel_visitors_hotel_idx ON public.hotel_visitors(hotel_id, status, created_at DESC);
CREATE UNIQUE INDEX hotel_visitors_pass_idx ON public.hotel_visitors(pass_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_visitors TO authenticated;
GRANT ALL ON public.hotel_visitors TO service_role;
ALTER TABLE public.hotel_visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage visitors" ON public.hotel_visitors FOR ALL TO authenticated
  USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.hotel_visitor_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.hotel_visitor_settings; n int;
BEGIN
  SELECT * INTO s FROM public.hotel_visitor_settings WHERE hotel_id = NEW.hotel_id;
  IF TG_OP = 'INSERT' THEN
    SELECT count(*) + 1 INTO n FROM public.hotel_visitors WHERE hotel_id = NEW.hotel_id;
    NEW.visitor_code := 'VIS-' || lpad(n::text, 6, '0');
    NEW.created_by := auth.uid();
    IF NEW.pass_valid_until IS NULL THEN
      NEW.pass_valid_until := coalesce(NEW.expected_out, coalesce(NEW.expected_at, now()) + make_interval(hours => coalesce(s.pass_validity_hours, 6)));
    END IF;
  END IF;
  IF NEW.phone IS NOT NULL AND NEW.status IN ('pending','approved','inside') AND EXISTS (
    SELECT 1 FROM public.hotel_visitor_blacklist b WHERE b.hotel_id = NEW.hotel_id AND b.active
      AND regexp_replace(b.phone, '\D', '', 'g') = regexp_replace(NEW.phone, '\D', '', 'g')) THEN
    RAISE EXCEPTION 'This visitor is blacklisted at this property';
  END IF;
  IF NEW.status = 'inside' AND (TG_OP = 'INSERT' OR OLD.status <> 'inside') THEN
    IF NEW.phone IS NOT NULL AND EXISTS (SELECT 1 FROM public.hotel_visitors v WHERE v.hotel_id = NEW.hotel_id AND v.status = 'inside' AND v.id <> NEW.id
        AND regexp_replace(v.phone, '\D', '', 'g') = regexp_replace(NEW.phone, '\D', '', 'g')) THEN
      RAISE EXCEPTION 'This visitor is already checked in';
    END IF;
    IF NEW.pass_valid_until IS NOT NULL AND NEW.pass_valid_until < now() THEN
      RAISE EXCEPTION 'Visitor pass has expired';
    END IF;
    IF s.max_per_host IS NOT NULL AND NEW.host_name IS NOT NULL AND (SELECT count(*) FROM public.hotel_visitors v WHERE v.hotel_id = NEW.hotel_id AND v.status = 'inside' AND v.id <> NEW.id AND lower(v.host_name) = lower(NEW.host_name)) >= s.max_per_host THEN
      RAISE EXCEPTION 'Visitor limit reached for %', NEW.host_name;
    END IF;
    NEW.checked_in_at := coalesce(NEW.checked_in_at, now());
  END IF;
  IF NEW.status = 'checked_out' AND (TG_OP = 'INSERT' OR OLD.status <> 'checked_out') THEN
    NEW.checked_out_at := coalesce(NEW.checked_out_at, now());
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_hotel_visitor_guard BEFORE INSERT OR UPDATE ON public.hotel_visitors FOR EACH ROW EXECUTE FUNCTION public.hotel_visitor_guard();
REVOKE EXECUTE ON FUNCTION public.hotel_visitor_guard() FROM PUBLIC, anon, authenticated;