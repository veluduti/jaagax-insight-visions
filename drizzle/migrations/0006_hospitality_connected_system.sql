
CREATE TABLE public.partner_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL UNIQUE,
  display_name text NOT NULL,
  phone text, email text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_accounts TO authenticated;
GRANT ALL ON public.partner_accounts TO service_role;
ALTER TABLE public.partner_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own partner account" ON public.partner_accounts FOR ALL TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (owner_user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE TABLE public.partner_businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partner_accounts(id) ON DELETE CASCADE,
  legal_name text NOT NULL,
  gstin text, pan text,
  verification_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_businesses TO authenticated;
GRANT ALL ON public.partner_businesses TO service_role;
ALTER TABLE public.partner_businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own businesses" ON public.partner_businesses FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.partner_accounts p WHERE p.id = partner_id AND p.owner_user_id = auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.partner_accounts p WHERE p.id = partner_id AND p.owner_user_id = auth.uid()));

ALTER TABLE public.partner_hotels
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.partner_businesses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS type_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS quality_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

ALTER TABLE public.hotel_rate_plans
  ADD COLUMN IF NOT EXISTS weekly_price numeric,
  ADD COLUMN IF NOT EXISTS monthly_price numeric,
  ADD COLUMN IF NOT EXISTS min_stay_nights integer;

ALTER TABLE public.hotel_rooms
  ADD COLUMN IF NOT EXISTS monthly_price numeric,
  ADD COLUMN IF NOT EXISTS weekly_price numeric,
  ADD COLUMN IF NOT EXISTS sell_by text NOT NULL DEFAULT 'room';

-- Backfill: every existing manager gets a partner account + business, hotels linked
INSERT INTO public.partner_accounts (owner_user_id, display_name, phone, email)
SELECT DISTINCT ON (manager_id) manager_id, name, contact_phone, contact_email
FROM public.partner_hotels WHERE manager_id IS NOT NULL
ORDER BY manager_id, created_at
ON CONFLICT (owner_user_id) DO NOTHING;

INSERT INTO public.partner_businesses (partner_id, legal_name, verification_status)
SELECT pa.id, pa.display_name, 'verified' FROM public.partner_accounts pa
WHERE NOT EXISTS (SELECT 1 FROM public.partner_businesses b WHERE b.partner_id = pa.id);

UPDATE public.partner_hotels h SET business_id = b.id,
  onboarding_status = CASE WHEN h.is_active THEN 'published' ELSE h.onboarding_status END,
  published_at = CASE WHEN h.is_active THEN COALESCE(h.published_at, h.created_at) END
FROM public.partner_accounts pa JOIN public.partner_businesses b ON b.partner_id = pa.id
WHERE pa.owner_user_id = h.manager_id AND h.business_id IS NULL;

CREATE TABLE public.hotel_inventory_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  unit_kind text NOT NULL DEFAULT 'room',
  label text NOT NULL,
  floor text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, label)
);
GRANT SELECT ON public.hotel_inventory_units TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_inventory_units TO authenticated;
GRANT ALL ON public.hotel_inventory_units TO service_role;
ALTER TABLE public.hotel_inventory_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "units public read" ON public.hotel_inventory_units FOR SELECT USING (true);
CREATE POLICY "units manage" ON public.hotel_inventory_units FOR ALL TO authenticated
  USING (public.is_hotel_member(hotel_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()) OR public.is_admin(auth.uid()));

CREATE TABLE public.hotel_availability_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.hotel_inventory_units(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  units integer NOT NULL DEFAULT 1,
  reason text NOT NULL DEFAULT 'blocked',
  booking_id uuid REFERENCES public.hotel_bookings(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.hotel_availability_blocks (room_id, start_date, end_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_availability_blocks TO authenticated;
GRANT ALL ON public.hotel_availability_blocks TO service_role;
ALTER TABLE public.hotel_availability_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks manage" ON public.hotel_availability_blocks FOR ALL TO authenticated
  USING (public.is_hotel_member(hotel_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()) OR public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_block_dates() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.end_date <= NEW.start_date THEN RAISE EXCEPTION 'End date must be after start date'; END IF;
  IF NEW.units < 1 THEN RAISE EXCEPTION 'Units must be at least 1'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validate_block_dates BEFORE INSERT OR UPDATE ON public.hotel_availability_blocks
FOR EACH ROW EXECUTE FUNCTION public.validate_block_dates();

-- free units for a room across a date range (min over nights)
CREATE OR REPLACE FUNCTION public.room_free_units(_room_id uuid, _check_in date, _check_out date)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(MIN(
    GREATEST(COALESCE(r.total_units, r.number_of_available_rooms, 1)
      - COALESCE((SELECT SUM(b.units) FROM hotel_availability_blocks b
                  WHERE b.room_id = _room_id AND b.start_date <= d::date AND b.end_date > d::date), 0), 0)
  ), 0)::int
  FROM hotel_rooms r, generate_series(_check_in, _check_out - 1, interval '1 day') d
  WHERE r.id = _room_id
$$;
GRANT EXECUTE ON FUNCTION public.room_free_units(uuid,date,date) TO anon, authenticated;

-- double-booking protection: lock room row, check, insert block
CREATE OR REPLACE FUNCTION public.reserve_inventory(_booking_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bk hotel_bookings; free int; n int;
BEGIN
  SELECT * INTO bk FROM hotel_bookings WHERE id = _booking_id;
  IF bk.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF bk.user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin(auth.uid())
     AND NOT public.is_hotel_member(bk.hotel_id, auth.uid()) AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF bk.room_id IS NULL THEN RETURN jsonb_build_object('ok', true, 'skipped', 'no_room'); END IF;
  IF EXISTS (SELECT 1 FROM hotel_availability_blocks WHERE booking_id = _booking_id) THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;
  PERFORM 1 FROM hotel_rooms WHERE id = bk.room_id FOR UPDATE;
  n := GREATEST(COALESCE(bk.num_rooms, 1), 1);
  free := public.room_free_units(bk.room_id, bk.check_in::date, bk.check_out::date);
  IF free < n THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sorry, this room was just booked for those dates.', 'free', free);
  END IF;
  INSERT INTO hotel_availability_blocks (hotel_id, room_id, start_date, end_date, units, reason, booking_id, created_by)
  VALUES (bk.hotel_id, bk.room_id, bk.check_in::date, bk.check_out::date, n, 'booking', bk.id, auth.uid());
  RETURN jsonb_build_object('ok', true, 'free_after', free - n);
END $$;
GRANT EXECUTE ON FUNCTION public.reserve_inventory(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.release_inventory(_booking_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bk hotel_bookings; days_before int; refund numeric := 0; refundable boolean := true;
BEGIN
  SELECT * INTO bk FROM hotel_bookings WHERE id = _booking_id;
  IF bk.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF bk.user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin(auth.uid())
     AND NOT public.is_hotel_member(bk.hotel_id, auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF bk.rate_plan_id IS NOT NULL THEN
    SELECT COALESCE(is_refundable, true) INTO refundable FROM hotel_rate_plans WHERE id = bk.rate_plan_id;
  END IF;
  days_before := (bk.check_in::date - current_date);
  IF refundable AND bk.payment_status = 'paid' THEN
    refund := CASE WHEN days_before >= 2 THEN COALESCE(bk.amount_paid, bk.total_amount, 0)
                   WHEN days_before >= 1 THEN COALESCE(bk.amount_paid, bk.total_amount, 0) * 0.5
                   ELSE 0 END;
  END IF;
  DELETE FROM hotel_availability_blocks WHERE booking_id = _booking_id;
  UPDATE hotel_bookings SET status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(),
    refunded_amount = COALESCE(refunded_amount, refund) WHERE id = _booking_id;
  RETURN jsonb_build_object('ok', true, 'refund', refund, 'released', true);
END $$;
GRANT EXECUTE ON FUNCTION public.release_inventory(uuid) TO authenticated;

CREATE TABLE public.stay_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  source text NOT NULL DEFAULT 'search',
  location text, city text,
  latitude double precision, longitude double precision,
  check_in date, check_out date,
  adults integer NOT NULL DEFAULT 1, children integer NOT NULL DEFAULT 0,
  business_types text[] NOT NULL DEFAULT '{}',
  preferences text[] NOT NULL DEFAULT '{}',
  amenities text[] NOT NULL DEFAULT '{}',
  budget_max numeric,
  free_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.stay_requests TO authenticated;
GRANT ALL ON public.stay_requests TO service_role;
ALTER TABLE public.stay_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stay requests" ON public.stay_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "create stay requests" ON public.stay_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_request_id uuid NOT NULL REFERENCES public.stay_requests(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.hotel_rooms(id) ON DELETE SET NULL,
  score integer NOT NULL DEFAULT 0,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  price_quote numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.match_results (hotel_id, created_at DESC);
GRANT SELECT ON public.match_results TO authenticated;
GRANT ALL ON public.match_results TO service_role;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "match read" ON public.match_results FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR public.is_hotel_member(hotel_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.stay_requests s WHERE s.id = stay_request_id AND s.user_id = auth.uid()));

CREATE TABLE public.hospitality_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  entity text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.hospitality_audit_log TO authenticated;
GRANT ALL ON public.hospitality_audit_log TO service_role;
ALTER TABLE public.hospitality_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit admin read" ON public.hospitality_audit_log FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "audit insert self" ON public.hospitality_audit_log FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

-- quality score + onboarding computation
CREATE OR REPLACE FUNCTION public.compute_hotel_quality(_hotel_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE h partner_hotels; rooms int; priced int; checks jsonb; score int := 0;
BEGIN
  SELECT * INTO h FROM partner_hotels WHERE id = _hotel_id;
  IF h.id IS NULL THEN RETURN NULL; END IF;
  SELECT count(*), count(*) FILTER (WHERE COALESCE(base_price,0) > 0 OR COALESCE(monthly_price,0) > 0)
    INTO rooms, priced FROM hotel_rooms WHERE hotel_id = _hotel_id AND is_active IS DISTINCT FROM false;
  checks := jsonb_build_object(
    'business', h.business_id IS NOT NULL,
    'property', COALESCE(length(h.name),0) > 2 AND COALESCE(length(h.description),0) > 40,
    'location', h.latitude IS NOT NULL AND h.longitude IS NOT NULL,
    'type', COALESCE(array_length(h.business_types,1),0) > 0,
    'amenities', COALESCE(array_length(h.amenities,1),0) >= 3,
    'photos', COALESCE(array_length(h.images,1),0) >= 3,
    'rooms', rooms > 0,
    'pricing', rooms > 0 AND priced = rooms,
    'policies', h.check_in_time IS NOT NULL AND h.check_out_time IS NOT NULL,
    'verified', h.is_active IS TRUE);
  SELECT count(*) * 10 INTO score FROM jsonb_each(checks) WHERE value = 'true'::jsonb;
  RETURN jsonb_build_object('score', score, 'checks', checks);
END $$;
GRANT EXECUTE ON FUNCTION public.compute_hotel_quality(uuid) TO authenticated;
