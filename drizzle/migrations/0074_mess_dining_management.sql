CREATE TABLE public.hotel_meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  name text NOT NULL, meals text[] NOT NULL DEFAULT '{}', price numeric NOT NULL DEFAULT 0 CHECK (price >= 0),
  period text NOT NULL DEFAULT 'month' CHECK (period IN ('month','day','meal','stay')),
  diet text NOT NULL DEFAULT 'both' CHECK (diet IN ('veg','non_veg','both')),
  is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.hotel_meal_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  meal text NOT NULL, menu_date date, weekday smallint CHECK (weekday BETWEEN 0 AND 6),
  start_time time, end_time time, items text[] NOT NULL DEFAULT '{}', is_special boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.hotel_meal_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.hotel_meal_plans(id) ON DELETE SET NULL,
  long_stay_id uuid REFERENCES public.hotel_long_stays(id) ON DELETE SET NULL,
  person_name text NOT NULL, room_label text, diet text NOT NULL DEFAULT 'veg',
  start_date date NOT NULL DEFAULT current_date, end_date date, paused_until date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled')),
  price numeric NOT NULL DEFAULT 0, meal_credits integer NOT NULL DEFAULT 0, notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.hotel_meal_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.hotel_meal_subscriptions(id) ON DELETE CASCADE,
  person_name text, meal text NOT NULL, served_on date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'attended' CHECK (status IN ('attended','missed','skipped')),
  is_guest_meal boolean NOT NULL DEFAULT false, created_by uuid DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX hotel_meal_attendance_once ON public.hotel_meal_attendance (subscription_id, meal, served_on) WHERE subscription_id IS NOT NULL;
CREATE TABLE public.hotel_meal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  person_name text NOT NULL, room_label text, kind text NOT NULL DEFAULT 'extra_meal',
  meal text, for_date date NOT NULL DEFAULT current_date, quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  amount numeric NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','served','rejected')),
  rating smallint CHECK (rating BETWEEN 1 AND 5), notes text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.hotel_meal_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.hotel_meal_subscriptions(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount > 0), method text NOT NULL DEFAULT 'cash', period text, paid_on date NOT NULL DEFAULT current_date,
  reference text, created_by uuid DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_meal_plans, public.hotel_meal_menus, public.hotel_meal_subscriptions, public.hotel_meal_attendance, public.hotel_meal_requests, public.hotel_meal_payments TO authenticated;
GRANT ALL ON public.hotel_meal_plans, public.hotel_meal_menus, public.hotel_meal_subscriptions, public.hotel_meal_attendance, public.hotel_meal_requests, public.hotel_meal_payments TO service_role;
ALTER TABLE public.hotel_meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_meal_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_meal_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_meal_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_meal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_meal_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage meal plans" ON public.hotel_meal_plans FOR ALL TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));
CREATE POLICY "members manage meal menus" ON public.hotel_meal_menus FOR ALL TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));
CREATE POLICY "members manage meal subs" ON public.hotel_meal_subscriptions FOR ALL TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));
CREATE POLICY "members manage meal attendance" ON public.hotel_meal_attendance FOR ALL TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));
CREATE POLICY "members manage meal requests" ON public.hotel_meal_requests FOR ALL TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));
CREATE POLICY "members read meal payments" ON public.hotel_meal_payments FOR SELECT TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid()));
CREATE POLICY "members add meal payments" ON public.hotel_meal_payments FOR INSERT TO authenticated WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));