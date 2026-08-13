-- =========================================================
-- PHASE 2: HyperGuest-compatible superset model
-- =========================================================

-- ---------- helpers ----------
CREATE OR REPLACE FUNCTION public.hotel_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.is_hotel_member(_hotel_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.partner_hotels h WHERE h.id = _hotel_id AND h.manager_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.hotel_staff s WHERE s.hotel_id = _hotel_id AND s.user_id = _user_id AND s.is_active)
      OR public.is_admin(_user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_booking_participant(_booking_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hotel_bookings b
    WHERE b.id = _booking_id
      AND (b.user_id = _user_id OR public.is_hotel_member(b.hotel_id, _user_id))
  );
$$;

-- ---------- 4. HOTEL / PROPERTY ----------
ALTER TABLE public.partner_hotels
  ADD COLUMN IF NOT EXISTS hyperguest_property_id text,
  ADD COLUMN IF NOT EXISTS city_id text,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS region_name text,
  ADD COLUMN IF NOT EXISTS property_type text,
  ADD COLUMN IF NOT EXISTS property_type_name text,
  ADD COLUMN IF NOT EXISTS default_currency text NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS source_channel text NOT NULL DEFAULT 'jaaga';

CREATE UNIQUE INDEX IF NOT EXISTS partner_hotels_hg_property_id_key
  ON public.partner_hotels (hyperguest_property_id) WHERE hyperguest_property_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.hotel_remarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  remark text NOT NULL,
  language text,
  source text NOT NULL DEFAULT 'jaaga',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hotel_remarks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_remarks TO authenticated;
GRANT ALL ON public.hotel_remarks TO service_role;
ALTER TABLE public.hotel_remarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hotel_remarks public read" ON public.hotel_remarks FOR SELECT USING (true);
CREATE POLICY "hotel_remarks manage" ON public.hotel_remarks FOR ALL TO authenticated
  USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));
CREATE TRIGGER hotel_remarks_touch BEFORE UPDATE ON public.hotel_remarks
  FOR EACH ROW EXECUTE FUNCTION public.hotel_touch_updated_at();

-- ---------- 5. CHANNEL CONNECTION ----------
CREATE TABLE IF NOT EXISTS public.hotel_channel_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  channel text NOT NULL,
  channel_property_id text,
  status text NOT NULL DEFAULT 'pending',
  is_active boolean NOT NULL DEFAULT true,
  credentials_ref text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, channel)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_channel_connections TO authenticated;
GRANT ALL ON public.hotel_channel_connections TO service_role;
ALTER TABLE public.hotel_channel_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "channel connections manage" ON public.hotel_channel_connections FOR ALL TO authenticated
  USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));
CREATE TRIGGER hotel_channel_connections_touch BEFORE UPDATE ON public.hotel_channel_connections
  FOR EACH ROW EXECUTE FUNCTION public.hotel_touch_updated_at();

-- ---------- 6. ROOM MODEL ----------
ALTER TABLE public.hotel_rooms
  ADD COLUMN IF NOT EXISTS hyperguest_room_id text,
  ADD COLUMN IF NOT EXISTS hyperguest_room_type_code text,
  ADD COLUMN IF NOT EXISTS room_code text,
  ADD COLUMN IF NOT EXISTS room_name text,
  ADD COLUMN IF NOT EXISTS number_of_available_rooms integer,
  ADD COLUMN IF NOT EXISTS number_of_bedrooms integer,
  ADD COLUMN IF NOT EXISTS room_size numeric,
  ADD COLUMN IF NOT EXISTS room_size_unit text DEFAULT 'sqft',
  ADD COLUMN IF NOT EXISTS max_infants integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS number_of_beds integer,
  ADD COLUMN IF NOT EXISTS source_channel text NOT NULL DEFAULT 'jaaga';

CREATE UNIQUE INDEX IF NOT EXISTS hotel_rooms_hg_room_key
  ON public.hotel_rooms (hotel_id, hyperguest_room_id) WHERE hyperguest_room_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.room_bedding_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  type text NOT NULL,
  size text,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS room_bedding_room_idx ON public.room_bedding_configurations(room_id);
GRANT SELECT ON public.room_bedding_configurations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_bedding_configurations TO authenticated;
GRANT ALL ON public.room_bedding_configurations TO service_role;
ALTER TABLE public.room_bedding_configurations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bedding public read" ON public.room_bedding_configurations FOR SELECT USING (true);
CREATE POLICY "bedding manage" ON public.room_bedding_configurations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.hotel_rooms r WHERE r.id = room_id AND public.is_hotel_member(r.hotel_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.hotel_rooms r WHERE r.id = room_id AND public.is_hotel_member(r.hotel_id, auth.uid())));

-- ---------- 9./10. RATE PLANS ----------
ALTER TABLE public.hotel_rate_plans
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS rate_plan_code text,
  ADD COLUMN IF NOT EXISTS rate_plan_name text,
  ADD COLUMN IF NOT EXISTS external_rate_plan_ref text,
  ADD COLUMN IF NOT EXISTS hyperguest_rate_plan_id text,
  ADD COLUMN IF NOT EXISTS hyperguest_rate_plan_code text,
  ADD COLUMN IF NOT EXISTS board text NOT NULL DEFAULT 'RO',
  ADD COLUMN IF NOT EXISTS original_rate_plan_code text,
  ADD COLUMN IF NOT EXISTS virtual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_promotion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_package_rate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contract_id text,
  ADD COLUMN IF NOT EXISTS is_immediate boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS source_channel text NOT NULL DEFAULT 'jaaga',
  ADD COLUMN IF NOT EXISTS payment_charge text,
  ADD COLUMN IF NOT EXISTS payment_charge_type text,
  ADD COLUMN IF NOT EXISTS payment_snapshot jsonb;

UPDATE public.hotel_rate_plans SET rate_plan_name = COALESCE(rate_plan_name, name);
CREATE INDEX IF NOT EXISTS hotel_rate_plans_room_idx ON public.hotel_rate_plans(room_id);
CREATE UNIQUE INDEX IF NOT EXISTS hotel_rate_plans_hg_key
  ON public.hotel_rate_plans (hotel_id, hyperguest_rate_plan_id) WHERE hyperguest_rate_plan_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.rate_plan_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_plan_id uuid NOT NULL REFERENCES public.hotel_rate_plans(id) ON DELETE CASCADE,
  virtual boolean NOT NULL DEFAULT false,
  original_rate_plan_code text,
  is_promotion boolean NOT NULL DEFAULT false,
  is_package_rate boolean NOT NULL DEFAULT false,
  is_private boolean NOT NULL DEFAULT false,
  contract_id text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rate_plan_id)
);

CREATE TABLE IF NOT EXISTS public.rate_plan_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_plan_id uuid NOT NULL REFERENCES public.hotel_rate_plans(id) ON DELETE CASCADE,
  contract_id text NOT NULL,
  type text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rate_plan_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_plan_id uuid REFERENCES public.hotel_rate_plans(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.rate_plan_contracts(id) ON DELETE CASCADE,
  term_id text,
  name text,
  is_promotion boolean NOT NULL DEFAULT false,
  type text,
  term_ids jsonb,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rate_plan_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_plan_id uuid NOT NULL REFERENCES public.hotel_rate_plans(id) ON DELETE CASCADE,
  price_type text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  search_currency text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rate_plan_id, price_type)
);

CREATE TABLE IF NOT EXISTS public.rate_plan_taxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_plan_id uuid NOT NULL REFERENCES public.hotel_rate_plans(id) ON DELETE CASCADE,
  code text,
  name text,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  search_currency text,
  relation text,
  scope text,
  frequency text,
  calculation_type text,
  calculation_value numeric,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rate_plan_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_plan_id uuid NOT NULL REFERENCES public.hotel_rate_plans(id) ON DELETE CASCADE,
  code text,
  name text,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  search_currency text,
  relation text,
  scope text,
  frequency text,
  calculation_type text,
  calculation_value numeric,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rate_plan_remarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_plan_id uuid NOT NULL REFERENCES public.hotel_rate_plans(id) ON DELETE CASCADE,
  remark text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rate_plan_cancellation_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_plan_id uuid NOT NULL REFERENCES public.hotel_rate_plans(id) ON DELETE CASCADE,
  days_before integer,
  penalty_type text,
  amount numeric,
  currency text NOT NULL DEFAULT 'INR',
  time_from_check_in numeric,
  time_from_check_in_type text,
  cancellation_deadline_hour text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rate_plan_nightly_breakdown (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_plan_id uuid NOT NULL REFERENCES public.hotel_rate_plans(id) ON DELETE CASCADE,
  date date NOT NULL,
  net_price numeric, net_currency text,
  sell_price numeric, sell_currency text,
  commission_price numeric, commission_currency text,
  bar_price numeric, bar_currency text,
  taxes jsonb, fees jsonb, raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rate_plan_id, date)
);

-- Common policies for rate-plan child tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['rate_plan_info','rate_plan_contracts','rate_plan_terms','rate_plan_prices',
                           'rate_plan_taxes','rate_plan_fees','rate_plan_remarks',
                           'rate_plan_cancellation_policies','rate_plan_nightly_breakdown']
  LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "%s public read" ON public.%I FOR SELECT USING (true)', t, t);
    EXECUTE format($f$CREATE POLICY "%s manage" ON public.%I FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.hotel_rate_plans rp WHERE rp.id = rate_plan_id AND public.is_hotel_member(rp.hotel_id, auth.uid())))
      WITH CHECK (EXISTS (SELECT 1 FROM public.hotel_rate_plans rp WHERE rp.id = rate_plan_id AND public.is_hotel_member(rp.hotel_id, auth.uid())))$f$, t, t);
  END LOOP;
END $$;

-- ---------- 21./22. INVENTORY + RATE CALENDAR ----------
CREATE TABLE IF NOT EXISTS public.hotel_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  rate_plan_id uuid REFERENCES public.hotel_rate_plans(id) ON DELETE SET NULL,
  date date NOT NULL,
  total_units integer NOT NULL DEFAULT 0,
  available_units integer NOT NULL DEFAULT 0,
  booked_units integer NOT NULL DEFAULT 0,
  stop_sell boolean NOT NULL DEFAULT false,
  closed_to_arrival boolean NOT NULL DEFAULT false,
  closed_to_departure boolean NOT NULL DEFAULT false,
  min_stay integer,
  max_stay integer,
  source_channel text NOT NULL DEFAULT 'jaaga',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS hotel_inventory_key
  ON public.hotel_inventory (room_id, date, COALESCE(rate_plan_id, '00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT ON public.hotel_inventory TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_inventory TO authenticated;
GRANT ALL ON public.hotel_inventory TO service_role;
ALTER TABLE public.hotel_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory public read" ON public.hotel_inventory FOR SELECT USING (true);
CREATE POLICY "inventory manage" ON public.hotel_inventory FOR ALL TO authenticated
  USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));
CREATE TRIGGER hotel_inventory_touch BEFORE UPDATE ON public.hotel_inventory
  FOR EACH ROW EXECUTE FUNCTION public.hotel_touch_updated_at();

ALTER TABLE public.hotel_rate_calendar
  ADD COLUMN IF NOT EXISTS rate_plan_id uuid REFERENCES public.hotel_rate_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS closed_to_arrival boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS closed_to_departure boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_stay integer;

-- ---------- 25. EXTRA SERVICES (JAAGA-only) ----------
CREATE TABLE IF NOT EXISTS public.hotel_extra_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  service_type text NOT NULL,
  name text NOT NULL,
  description text,
  images text[] NOT NULL DEFAULT '{}',
  capacity integer,
  location text,
  price numeric,
  currency text NOT NULL DEFAULT 'INR',
  pricing_type text NOT NULL DEFAULT 'on_request',
  availability_type text NOT NULL DEFAULT 'enquiry',
  contact_phone text,
  contact_email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hotel_extra_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_extra_services TO authenticated;
GRANT ALL ON public.hotel_extra_services TO service_role;
ALTER TABLE public.hotel_extra_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "extra services public read" ON public.hotel_extra_services FOR SELECT USING (is_active OR public.is_hotel_member(hotel_id, auth.uid()));
CREATE POLICY "extra services manage" ON public.hotel_extra_services FOR ALL TO authenticated
  USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));
CREATE TRIGGER hotel_extra_services_touch BEFORE UPDATE ON public.hotel_extra_services
  FOR EACH ROW EXECUTE FUNCTION public.hotel_touch_updated_at();

CREATE TABLE IF NOT EXISTS public.hotel_extra_service_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.hotel_extra_services(id) ON DELETE SET NULL,
  user_id uuid,
  guest_name text NOT NULL,
  guest_email text,
  guest_phone text,
  event_date date,
  guests_count integer,
  message text,
  status text NOT NULL DEFAULT 'new',
  manager_response text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.hotel_extra_service_enquiries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_extra_service_enquiries TO authenticated;
GRANT ALL ON public.hotel_extra_service_enquiries TO service_role;
ALTER TABLE public.hotel_extra_service_enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enquiry create" ON public.hotel_extra_service_enquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "enquiry read own" ON public.hotel_extra_service_enquiries FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_hotel_member(hotel_id, auth.uid()));
CREATE POLICY "enquiry manage" ON public.hotel_extra_service_enquiries FOR UPDATE TO authenticated
  USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));
CREATE TRIGGER hotel_extra_service_enquiries_touch BEFORE UPDATE ON public.hotel_extra_service_enquiries
  FOR EACH ROW EXECUTE FUNCTION public.hotel_touch_updated_at();

-- ---------- 31./32. BOOKING MODEL ----------
ALTER TABLE public.hotel_bookings
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'jaaga',
  ADD COLUMN IF NOT EXISTS external_booking_id text,
  ADD COLUMN IF NOT EXISTS external_reference text,
  ADD COLUMN IF NOT EXISTS agency_reference text,
  ADD COLUMN IF NOT EXISTS rate_plan_id uuid REFERENCES public.hotel_rate_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS board text,
  ADD COLUMN IF NOT EXISTS infants integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS child_ages jsonb,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS cancellation_policy_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS fees_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxes_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_guest jsonb,
  ADD COLUMN IF NOT EXISTS external_status text;

CREATE UNIQUE INDEX IF NOT EXISTS hotel_bookings_idempotency_key_uniq
  ON public.hotel_bookings (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS hotel_bookings_external_id_idx ON public.hotel_bookings (external_booking_id);

CREATE TABLE IF NOT EXISTS public.booking_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.hotel_bookings(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.hotel_rooms(id) ON DELETE SET NULL,
  rate_plan_id uuid REFERENCES public.hotel_rate_plans(id) ON DELETE SET NULL,
  external_item_id text,
  external_room_id text,
  external_rate_plan_id text,
  room_code text, room_name text,
  rate_code text, rate_plan_name text,
  board text,
  status text NOT NULL DEFAULT 'confirmed',
  quantity integer NOT NULL DEFAULT 1,
  adults integer NOT NULL DEFAULT 1,
  children integer NOT NULL DEFAULT 0,
  infants integer NOT NULL DEFAULT 0,
  child_ages jsonb,
  extra_beds integer NOT NULL DEFAULT 0,
  meals jsonb,
  expected_price numeric, expected_currency text,
  final_price numeric, final_currency text,
  cancellation_policy_snapshot jsonb,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.hotel_bookings(id) ON DELETE CASCADE,
  booking_room_id uuid REFERENCES public.booking_rooms(id) ON DELETE CASCADE,
  external_guest_id text,
  is_lead_guest boolean NOT NULL DEFAULT false,
  guest_type text NOT NULL DEFAULT 'adult',
  title text, first_name text, last_name text,
  birth_date date, age integer,
  address text, city text, country text, nationality text,
  email text, phone text, state text, zip text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_special_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.hotel_bookings(id) ON DELETE CASCADE,
  booking_room_id uuid REFERENCES public.booking_rooms(id) ON DELETE CASCADE,
  request text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.hotel_bookings(id) ON DELETE CASCADE,
  reference_type text NOT NULL,
  reference_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_nightly_breakdown (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.hotel_bookings(id) ON DELETE CASCADE,
  booking_room_id uuid REFERENCES public.booking_rooms(id) ON DELETE CASCADE,
  date date NOT NULL,
  net_price numeric, net_currency text,
  sell_price numeric, sell_currency text,
  commission_price numeric, commission_currency text,
  bar_price numeric, bar_currency text,
  taxes jsonb, fees jsonb, raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_taxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.hotel_bookings(id) ON DELETE CASCADE,
  booking_room_id uuid REFERENCES public.booking_rooms(id) ON DELETE CASCADE,
  code text, name text, description text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  search_currency text, relation text, scope text, frequency text,
  calculation_type text, calculation_value numeric, raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.hotel_bookings(id) ON DELETE CASCADE,
  booking_room_id uuid REFERENCES public.booking_rooms(id) ON DELETE CASCADE,
  code text, name text, description text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  search_currency text, relation text, scope text, frequency text,
  calculation_type text, calculation_value numeric, raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_financial_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.hotel_bookings(id) ON DELETE CASCADE,
  model_type text NOT NULL DEFAULT 'booking',
  source text NOT NULL DEFAULT 'jaaga',
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_financial_model_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_model_id uuid NOT NULL REFERENCES public.booking_financial_models(id) ON DELETE CASCADE,
  key text, value text, item_order integer,
  price numeric, currency text,
  highlight boolean NOT NULL DEFAULT false,
  description text,
  calculation_type text, calculation_relation text,
  calculation_value numeric, calculation_currency text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_financial_item_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_item_id uuid NOT NULL REFERENCES public.booking_financial_model_items(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.hotel_bookings(id) ON DELETE CASCADE,
  external_transaction_id text,
  provider text NOT NULL DEFAULT 'jaaga',
  transaction_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.hotel_bookings(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.hotel_bookings(id) ON DELETE CASCADE,
  status text NOT NULL,
  source text NOT NULL DEFAULT 'jaaga',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.hotel_bookings(id) ON DELETE CASCADE,
  external_cancellation_id text,
  channel text NOT NULL DEFAULT 'jaaga',
  status text NOT NULL DEFAULT 'completed',
  reason text,
  cancelled_by uuid,
  policy_snapshot jsonb,
  penalty_amount numeric NOT NULL DEFAULT 0,
  refund_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  error_message text,
  raw_request jsonb, raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_modifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.hotel_bookings(id) ON DELETE CASCADE,
  external_modification_id text,
  modification_type text NOT NULL,
  old_data jsonb, new_data jsonb,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error_message text
);

-- Booking child-table policies: participants read, backend writes, managers manage.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['booking_rooms','booking_guests','booking_special_requests','booking_references',
                           'booking_nightly_breakdown','booking_taxes','booking_fees','booking_financial_models',
                           'booking_transactions','booking_metadata','booking_status_history',
                           'booking_cancellations','booking_modifications']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY "%s read" ON public.%I FOR SELECT TO authenticated
      USING (public.is_booking_participant(booking_id, auth.uid()))$f$, t, t);
    EXECUTE format($f$CREATE POLICY "%s manage" ON public.%I FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.hotel_bookings b WHERE b.id = booking_id AND public.is_hotel_member(b.hotel_id, auth.uid())))
      WITH CHECK (EXISTS (SELECT 1 FROM public.hotel_bookings b WHERE b.id = booking_id AND public.is_hotel_member(b.hotel_id, auth.uid())))$f$, t, t);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_financial_model_items TO authenticated;
GRANT ALL ON public.booking_financial_model_items TO service_role;
ALTER TABLE public.booking_financial_model_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financial items read" ON public.booking_financial_model_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.booking_financial_models m WHERE m.id = financial_model_id AND public.is_booking_participant(m.booking_id, auth.uid())));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_financial_item_tags TO authenticated;
GRANT ALL ON public.booking_financial_item_tags TO service_role;
ALTER TABLE public.booking_financial_item_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financial tags read" ON public.booking_financial_item_tags FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.booking_financial_model_items i
    JOIN public.booking_financial_models m ON m.id = i.financial_model_id
    WHERE i.id = financial_item_id AND public.is_booking_participant(m.booking_id, auth.uid())));

CREATE INDEX IF NOT EXISTS booking_rooms_booking_idx ON public.booking_rooms(booking_id);
CREATE INDEX IF NOT EXISTS booking_guests_booking_idx ON public.booking_guests(booking_id);
CREATE INDEX IF NOT EXISTS booking_status_history_idx ON public.booking_status_history(booking_id, created_at DESC);

-- ---------- 40. RAW CHANNEL PAYLOAD AUDIT ----------
CREATE TABLE IF NOT EXISTS public.channel_api_payloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES public.partner_hotels(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.hotel_bookings(id) ON DELETE SET NULL,
  channel text NOT NULL,
  operation text NOT NULL,
  endpoint text,
  request_payload jsonb,
  response_payload jsonb,
  http_status integer,
  request_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS channel_api_payloads_booking_idx ON public.channel_api_payloads(booking_id);
CREATE INDEX IF NOT EXISTS channel_api_payloads_op_idx ON public.channel_api_payloads(channel, operation, created_at DESC);
GRANT SELECT ON public.channel_api_payloads TO authenticated;
GRANT ALL ON public.channel_api_payloads TO service_role;
ALTER TABLE public.channel_api_payloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "channel payloads read" ON public.channel_api_payloads FOR SELECT TO authenticated
  USING ((hotel_id IS NOT NULL AND public.is_hotel_member(hotel_id, auth.uid())) OR public.is_admin(auth.uid()));