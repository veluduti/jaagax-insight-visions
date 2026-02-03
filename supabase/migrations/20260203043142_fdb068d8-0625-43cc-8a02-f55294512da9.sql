-- Get the agent ID that was created
DO $$
DECLARE
  agent_uuid UUID;
  builder_uuid UUID;
  prop1_uuid UUID;
  prop2_uuid UUID;
BEGIN
  -- Get the agent ID
  SELECT id INTO agent_uuid FROM agents WHERE user_id = 'c9452f7b-4747-4478-9625-5f00b728ab18' LIMIT 1;
  
  -- Insert agent earnings
  INSERT INTO agent_earnings (agent_id, amount, type, status) VALUES 
    (agent_uuid, 5000, 'visit_fee', 'paid'),
    (agent_uuid, 3000, 'verification_fee', 'paid'),
    (agent_uuid, 10000, 'bonus', 'paid'),
    (agent_uuid, 4500, 'visit_fee', 'paid'),
    (agent_uuid, 2500, 'visit_fee', 'pending');

  -- Insert a builder record
  INSERT INTO builders (id, user_id, company_name, verified, rera_id)
  VALUES (gen_random_uuid(), 'c9452f7b-4747-4478-9625-5f00b728ab18', 'Test Builder Corp', true, 'RERA123456')
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO builder_uuid;
  
  -- Get builder_id if insert was skipped
  IF builder_uuid IS NULL THEN
    SELECT id INTO builder_uuid FROM builders WHERE user_id = 'c9452f7b-4747-4478-9625-5f00b728ab18' LIMIT 1;
  END IF;

  -- Insert test properties
  INSERT INTO properties (id, title, address, price, property_type, builder_id, city, locality, verification_status)
  VALUES 
    (gen_random_uuid(), '3BHK Luxury Apartment', 'Plot 42, KPHB Colony', 8500000, 'apartment', builder_uuid, 'Hyderabad', 'KPHB', 'pending')
  RETURNING id INTO prop1_uuid;

  INSERT INTO properties (id, title, address, price, property_type, builder_id, city, locality, verification_status)
  VALUES 
    (gen_random_uuid(), 'Premium Villa', 'Road 12, Jubilee Hills', 25000000, 'villa', builder_uuid, 'Hyderabad', 'Jubilee Hills', 'pending')
  RETURNING id INTO prop2_uuid;

  -- Insert property verifications for testing
  INSERT INTO property_verifications (property_id, agent_id, assigned_at, status, verification_type, final_status)
  VALUES 
    (prop1_uuid, agent_uuid, NOW() - INTERVAL '1 day', 'assigned', 'initial', null),
    (prop2_uuid, agent_uuid, NOW() - INTERVAL '3 days', 'completed', 'initial', 'pending_review');
END $$;