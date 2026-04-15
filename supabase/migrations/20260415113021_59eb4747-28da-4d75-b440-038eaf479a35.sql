
-- 1. Create SECURITY DEFINER function for role assignment during signup
CREATE OR REPLACE FUNCTION public.assign_user_role(_user_id uuid, _role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _role NOT IN ('customer', 'agent', 'builder') THEN
    RAISE EXCEPTION 'Invalid role: %', _role;
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- 2. Create agents table
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  photo_url TEXT,
  agency_name TEXT,
  cities_served TEXT,
  localities_served TEXT,
  languages TEXT DEFAULT 'English, Hindi',
  trust_score INTEGER DEFAULT 75,
  sales_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  experience_years INTEGER DEFAULT 1,
  specializations TEXT[],
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Verified agents are publicly readable"
  ON public.agents FOR SELECT
  USING (verified = true);

CREATE POLICY "Agents can update own profile"
  ON public.agents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all agents"
  ON public.agents FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can insert agents"
  ON public.agents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Create visit_bookings table
CREATE TABLE IF NOT EXISTS public.visit_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  visit_date DATE NOT NULL,
  visit_time TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  buyer_name TEXT,
  buyer_phone TEXT,
  buyer_email TEXT,
  city TEXT,
  locality TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.visit_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own bookings"
  ON public.visit_bookings FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Buyers can create bookings"
  ON public.visit_bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Agents can view assigned bookings"
  ON public.visit_bookings FOR SELECT
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can update assigned bookings"
  ON public.visit_bookings FOR UPDATE
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all bookings"
  ON public.visit_bookings FOR ALL
  USING (public.is_admin(auth.uid()));

-- Enable realtime for visit_bookings
ALTER PUBLICATION supabase_realtime ADD TABLE public.visit_bookings;

-- 4. Seed agents
INSERT INTO public.agents (name, phone, email, agency_name, cities_served, localities_served, languages, trust_score, sales_count, verified, experience_years, specializations, bio) VALUES
('Rajesh Kumar', '+919876543201', 'rajesh@realtyhyd.com', 'Realty Hyderabad', 'Hyderabad', 'Kondapur, Gachibowli, Madhapur, HITEC City', 'English, Hindi, Telugu', 92, 145, true, 12, ARRAY['Luxury Apartments', 'Villas'], 'Top-performing agent in Hyderabad with 12+ years in premium properties.'),
('Priya Reddy', '+919876543202', 'priya@elitehomes.com', 'Elite Homes Hyderabad', 'Hyderabad', 'Banjara Hills, Jubilee Hills, Film Nagar', 'English, Telugu, Hindi', 88, 98, true, 8, ARRAY['Premium Villas', 'Gated Communities'], 'Specializing in luxury villas in prime Hyderabad locations.'),
('Suresh Babu', '+919876543203', 'suresh@propertyvjw.com', 'Property Hub Vijayawada', 'Vijayawada', 'Mogalrajpuram, Governorpet, Benz Circle, Kanuru', 'English, Telugu', 85, 76, true, 10, ARRAY['Residential Apartments', 'Plots'], 'Leading property consultant in Vijayawada with expertise in residential spaces.'),
('Lakshmi Devi', '+919876543204', 'lakshmi@vjwhomes.com', 'VJW Homes', 'Vijayawada', 'Tadepalli, Mangalagiri, Gannavaram', 'Telugu, English', 82, 54, true, 6, ARRAY['Budget Homes', 'New Projects'], 'Helping first-time buyers find affordable homes near Vijayawada.'),
('Anil Sharma', '+919876543205', 'anil@bangaloreprop.com', 'Bangalore Properties', 'Bangalore', 'Whitefield, Electronic City, Sarjapur Road', 'English, Hindi, Kannada', 90, 120, true, 15, ARRAY['IT Corridor Properties', 'Apartments'], 'Veteran Bangalore agent covering major IT corridors.'),
('Deepika Nair', '+919876543206', 'deepika@blrrealty.com', 'BLR Realty', 'Bangalore', 'Koramangala, Indiranagar, HSR Layout', 'English, Kannada, Malayalam', 87, 89, true, 9, ARRAY['Premium Apartments', 'Penthouses'], 'Expert in Bangalore East premium residential segment.'),
('Vikram Patel', '+919876543207', 'vikram@mumbaiest.com', 'Mumbai Estate Corp', 'Mumbai', 'Andheri, Bandra, Powai', 'English, Hindi, Marathi', 91, 132, true, 14, ARRAY['High-Rise Apartments', 'Sea-View Properties'], 'Mumbai real estate specialist with strong builder relationships.'),
('Meera Joshi', '+919876543208', 'meera@navimumbai.com', 'Navi Mumbai Homes', 'Mumbai', 'Vashi, Kharghar, Panvel', 'English, Hindi, Marathi', 84, 67, true, 7, ARRAY['Affordable Housing', 'Under-Construction'], 'Focused on value-for-money properties in Navi Mumbai region.'),
('Ravi Teja', '+919876543209', 'ravi@hydpremium.com', 'Hyderabad Premium Realty', 'Hyderabad', 'Financial District, Narsingi, Kokapet, Tellapur', 'English, Telugu, Hindi', 86, 83, true, 9, ARRAY['New Launches', 'Investment Properties'], 'Investment property specialist covering Hyderabad west corridor.'),
('Srinivas Rao', '+919876543210', 'srinivas@approperties.com', 'AP Properties', 'Vijayawada, Hyderabad', 'Amaravati, Guntur, Kondapur', 'Telugu, English, Hindi', 80, 45, true, 5, ARRAY['Plots', 'Farm Land', 'Residential'], 'Multi-city agent covering Andhra Pradesh and Telangana markets.');
