-- ============================================
-- VISIT TRACKING SYSTEM - TEST DATA SETUP
-- ============================================
-- Run this in Supabase SQL Editor to create test data
-- https://supabase.com/dashboard/project/smyypmthspsrvwydzsxc/sql/new

-- Step 1: Assign builder IDs to properties
-- This links properties to builders for approval routing
UPDATE properties 
SET builder_id = 1 
WHERE id IN (15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25)
AND builder_id IS NULL;

UPDATE properties 
SET builder_id = 2 
WHERE id IN (26, 27, 28, 29, 30, 31, 32, 33, 34, 35)
AND builder_id IS NULL;

UPDATE properties 
SET builder_id = 3 
WHERE id IN (36, 37, 38, 39, 40)
AND builder_id IS NULL;

-- Verify properties now have builders
SELECT 
  id, 
  title, 
  city, 
  locality, 
  builder_id 
FROM properties 
WHERE builder_id IS NOT NULL 
ORDER BY id
LIMIT 20;

-- Step 2: Create test visit bookings with builder_pending status
-- These will appear in the Builder Visits Dashboard

-- Test Booking 1: Pickup mode, for property 16
INSERT INTO visit_bookings (
  property_id,
  builder_id,
  user_name,
  user_email,
  user_phone,
  visit_date,
  visit_time,
  travel_mode,
  pickup_location,
  special_requests,
  status,
  otp_code,
  qr_code_url,
  agent_id,
  vehicle_id
) VALUES (
  16,
  1,
  'Rajesh Kumar',
  'rajesh@example.com',
  '+919876543210',
  CURRENT_DATE + INTERVAL '2 days',
  '14:00:00',
  'pickup',
  '{"address": "MG Road Metro Station, Bangalore", "lat": 12.9756, "lng": 77.6073}',
  'Need wheelchair accessible entrance. Coming with family of 4.',
  'builder_pending',
  'AB1234',
  'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=TEST-BOOKING-1',
  1,
  (SELECT id FROM fleet_vehicles WHERE status = 'available' LIMIT 1)
);

-- Test Booking 2: Self mode, for property 17
INSERT INTO visit_bookings (
  property_id,
  builder_id,
  user_name,
  user_email,
  user_phone,
  visit_date,
  visit_time,
  travel_mode,
  special_requests,
  status,
  otp_code,
  qr_code_url,
  agent_id
) VALUES (
  17,
  1,
  'Priya Sharma',
  'priya.sharma@gmail.com',
  '+919123456789',
  CURRENT_DATE + INTERVAL '3 days',
  '10:00:00',
  'self',
  'Interested in 3BHK units. Please show floor plans.',
  'builder_pending',
  'CD5678',
  'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=TEST-BOOKING-2',
  2
);

-- Test Booking 3: Pickup mode, for property 18
INSERT INTO visit_bookings (
  property_id,
  builder_id,
  user_name,
  user_email,
  user_phone,
  visit_date,
  visit_time,
  travel_mode,
  pickup_location,
  special_requests,
  status,
  otp_code,
  qr_code_url,
  agent_id,
  vehicle_id
) VALUES (
  18,
  1,
  'Amit Patel',
  'amit.patel@yahoo.com',
  '+919988776655',
  CURRENT_DATE + INTERVAL '4 days',
  '16:00:00',
  'pickup',
  '{"address": "Indiranagar Metro Station, Bangalore", "lat": 12.9784, "lng": 77.6408}',
  'First-time home buyer. Need complete details about payment plans.',
  'builder_pending',
  'EF9012',
  'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=TEST-BOOKING-3',
  3,
  (SELECT id FROM fleet_vehicles WHERE status = 'available' LIMIT 1)
);

-- Test Booking 4: For different builder, property 26
INSERT INTO visit_bookings (
  property_id,
  builder_id,
  user_name,
  user_email,
  user_phone,
  visit_date,
  visit_time,
  travel_mode,
  status,
  otp_code,
  qr_code_url,
  agent_id
) VALUES (
  26,
  2,
  'Sunita Reddy',
  'sunita.reddy@outlook.com',
  '+919765432180',
  CURRENT_DATE + INTERVAL '1 day',
  '11:00:00',
  'self',
  'builder_pending',
  'GH3456',
  'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=TEST-BOOKING-4',
  1
);

-- Test Booking 5: Urgent visit for tomorrow
INSERT INTO visit_bookings (
  property_id,
  builder_id,
  user_name,
  user_email,
  user_phone,
  visit_date,
  visit_time,
  travel_mode,
  pickup_location,
  special_requests,
  status,
  otp_code,
  qr_code_url,
  agent_id,
  vehicle_id
) VALUES (
  19,
  1,
  'Vikram Singh',
  'vikram.singh@gmail.com',
  '+919000011122',
  CURRENT_DATE + INTERVAL '1 day',
  '09:00:00',
  'pickup',
  '{"address": "Koramangala Water Tank, Bangalore", "lat": 12.9352, "lng": 77.6245}',
  'URGENT: Need to finalize by this week. Looking for 4BHK penthouse.',
  'builder_pending',
  'IJ7890',
  'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=TEST-BOOKING-5',
  1,
  (SELECT id FROM fleet_vehicles WHERE status = 'available' LIMIT 1)
);

-- Verify all test bookings were created
SELECT 
  id,
  user_name,
  property_id,
  builder_id,
  visit_date,
  visit_time,
  travel_mode,
  status,
  otp_code
FROM visit_bookings
WHERE status = 'builder_pending'
ORDER BY visit_date, visit_time;

-- Check count by builder
SELECT 
  builder_id,
  COUNT(*) as pending_visits
FROM visit_bookings
WHERE status = 'builder_pending'
GROUP BY builder_id
ORDER BY builder_id;

-- Show properties with their builders
SELECT 
  p.id as property_id,
  p.title as property_name,
  p.locality,
  p.city,
  p.builder_id,
  b.name as builder_name,
  COUNT(vb.id) as pending_visits
FROM properties p
LEFT JOIN builders b ON p.builder_id = b.id
LEFT JOIN visit_bookings vb ON vb.property_id = p.id AND vb.status = 'builder_pending'
WHERE p.builder_id IS NOT NULL
GROUP BY p.id, p.title, p.locality, p.city, p.builder_id, b.name
HAVING COUNT(vb.id) > 0
ORDER BY pending_visits DESC;

-- ============================================
-- SUCCESS! You should now have:
-- - Properties linked to builders
-- - 5 test visit bookings in 'builder_pending' status
-- - Ready to test the Builder Visits Dashboard
-- ============================================

-- Next Steps:
-- 1. Go to: http://localhost:5173/dashboard/builder/visits
-- 2. You should see the 3-5 pending visit cards
-- 3. Try approving and rejecting visits
-- 4. Check the confirmation pages at /visit/confirm/[booking-id]
