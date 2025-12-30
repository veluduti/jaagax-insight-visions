-- Create partner_hotels table
CREATE TABLE public.partner_hotels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  locality TEXT NOT NULL,
  address TEXT,
  lat NUMERIC,
  lng NUMERIC,
  star_rating INTEGER DEFAULT 3,
  price_per_night NUMERIC NOT NULL,
  discount_percentage INTEGER DEFAULT 10,
  amenities TEXT[],
  images TEXT[],
  contact_phone TEXT,
  contact_email TEXT,
  partner_since TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create visit_packages table
CREATE TABLE public.visit_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  duration_days INTEGER NOT NULL DEFAULT 1,
  includes_airport_pickup BOOLEAN DEFAULT false,
  includes_meals BOOLEAN DEFAULT false,
  includes_local_transport BOOLEAN DEFAULT false,
  base_discount_percentage INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create visit_stay_bookings table
CREATE TABLE public.visit_stay_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id INTEGER,
  hotel_id UUID REFERENCES public.partner_hotels(id),
  package_id UUID REFERENCES public.visit_packages(id),
  booking_type TEXT NOT NULL DEFAULT 'visit_stay', -- 'visit_stay' or 'hotel_only'
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  number_of_guests INTEGER DEFAULT 1,
  number_of_rooms INTEGER DEFAULT 1,
  visit_date DATE,
  visit_time TEXT,
  total_hotel_price NUMERIC,
  total_package_price NUMERIC,
  discount_applied NUMERIC DEFAULT 0,
  final_price NUMERIC,
  special_requests TEXT,
  status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  ai_suggested BOOLEAN DEFAULT false,
  suggestion_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partner_hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_stay_bookings ENABLE ROW LEVEL SECURITY;

-- Partner hotels policies (public read)
CREATE POLICY "Anyone can view active partner hotels" 
ON public.partner_hotels FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage partner hotels" 
ON public.partner_hotels FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'
));

-- Visit packages policies (public read)
CREATE POLICY "Anyone can view active packages" 
ON public.visit_packages FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage packages" 
ON public.visit_packages FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'
));

-- Visit stay bookings policies
CREATE POLICY "Users can view their own bookings" 
ON public.visit_stay_bookings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings" 
ON public.visit_stay_bookings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings" 
ON public.visit_stay_bookings FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bookings" 
ON public.visit_stay_bookings FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'
));

-- Insert sample partner hotels
INSERT INTO public.partner_hotels (name, city, locality, address, star_rating, price_per_night, discount_percentage, amenities, images) VALUES
('Grand Stay Residency', 'Bangalore', 'Whitefield', '123 IT Park Road, Whitefield', 4, 4500, 15, ARRAY['WiFi', 'Breakfast', 'Pool', 'Gym', 'Parking'], ARRAY['https://images.unsplash.com/photo-1566073771259-6a8506099945']),
('Comfort Inn Express', 'Bangalore', 'Electronic City', '456 Tech Park, Electronic City', 3, 2800, 20, ARRAY['WiFi', 'Breakfast', 'Parking', 'Restaurant'], ARRAY['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa']),
('Royal Orchid Suites', 'Bangalore', 'Koramangala', '789 MG Road, Koramangala', 5, 7500, 10, ARRAY['WiFi', 'Breakfast', 'Pool', 'Spa', 'Gym', 'Concierge'], ARRAY['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b']),
('Budget Stay Plus', 'Bangalore', 'HSR Layout', '321 Sector 2, HSR Layout', 2, 1500, 25, ARRAY['WiFi', 'Parking', 'AC'], ARRAY['https://images.unsplash.com/photo-1590490360182-c33d57733427']),
('Prestige Suites', 'Mumbai', 'Powai', '100 Hiranandani Gardens, Powai', 4, 5500, 12, ARRAY['WiFi', 'Breakfast', 'Pool', 'Gym', 'Business Center'], ARRAY['https://images.unsplash.com/photo-1578683010236-d716f9a3f461']);

-- Insert sample visit packages
INSERT INTO public.visit_packages (name, description, duration_days, includes_airport_pickup, includes_meals, includes_local_transport, base_discount_percentage) VALUES
('Quick Explorer', 'Perfect for a quick 1-day property visit with breakfast included', 1, false, true, false, 15),
('Comfort Package', '2-day stay with airport pickup and all meals', 2, true, true, true, 20),
('Premium Experience', '3-day comprehensive visit with luxury amenities and dedicated support', 3, true, true, true, 25);