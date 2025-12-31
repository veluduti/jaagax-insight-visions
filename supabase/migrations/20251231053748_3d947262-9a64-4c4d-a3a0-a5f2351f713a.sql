-- Insert Hyderabad Hotels
INSERT INTO public.partner_hotels (name, city, locality, address, star_rating, price_per_night, discount_percentage, amenities, images, is_active)
VALUES 
  ('Taj Krishna Hyderabad', 'Hyderabad', 'Banjara Hills', 'Road No. 1, Banjara Hills', 5, 9500, 12, ARRAY['WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant', 'Business Center', 'Concierge'], ARRAY['https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800'], true),
  ('Novotel Hyderabad', 'Hyderabad', 'HITEC City', 'Cyberabad, HITEC City', 4, 5500, 18, ARRAY['WiFi', 'Breakfast', 'Pool', 'Gym', 'Restaurant', 'Parking'], ARRAY['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800'], true),
  ('Radisson Blu Hyderabad', 'Hyderabad', 'Gachibowli', 'Survey No. 64, Gachibowli', 4, 4800, 20, ARRAY['WiFi', 'Breakfast', 'Gym', 'Restaurant', 'Business Center', 'Parking'], ARRAY['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'], true),
  ('Lemon Tree Premier', 'Hyderabad', 'HITEC City', 'Plot No. 13, HITEC City', 3, 3200, 22, ARRAY['WiFi', 'Breakfast', 'Gym', 'Restaurant', 'Parking'], ARRAY['https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'], true),
  ('FabHotel Jubilee Hills', 'Hyderabad', 'Jubilee Hills', 'Road No. 36, Jubilee Hills', 3, 2500, 25, ARRAY['WiFi', 'Breakfast', 'AC', 'Parking'], ARRAY['https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800'], true),

-- Insert Vijayawada Hotels
  ('The Gateway Vijayawada', 'Vijayawada', 'MG Road', 'MG Road, Near Benz Circle', 4, 4200, 15, ARRAY['WiFi', 'Breakfast', 'Pool', 'Gym', 'Restaurant', 'Parking'], ARRAY['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'], true),
  ('Fortune Murali Park', 'Vijayawada', 'Governorpet', 'Bandar Road, Governorpet', 4, 3800, 18, ARRAY['WiFi', 'Breakfast', 'Gym', 'Restaurant', 'Business Center', 'Parking'], ARRAY['https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800'], true),
  ('Hotel Manorama', 'Vijayawada', 'Labbipet', 'Eluru Road, Labbipet', 3, 2200, 20, ARRAY['WiFi', 'Breakfast', 'Restaurant', 'AC', 'Parking'], ARRAY['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800'], true),
  ('Quality Inn DV Manor', 'Vijayawada', 'Governorpet', 'MG Road, Governorpet', 3, 2800, 22, ARRAY['WiFi', 'Breakfast', 'Gym', 'Restaurant', 'Parking'], ARRAY['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'], true),
  ('OYO Townhouse Vijayawada', 'Vijayawada', 'Auto Nagar', 'Main Road, Auto Nagar', 2, 1500, 28, ARRAY['WiFi', 'AC', 'Parking', 'Room Service'], ARRAY['https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'], true);