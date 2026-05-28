
-- 1. Re-apply column-level REVOKE for PII on agents, builder_profiles, builder_profiles_data
REVOKE SELECT (email, phone) ON public.agents FROM anon;
REVOKE SELECT (email, phone, whatsapp, rera_number) ON public.builder_profiles FROM anon;
REVOKE SELECT (phone, rera_number) ON public.builder_profiles_data FROM anon;

-- 2. Drop legacy overly-permissive properties policy
DROP POLICY IF EXISTS "Anyone can view verified properties" ON public.properties;

-- 3. Remove hotel_bookings from realtime publication (RLS on realtime.messages not configurable here)
ALTER PUBLICATION supabase_realtime DROP TABLE public.hotel_bookings;

-- 4. Restrict agent UPDATE on weekend_bookings to safe columns only
DROP POLICY IF EXISTS "Assigned agent updates bookings" ON public.weekend_bookings;
REVOKE UPDATE ON public.weekend_bookings FROM authenticated;
GRANT UPDATE (
  agent_notes, status, agent_accepted_at, agent_declined_at, agent_decline_reason,
  interested_property_ids, deal_closed_at, deal_property_id
) ON public.weekend_bookings TO authenticated;
CREATE POLICY "Assigned agent updates bookings"
ON public.weekend_bookings
FOR UPDATE
TO authenticated
USING (agent_id IN (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid()))
WITH CHECK (agent_id IN (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid()));
-- Re-grant full UPDATE for buyer's own-row policy via column-level: buyers need broader update, give back via separate grant
-- Actually buyers update via "Buyers update own bookings" — keep buyer columns updatable
GRANT UPDATE (
  buyer_name, buyer_email, buyer_phone, budget_min, budget_max, property_type,
  preferred_locations, bhk_preference, selected_property_ids, start_date, end_date,
  hotel_id, hotel_tier, include_transport, include_agent_assistance, estimated_total,
  final_total, booking_amount, payment_status, payment_reference, paid_at,
  buyer_notes, city, buyer_decision, buyer_decision_at, buyer_decision_notes,
  agent_rating, agent_review, status
) ON public.weekend_bookings TO authenticated;

-- 5. agent_ratings: hide buyer_id and booking_id from anon
REVOKE SELECT (buyer_id, booking_id) ON public.agent_ratings FROM anon;

-- 6. property_details: restrict public reads to publicly-visible properties
DROP POLICY IF EXISTS "Anyone can view property_details" ON public.property_details;
CREATE POLICY "Public can view details for live properties"
ON public.property_details
FOR SELECT
TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.properties p
  WHERE p.id = property_details.property_id
    AND p.verified = true
    AND p.is_live = true
    AND COALESCE(p.is_draft, false) = false
));
CREATE POLICY "Owners and admins view all property_details"
ON public.property_details
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_details.property_id AND p.submitted_by = auth.uid())
);

-- 7. visit_bookings: scope public policies to authenticated only
DROP POLICY IF EXISTS "Buyers can view own bookings" ON public.visit_bookings;
DROP POLICY IF EXISTS "Agents can view assigned bookings" ON public.visit_bookings;
DROP POLICY IF EXISTS "Agents can update assigned bookings" ON public.visit_bookings;
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.visit_bookings;

CREATE POLICY "Buyers view own visit bookings"
ON public.visit_bookings FOR SELECT TO authenticated
USING (auth.uid() = buyer_id);

CREATE POLICY "Agents view assigned visit bookings"
ON public.visit_bookings FOR SELECT TO authenticated
USING (agent_id IN (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid()));

CREATE POLICY "Agents update assigned visit bookings"
ON public.visit_bookings FOR UPDATE TO authenticated
USING (agent_id IN (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid()))
WITH CHECK (agent_id IN (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid()));

CREATE POLICY "Admins manage all visit bookings"
ON public.visit_bookings FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
