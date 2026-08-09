
-- 1. Room master extensions
ALTER TABLE public.hotel_rooms
  ADD COLUMN IF NOT EXISTS max_adults integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS max_children integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_extra_beds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS child_free_age_to integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS child_age_to integer NOT NULL DEFAULT 11;

-- 2. Hotel tax settings
ALTER TABLE public.partner_hotels
  ADD COLUMN IF NOT EXISTS gst_rate numeric;

-- 3. Meal configuration
CREATE TABLE IF NOT EXISTS public.hotel_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner')),
  pricing_mode text NOT NULL DEFAULT 'optional_paid' CHECK (pricing_mode IN ('optional_paid','included')),
  adult_price numeric NOT NULL DEFAULT 0,
  child_price numeric NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS hotel_meals_hotel_room_type_idx
  ON public.hotel_meals (hotel_id, COALESCE(room_id, '00000000-0000-0000-0000-000000000000'::uuid), meal_type);

GRANT SELECT ON public.hotel_meals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_meals TO authenticated;
GRANT ALL ON public.hotel_meals TO service_role;
ALTER TABLE public.hotel_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active meals" ON public.hotel_meals
  FOR SELECT USING (is_active = true);

CREATE POLICY "Hotel managers manage their meals" ON public.hotel_meals
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.partner_hotels h WHERE h.id = hotel_meals.hotel_id AND h.manager_id = auth.uid())
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.partner_hotels h WHERE h.id = hotel_meals.hotel_id AND h.manager_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE TRIGGER hotel_meals_touch BEFORE UPDATE ON public.hotel_meals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Booking billing fields
ALTER TABLE public.hotel_bookings
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.hotel_rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS adults integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS children integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_beds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meals jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS room_charges numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meal_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_bed_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_subtotal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_rate numeric,
  ADD COLUMN IF NOT EXISTS price_snapshot jsonb;

-- 5. Booking line items
CREATE TABLE IF NOT EXISTS public.hotel_booking_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.hotel_bookings(id) ON DELETE CASCADE,
  hotel_id uuid REFERENCES public.partner_hotels(id) ON DELETE SET NULL,
  item_type text NOT NULL CHECK (item_type IN ('room','breakfast','lunch','dinner','extra_bed','addon','discount','tax')),
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  units integer NOT NULL DEFAULT 1,
  adult_count integer NOT NULL DEFAULT 0,
  child_count integer NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  price_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hotel_booking_items_booking_idx ON public.hotel_booking_items(booking_id);

GRANT SELECT ON public.hotel_booking_items TO authenticated;
GRANT ALL ON public.hotel_booking_items TO service_role;
ALTER TABLE public.hotel_booking_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guests and hotels view booking items" ON public.hotel_booking_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.hotel_bookings b
      LEFT JOIN public.partner_hotels h ON h.id = b.hotel_id
      WHERE b.id = hotel_booking_items.booking_id
        AND (b.user_id = auth.uid() OR h.manager_id = auth.uid())
    )
    OR public.is_admin(auth.uid())
  );
