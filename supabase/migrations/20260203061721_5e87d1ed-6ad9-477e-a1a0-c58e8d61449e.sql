-- Fix demo data for complete user flow testing

-- 1. Update existing builder to be verified with RERA
UPDATE public.builders 
SET verified = true, rera_id = 'RERA2024001', company_name = 'Prestige Constructions'
WHERE user_id = 'c9452f7b-4747-4478-9625-5f00b728ab18';

-- 2. Ensure agent has phone and is properly configured
UPDATE public.agents 
SET 
  phone = '+919876543210',
  is_online = true,
  acceptance_rate = 95,
  avg_response_time_seconds = 45,
  total_visits = 25,
  sales_count = 12,
  rent_count = 8,
  cities_served = ARRAY['Hyderabad', 'Bangalore'],
  languages = ARRAY['English', 'Telugu', 'Hindi']
WHERE id = '6b3e4e86-9e1f-428a-bfc8-c9b0d3a1e87b';

-- 3. Link properties to the existing builder for testing
UPDATE public.properties 
SET 
  builder_id = '4eb95250-d2d3-4e05-a37e-c5045ca8c820',
  submitted_by = 'c9452f7b-4747-4478-9625-5f00b728ab18'
WHERE id IN (
  SELECT id FROM public.properties 
  ORDER BY created_at DESC 
  LIMIT 5
);

-- 4. Standardize status: change 'pending' to 'pending_approval' 
UPDATE public.visit_bookings 
SET status = 'pending_approval' 
WHERE status = 'pending';

-- 5. Assign agent to pending bookings that don't have one
UPDATE public.visit_bookings
SET agent_id = '6b3e4e86-9e1f-428a-bfc8-c9b0d3a1e87b'
WHERE agent_id IS NULL AND status IN ('pending_approval', 'confirmed');

-- 6. Add role entries for the admin/agent/builder user
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('c9452f7b-4747-4478-9625-5f00b728ab18', 'admin'),
  ('c9452f7b-4747-4478-9625-5f00b728ab18', 'agent'),
  ('c9452f7b-4747-4478-9625-5f00b728ab18', 'builder')
ON CONFLICT (user_id, role) DO NOTHING;

-- 7. Create test visit bookings for various statuses
INSERT INTO public.visit_bookings (user_id, property_id, agent_id, visit_date, visit_time, status, buyer_name, buyer_phone, buyer_email, verification_code, otp_code, notes)
SELECT 
  '9902b185-0234-4235-b7b7-d199069a0ff2',
  p.id,
  '6b3e4e86-9e1f-428a-bfc8-c9b0d3a1e87b',
  CURRENT_DATE + INTERVAL '2 days',
  '11:00',
  'pending_approval',
  'Buyer A',
  '+919876543210',
  'buyera@gmail.com',
  'VRF-TEST01',
  '123456',
  'Interested in site visit'
FROM public.properties p
ORDER BY random()
LIMIT 1;