-- Create partner_hotels table
CREATE TABLE public.partner_hotels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  locality TEXT NOT NULL,
  address TEXT,
  star_rating INTEGER DEFAULT 3 CHECK (star_rating >= 1 AND star_rating <= 5),
  price_per_night NUMERIC NOT NULL DEFAULT 0,
  discount_percentage NUMERIC DEFAULT 0,
  amenities TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  contact_phone TEXT,
  contact_email TEXT,
  description TEXT,
  total_rooms INTEGER DEFAULT 50,
  check_in_time TEXT DEFAULT '14:00',
  check_out_time TEXT DEFAULT '12:00',
  policies JSONB DEFAULT '{}',
  room_types JSONB DEFAULT '[]',
  manager_id UUID REFERENCES auth.users(id),
  partner_since TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create visit_packages table
CREATE TABLE public.visit_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  duration_days INTEGER DEFAULT 1,
  includes_airport_pickup BOOLEAN DEFAULT false,
  includes_meals BOOLEAN DEFAULT false,
  includes_local_transport BOOLEAN DEFAULT false,
  base_discount_percentage NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create hotel_bookings table
CREATE TABLE public.hotel_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID REFERENCES public.partner_hotels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  room_type TEXT DEFAULT 'Standard',
  num_guests INTEGER DEFAULT 1,
  num_rooms INTEGER DEFAULT 1,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled')),
  special_requests TEXT,
  booking_type TEXT DEFAULT 'hotel_only' CHECK (booking_type IN ('hotel_only', 'visit_stay')),
  package_id UUID REFERENCES public.visit_packages(id),
  property_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'agent', 'builder', 'customer', 'driver', 'hotel_manager')),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.partner_hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Partner hotels policies
CREATE POLICY "Anyone can view active hotels" ON public.partner_hotels FOR SELECT USING (is_active = true);
CREATE POLICY "Hotel managers can manage their hotels" ON public.partner_hotels FOR ALL USING (auth.uid() = manager_id);
CREATE POLICY "Admins can manage all hotels" ON public.partner_hotels FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Hotel bookings policies
CREATE POLICY "Users can view their bookings" ON public.hotel_bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Hotel managers can view bookings for their hotels" ON public.hotel_bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.partner_hotels WHERE id = hotel_id AND manager_id = auth.uid())
);
CREATE POLICY "Hotel managers can update bookings for their hotels" ON public.hotel_bookings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.partner_hotels WHERE id = hotel_id AND manager_id = auth.uid())
);
CREATE POLICY "Authenticated users can create bookings" ON public.hotel_bookings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Visit packages policies
CREATE POLICY "Anyone can view active packages" ON public.visit_packages FOR SELECT USING (is_active = true);

-- Insert sample data
INSERT INTO public.visit_packages (name, description, duration_days, includes_airport_pickup, includes_meals, includes_local_transport, base_discount_percentage) VALUES
('Weekend Property Explorer', 'Visit multiple properties over a weekend', 2, true, true, true, 15),
('Quick Visit Package', 'One-day intensive property viewing', 1, true, false, true, 10);

INSERT INTO public.partner_hotels (name, city, locality, address, star_rating, price_per_night, discount_percentage, amenities, images, total_rooms, description) VALUES
('Grand Hyatt Hyderabad', 'Hyderabad', 'HITEC City', 'Near Cyber Gateway, HITEC City', 5, 8500, 15, ARRAY['WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant', 'Bar'], ARRAY['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600'], 200, 'Luxury 5-star hotel in the heart of HITEC City'),
('Novotel Vijayawada', 'Vijayawada', 'MG Road', 'Near PVR Cinemas, MG Road', 4, 4500, 10, ARRAY['WiFi', 'Pool', 'Gym', 'Restaurant'], ARRAY['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600'], 120, 'Premium business hotel on MG Road'),
('Taj Krishna Hyderabad', 'Hyderabad', 'Banjara Hills', 'Road No. 1, Banjara Hills', 5, 12000, 20, ARRAY['WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant', 'Bar', 'Business Center'], ARRAY['https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600'], 260, 'Iconic luxury hotel in Banjara Hills'),
('ITC Kohenur Hyderabad', 'Hyderabad', 'Madhapur', 'HITEC City Main Road', 5, 11000, 12, ARRAY['WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant', 'Bar'], ARRAY['https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600'], 270, 'Ultra-luxury hotel with panoramic city views'),
('The Park Bangalore', 'Bangalore', 'MG Road', '14/7 MG Road', 4, 6500, 10, ARRAY['WiFi', 'Pool', 'Restaurant', 'Bar'], ARRAY['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600'], 109, 'Boutique luxury hotel on MG Road'),
('Taj Coromandel Chennai', 'Chennai', 'Nungambakkam', '37 Mahatma Gandhi Road', 5, 9000, 15, ARRAY['WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant'], ARRAY['https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600'], 213, 'Heritage luxury in the heart of Chennai');