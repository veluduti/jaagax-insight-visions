CREATE TABLE public.hyperguest_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agency_reference text NOT NULL UNIQUE,
  hg_booking_id bigint,
  property_id bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  test_label text,
  check_in date NOT NULL,
  check_out date NOT NULL,
  nationality text,
  currency text,
  total_amount numeric,
  total_currency text,
  rooms jsonb NOT NULL DEFAULT '[]'::jsonb,
  cancellation jsonb,
  special_requests text,
  raw jsonb,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hyperguest_bookings TO authenticated;
GRANT ALL ON public.hyperguest_bookings TO service_role;
ALTER TABLE public.hyperguest_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin read hyperguest bookings" ON public.hyperguest_bookings
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));