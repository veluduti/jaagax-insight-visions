-- 1. Main booking table
CREATE TABLE public.weekend_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  budget_min NUMERIC,
  budget_max NUMERIC,
  property_type TEXT,
  preferred_locations TEXT[] DEFAULT '{}',
  bhk_preference TEXT,
  selected_property_ids UUID[] DEFAULT '{}',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  hotel_id UUID,
  hotel_tier TEXT, -- 'budget' | 'premium' | 'skip'
  include_transport BOOLEAN DEFAULT true,
  include_agent_assistance BOOLEAN DEFAULT true,
  estimated_total NUMERIC DEFAULT 0,
  final_total NUMERIC,
  booking_amount NUMERIC, -- 10-20% advance
  payment_status TEXT NOT NULL DEFAULT 'unpaid', -- unpaid | partial | paid
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,
  agent_id UUID,
  agent_notes TEXT,
  buyer_notes TEXT,
  rejection_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending_confirmation',
  -- statuses: pending_confirmation, agent_review, awaiting_payment, confirmed, in_progress, completed, cancelled
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_weekend_bookings_buyer ON public.weekend_bookings(buyer_id);
CREATE INDEX idx_weekend_bookings_agent ON public.weekend_bookings(agent_id);
CREATE INDEX idx_weekend_bookings_status ON public.weekend_bookings(status);

ALTER TABLE public.weekend_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers create own bookings"
  ON public.weekend_bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers view own bookings"
  ON public.weekend_bookings FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id);

CREATE POLICY "Buyers update own bookings"
  ON public.weekend_bookings FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id);

CREATE POLICY "Assigned agent views bookings"
  ON public.weekend_bookings FOR SELECT TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Assigned agent updates bookings"
  ON public.weekend_bookings FOR UPDATE TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage all weekend bookings"
  ON public.weekend_bookings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_weekend_bookings_updated_at
  BEFORE UPDATE ON public.weekend_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Itinerary items
CREATE TABLE public.weekend_booking_itinerary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.weekend_bookings(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  item_type TEXT NOT NULL, -- visit | hotel_checkin | hotel_checkout | transport | meal | other
  start_time TEXT,
  end_time TEXT,
  property_id UUID,
  title TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_itinerary_booking ON public.weekend_booking_itinerary(booking_id);

ALTER TABLE public.weekend_booking_itinerary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers view own itinerary"
  ON public.weekend_booking_itinerary FOR SELECT TO authenticated
  USING (booking_id IN (SELECT id FROM public.weekend_bookings WHERE buyer_id = auth.uid()));

CREATE POLICY "Agent manages assigned itinerary"
  ON public.weekend_booking_itinerary FOR ALL TO authenticated
  USING (booking_id IN (
    SELECT wb.id FROM public.weekend_bookings wb
    JOIN public.agents a ON a.id = wb.agent_id
    WHERE a.user_id = auth.uid()
  ))
  WITH CHECK (booking_id IN (
    SELECT wb.id FROM public.weekend_bookings wb
    JOIN public.agents a ON a.id = wb.agent_id
    WHERE a.user_id = auth.uid()
  ));

CREATE POLICY "Admins manage all itinerary"
  ON public.weekend_booking_itinerary FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_itinerary_updated_at
  BEFORE UPDATE ON public.weekend_booking_itinerary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Activity log
CREATE TABLE public.weekend_booking_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.weekend_bookings(id) ON DELETE CASCADE,
  actor_id UUID,
  actor_role TEXT, -- buyer | agent | admin | system
  action TEXT NOT NULL, -- booking_created, agent_assigned, agent_contacted, plan_confirmed, payment_completed, itinerary_updated, status_changed, cancelled
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_booking ON public.weekend_booking_activity_log(booking_id);

ALTER TABLE public.weekend_booking_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers view own activity"
  ON public.weekend_booking_activity_log FOR SELECT TO authenticated
  USING (booking_id IN (SELECT id FROM public.weekend_bookings WHERE buyer_id = auth.uid()));

CREATE POLICY "Agents view assigned activity"
  ON public.weekend_booking_activity_log FOR SELECT TO authenticated
  USING (booking_id IN (
    SELECT wb.id FROM public.weekend_bookings wb
    JOIN public.agents a ON a.id = wb.agent_id
    WHERE a.user_id = auth.uid()
  ));

CREATE POLICY "Authenticated can log activity"
  ON public.weekend_booking_activity_log FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins view all activity"
  ON public.weekend_booking_activity_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- 4. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.weekend_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.weekend_booking_itinerary;
ALTER PUBLICATION supabase_realtime ADD TABLE public.weekend_booking_activity_log;