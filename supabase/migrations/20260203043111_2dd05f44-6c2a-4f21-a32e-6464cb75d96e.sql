-- First insert the user record since trigger may have failed
INSERT INTO public.users (id, name, email, kyc_status)
VALUES ('c9452f7b-4747-4478-9625-5f00b728ab18', 'Test Admin', 'ashok.snv9@gmail.com', 'verified')
ON CONFLICT (id) DO NOTHING;

-- Insert an agent for this existing user
INSERT INTO agents (id, user_id, name, phone, agency_name, cities_served, languages, trust_score, acceptance_rate, avg_response_time_seconds, total_visits, sales_count, rent_count, verified, is_online, current_latitude, current_longitude)
VALUES 
  (gen_random_uuid(), 'c9452f7b-4747-4478-9625-5f00b728ab18', 'Rajesh Kumar', '+919876543210', 'Prime Realty', ARRAY['Hyderabad', 'Bangalore'], ARRAY['English', 'Hindi', 'Telugu'], 92, 95, 45, 156, 34, 22, true, true, 17.3850, 78.4867)
ON CONFLICT (user_id) DO UPDATE SET trust_score = EXCLUDED.trust_score, is_online = EXCLUDED.is_online, name = EXCLUDED.name;