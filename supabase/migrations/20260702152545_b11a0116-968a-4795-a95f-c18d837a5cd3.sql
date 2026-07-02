
-- ============ STAFF & MULTI-PROPERTY ============
CREATE TABLE public.hotel_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','manager','front_desk','housekeeping')),
  invited_email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_staff TO authenticated;
GRANT ALL ON public.hotel_staff TO service_role;
ALTER TABLE public.hotel_staff ENABLE ROW LEVEL SECURITY;

-- Access helper: returns true if user owns the hotel OR is active staff
CREATE OR REPLACE FUNCTION public.user_has_hotel_access(_hotel_id uuid, _min_role text DEFAULT 'housekeeping')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.partner_hotels WHERE id = _hotel_id AND manager_id = auth.uid()
  ) OR EXISTS(
    SELECT 1 FROM public.hotel_staff
    WHERE hotel_id = _hotel_id AND user_id = auth.uid() AND is_active = true
  )
$$;

CREATE POLICY "staff view own hotel" ON public.hotel_staff FOR SELECT
  USING (public.user_owns_hotel(hotel_id) OR user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "owner manages staff" ON public.hotel_staff FOR ALL
  USING (public.user_owns_hotel(hotel_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.user_owns_hotel(hotel_id) OR public.is_admin(auth.uid()));

-- ============ DYNAMIC PRICING ============
CREATE TABLE public.hotel_pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('day_of_week','occupancy','lead_time','min_stay','date_range')),
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('percent','flat')),
  adjustment_value numeric NOT NULL DEFAULT 0,
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_on date,
  ends_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_pricing_rules TO authenticated;
GRANT ALL ON public.hotel_pricing_rules TO service_role;
GRANT SELECT ON public.hotel_pricing_rules TO anon;
ALTER TABLE public.hotel_pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active rules" ON public.hotel_pricing_rules FOR SELECT USING (is_active = true);
CREATE POLICY "team manages pricing rules" ON public.hotel_pricing_rules FOR ALL
  USING (public.user_has_hotel_access(hotel_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.user_has_hotel_access(hotel_id) OR public.is_admin(auth.uid()));

-- ============ PROMO CODES ============
CREATE TABLE public.hotel_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','flat')),
  discount_value numeric NOT NULL DEFAULT 0,
  valid_from date,
  valid_until date,
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  applicable_room_ids uuid[] DEFAULT '{}',
  min_nights integer DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_promo_codes TO authenticated;
GRANT ALL ON public.hotel_promo_codes TO service_role;
GRANT SELECT ON public.hotel_promo_codes TO anon;
ALTER TABLE public.hotel_promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active promos" ON public.hotel_promo_codes FOR SELECT USING (is_active = true);
CREATE POLICY "team manages promos" ON public.hotel_promo_codes FOR ALL
  USING (public.user_has_hotel_access(hotel_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.user_has_hotel_access(hotel_id) OR public.is_admin(auth.uid()));

-- ============ ADD-ONS ============
CREATE TABLE public.hotel_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('fnb','transport','experience','wellness','other')),
  price numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'per_booking',
  photo_url text,
  is_active boolean NOT NULL DEFAULT true,
  available_from time,
  available_to time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_addons TO authenticated;
GRANT ALL ON public.hotel_addons TO service_role;
GRANT SELECT ON public.hotel_addons TO anon;
ALTER TABLE public.hotel_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active addons" ON public.hotel_addons FOR SELECT USING (is_active = true);
CREATE POLICY "team manages addons" ON public.hotel_addons FOR ALL
  USING (public.user_has_hotel_access(hotel_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.user_has_hotel_access(hotel_id) OR public.is_admin(auth.uid()));

CREATE TABLE public.hotel_booking_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.hotel_bookings(id) ON DELETE CASCADE,
  addon_id uuid NOT NULL REFERENCES public.hotel_addons(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','confirmed','delivered','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_booking_addons TO authenticated;
GRANT ALL ON public.hotel_booking_addons TO service_role;
GRANT SELECT, INSERT ON public.hotel_booking_addons TO anon;
ALTER TABLE public.hotel_booking_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages booking addons" ON public.hotel_booking_addons FOR ALL
  USING (EXISTS (SELECT 1 FROM public.hotel_bookings b WHERE b.id = booking_id AND (public.user_has_hotel_access(b.hotel_id) OR b.user_id = auth.uid() OR public.is_admin(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.hotel_bookings b WHERE b.id = booking_id AND (public.user_has_hotel_access(b.hotel_id) OR b.user_id = auth.uid() OR public.is_admin(auth.uid()))));

-- ============ HOTEL_BOOKINGS EXTENSIONS ============
ALTER TABLE public.hotel_bookings
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS addon_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guest_portal_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkin_info jsonb DEFAULT '{}'::jsonb;

-- ============ GUEST PORTAL REQUESTS ============
CREATE TABLE public.guest_portal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.hotel_bookings(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('checkin','addon','message','feedback','other')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','cancelled')),
  handled_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_portal_requests TO authenticated;
GRANT SELECT, INSERT ON public.guest_portal_requests TO anon;
GRANT ALL ON public.guest_portal_requests TO service_role;
ALTER TABLE public.guest_portal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages guest requests" ON public.guest_portal_requests FOR ALL
  USING (public.user_has_hotel_access(hotel_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.user_has_hotel_access(hotel_id) OR public.is_admin(auth.uid()));
-- Anonymous guests can insert via edge function (service_role); no direct anon policy required beyond grants above.

-- ============ TRIGGERS ============
CREATE TRIGGER trg_hotel_staff_updated BEFORE UPDATE ON public.hotel_staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_hotel_pricing_rules_updated BEFORE UPDATE ON public.hotel_pricing_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_hotel_promo_codes_updated BEFORE UPDATE ON public.hotel_promo_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_hotel_addons_updated BEFORE UPDATE ON public.hotel_addons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_hotel_booking_addons_updated BEFORE UPDATE ON public.hotel_booking_addons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_guest_portal_requests_updated BEFORE UPDATE ON public.guest_portal_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indices
CREATE INDEX IF NOT EXISTS idx_hotel_staff_user ON public.hotel_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_hotel_pricing_rules_hotel ON public.hotel_pricing_rules(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_addons_hotel ON public.hotel_addons(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_booking_addons_booking ON public.hotel_booking_addons(booking_id);
CREATE INDEX IF NOT EXISTS idx_guest_portal_requests_hotel ON public.guest_portal_requests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_guest_token ON public.hotel_bookings(guest_portal_token);
