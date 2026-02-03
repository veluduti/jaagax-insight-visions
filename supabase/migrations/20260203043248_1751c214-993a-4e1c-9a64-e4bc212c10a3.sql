-- Create a test visit booking for cascade testing
INSERT INTO visit_bookings (
  id, user_id, property_id, visit_date, visit_time, status, buyer_name, buyer_email, buyer_phone
) VALUES (
  'fb000001-0000-0000-0000-000000000001',
  'c9452f7b-4747-4478-9625-5f00b728ab18',
  (SELECT id FROM properties LIMIT 1),
  CURRENT_DATE + INTERVAL '2 days',
  '10:00:00',
  'pending',
  'Test Buyer',
  'buyer@test.com',
  '+919876543210'
) ON CONFLICT (id) DO NOTHING;