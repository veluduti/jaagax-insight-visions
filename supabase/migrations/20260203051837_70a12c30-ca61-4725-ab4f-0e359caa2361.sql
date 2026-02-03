
-- Fix Agents RLS: Allow public viewing of verified agents
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view verified agents' AND tablename = 'agents') THEN
    CREATE POLICY "Anyone can view verified agents" ON public.agents FOR SELECT USING (verified = true);
  END IF;
END $$;

-- Fix Projects RLS: Allow viewing of all projects
DROP POLICY IF EXISTS "Anyone can view verified projects" ON public.projects;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view projects' AND tablename = 'projects') THEN
    CREATE POLICY "Anyone can view projects" ON public.projects FOR SELECT USING (true);
  END IF;
END $$;

-- Seed sample Projects
INSERT INTO public.projects (id, name, builder_name, city, locality, status, verified, min_price, max_price, avg_price, total_units, available_units, description, amenities, configurations, trust_score, image)
VALUES 
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Prestige Sunrise Park', 'Prestige Group', 'Hyderabad', 'Gachibowli', 'ongoing', true, 8500000, 25000000, 15000000, 500, 120, 'Premium residential project with world-class amenities', '["Swimming Pool", "Gym", "Club House", "Tennis Court"]', '[{"type": "2 BHK", "size": "1200 sqft", "price": 8500000}]', 85, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'My Home Bhooja', 'My Home Group', 'Hyderabad', 'Madhapur', 'upcoming', true, 12000000, 35000000, 22000000, 800, 800, 'Ultra-luxury towers with panoramic city views', '["Infinity Pool", "Sky Lounge", "Private Theater", "Spa"]', '[{"type": "3 BHK", "size": "2200 sqft", "price": 12000000}]', 90, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800'),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Aparna Sarovar Zenith', 'Aparna Constructions', 'Hyderabad', 'Nallagandla', 'ongoing', true, 6500000, 18000000, 11000000, 1200, 450, 'Serene lakefront living with sustainable design', '["Lake View", "Organic Garden", "Solar Power"]', '[{"type": "2 BHK", "size": "1100 sqft", "price": 6500000}]', 82, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800'),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', 'Phoenix One Bangalore West', 'Phoenix Mills', 'Bangalore', 'Rajaji Nagar', 'completed', true, 15000000, 45000000, 28000000, 600, 50, 'Iconic towers with premium mall integration', '["Mall Access", "Multiplex", "Fine Dining"]', '[{"type": "3 BHK", "size": "2800 sqft", "price": 15000000}]', 95, 'https://images.unsplash.com/photo-1567449303183-ae0d6ed1498e?w=800'),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'Sobha Dream Acres', 'Sobha Limited', 'Bangalore', 'Balagere', 'ongoing', true, 5500000, 12000000, 8000000, 2000, 600, 'Affordable luxury with Sobha quality', '["Central Park", "Sports Complex", "Shopping Center"]', '[{"type": "1 BHK", "size": "650 sqft", "price": 5500000}]', 88, 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800')
ON CONFLICT (id) DO NOTHING;

-- Seed sample Community Events
INSERT INTO public.community_events (id, title, description, category, city, locality, venue, venue_address, event_date, event_time, organizer, max_attendees, current_attendees, ticket_price, status, verified, featured, published_at, image_url, tags)
VALUES
  ('f6a7b8c9-d0e1-2345-fabc-456789012345', 'Hyderabad Property Expo 2026', 'Largest property exhibition', 'community', 'Hyderabad', 'HITEX', 'HITEX Exhibition Center', 'HITEX', '2026-02-15', '10:00', 'TREA', 50000, 12500, 0, 'upcoming', true, true, NOW(), 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800', '["Property Expo"]'),
  ('a7b8c9d0-e1f2-3456-abcd-567890123456', 'First-Time Homebuyer Workshop', 'Free workshop on home buying', 'community', 'Hyderabad', 'Gachibowli', 'T-Hub', 'T-Hub 2.0', '2026-02-20', '14:00', 'Housing.com', 200, 145, 0, 'upcoming', true, true, NOW(), 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800', '["Workshop"]'),
  ('c9d0e1f2-a3b4-5678-cdef-789012345678', 'Ugadi Property Festival', 'Festive offers on new bookings', 'festival', 'Hyderabad', 'Banjara Hills', 'Taj Krishna', 'Banjara Hills', '2026-03-29', '11:00', 'HBA', 3000, 0, 0, 'upcoming', true, true, NOW(), 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800', '["Festival"]'),
  ('d0e1f2a3-b4c5-6789-defa-890123456789', 'Luxury Homes Open Day', 'Exclusive premium property viewing', 'other', 'Hyderabad', 'Jubilee Hills', 'Multiple Locations', 'Jubilee Hills', '2026-02-22', '10:00', 'Sothebys', 50, 32, 5000, 'upcoming', true, true, NOW(), 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', '["Luxury"]')
ON CONFLICT (id) DO NOTHING;

-- Seed Advertisements using existing user_id (c9452f7b-4747-4478-9625-5f00b728ab18 is the builder's user_id)
INSERT INTO public.advertisements (id, builder_id, project_id, ad_type, title, tagline, description, offer_text, cta_text, images, highlights, featured, priority, status, start_date, end_date, budget, impressions, clicks, saves, contacts)
VALUES
  ('ad111111-1111-1111-1111-111111111111', 'c9452f7b-4747-4478-9625-5f00b728ab18', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'project', 'Prestige Sunrise Park - Limited Offer', 'Innovation Meets Luxury', 'Book your dream home in Gachibowli', '₹2L off on early bookings', 'Book Visit', '["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800"]', '["IT Corridor", "Metro Nearby"]', true, 1, 'active', '2026-01-01', '2026-03-31', 500000, 45000, 2100, 890, 156),
  ('ad222222-2222-2222-2222-222222222222', 'c9452f7b-4747-4478-9625-5f00b728ab18', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'project', 'My Home Bhooja - Ultra Luxury', 'Elevate Your Lifestyle', 'Unparalleled luxury living', 'Pre-launch prices available', 'Register Interest', '["https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800"]', '["Sky Lounge", "Private Theater"]', true, 2, 'active', '2026-01-15', '2026-04-15', 750000, 32000, 1800, 620, 89),
  ('ad333333-3333-3333-3333-333333333333', 'c9452f7b-4747-4478-9625-5f00b728ab18', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'project', 'Aparna Sarovar - Lakefront', 'Serene Lake Views', 'Eco-friendly homes', 'No GST on ready units', 'Explore', '["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800"]', '["Lake View", "Green Certified"]', false, 5, 'active', '2026-02-01', '2026-05-01', 300000, 18000, 950, 340, 67)
ON CONFLICT (id) DO NOTHING;
