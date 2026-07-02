
CREATE OR REPLACE FUNCTION public.user_owns_hotel(_hotel_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.partner_hotels WHERE id = _hotel_id AND manager_id = auth.uid())
$$;

CREATE TABLE public.hotel_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  room_type text NOT NULL,
  category text,
  description text,
  base_price numeric NOT NULL DEFAULT 0,
  max_occupancy integer NOT NULL DEFAULT 2,
  total_units integer NOT NULL DEFAULT 1,
  amenities jsonb DEFAULT '[]'::jsonb,
  photos text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_rooms TO authenticated;
GRANT ALL ON public.hotel_rooms TO service_role;
GRANT SELECT ON public.hotel_rooms TO anon;
ALTER TABLE public.hotel_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read rooms" ON public.hotel_rooms FOR SELECT USING (true);
CREATE POLICY "owner manages rooms" ON public.hotel_rooms FOR ALL
  USING (public.user_owns_hotel(hotel_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.user_owns_hotel(hotel_id) OR public.is_admin(auth.uid()));

CREATE TABLE public.hotel_rate_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  date date NOT NULL,
  price numeric,
  available_units integer,
  stop_sell boolean NOT NULL DEFAULT false,
  min_stay integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_rate_calendar TO authenticated;
GRANT ALL ON public.hotel_rate_calendar TO service_role;
ALTER TABLE public.hotel_rate_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages rate calendar" ON public.hotel_rate_calendar FOR ALL
  USING (public.user_owns_hotel(hotel_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.user_owns_hotel(hotel_id) OR public.is_admin(auth.uid()));

CREATE TABLE public.hotel_rate_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  adjustment_type text NOT NULL DEFAULT 'percent' CHECK (adjustment_type IN ('percent','flat')),
  adjustment_value numeric NOT NULL DEFAULT 0,
  is_refundable boolean NOT NULL DEFAULT true,
  conditions jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_rate_plans TO authenticated;
GRANT ALL ON public.hotel_rate_plans TO service_role;
ALTER TABLE public.hotel_rate_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages rate plans" ON public.hotel_rate_plans FOR ALL
  USING (public.user_owns_hotel(hotel_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.user_owns_hotel(hotel_id) OR public.is_admin(auth.uid()));

CREATE TABLE public.hotel_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  tags text[] DEFAULT '{}',
  total_bookings integer NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  last_stay_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_guests TO authenticated;
GRANT ALL ON public.hotel_guests TO service_role;
ALTER TABLE public.hotel_guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages guests" ON public.hotel_guests FOR ALL
  USING (public.user_owns_hotel(hotel_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.user_owns_hotel(hotel_id) OR public.is_admin(auth.uid()));

CREATE TABLE public.hotel_booking_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.hotel_bookings(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  author_id uuid,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_booking_notes TO authenticated;
GRANT ALL ON public.hotel_booking_notes TO service_role;
ALTER TABLE public.hotel_booking_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages booking notes" ON public.hotel_booking_notes FOR ALL
  USING (public.user_owns_hotel(hotel_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.user_owns_hotel(hotel_id) OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_hotel_rooms_updated BEFORE UPDATE ON public.hotel_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_hotel_rate_calendar_updated BEFORE UPDATE ON public.hotel_rate_calendar
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_hotel_rate_plans_updated BEFORE UPDATE ON public.hotel_rate_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_hotel_guests_updated BEFORE UPDATE ON public.hotel_guests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_hotel_rooms_hotel ON public.hotel_rooms(hotel_id);
CREATE INDEX idx_rate_calendar_room_date ON public.hotel_rate_calendar(room_id, date);
CREATE INDEX idx_rate_calendar_hotel_date ON public.hotel_rate_calendar(hotel_id, date);
CREATE INDEX idx_rate_plans_hotel ON public.hotel_rate_plans(hotel_id);
CREATE INDEX idx_hotel_guests_hotel ON public.hotel_guests(hotel_id);
CREATE INDEX idx_hotel_booking_notes_booking ON public.hotel_booking_notes(booking_id);
