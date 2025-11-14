-- Create visit_bookings table
CREATE TABLE IF NOT EXISTS public.visit_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  property_id INTEGER REFERENCES public.properties(id),
  agent_id INTEGER REFERENCES public.agents(id),
  visit_date DATE NOT NULL,
  visit_time TIME NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rescheduled')),
  travel_mode TEXT DEFAULT 'self' CHECK (travel_mode IN ('self', 'base', 'premium', 'ultimate')),
  pickup_location JSONB,
  vehicle_id UUID,
  qr_code TEXT,
  otp TEXT,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_phone TEXT,
  special_requests TEXT,
  properties JSONB, -- For multi-property visits
  optimized_route JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create agent_availability table
CREATE TABLE IF NOT EXISTS public.agent_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id INTEGER REFERENCES public.agents(id),
  date DATE NOT NULL,
  time_slots JSONB NOT NULL, -- Array of {time, available, bookingId}
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, date)
);

-- Create fleet_vehicles table
CREATE TABLE IF NOT EXISTS public.fleet_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('base', 'premium', 'ultimate')),
  vehicle_number TEXT NOT NULL,
  vehicle_model TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'maintenance')),
  current_location JSONB,
  driver_name TEXT,
  driver_phone TEXT,
  capacity INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create visit_notifications table
CREATE TABLE IF NOT EXISTS public.visit_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.visit_bookings(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'sms', 'whatsapp', 'push')),
  recipient TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  metadata JSONB
);

-- Create visit_feedback table
CREATE TABLE IF NOT EXISTS public.visit_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.visit_bookings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  agent_rating INTEGER CHECK (agent_rating >= 1 AND agent_rating <= 5),
  property_rating INTEGER CHECK (property_rating >= 1 AND property_rating <= 5),
  service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
  ai_insights TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.visit_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for visit_bookings
CREATE POLICY "Users can view their own bookings" ON public.visit_bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings" ON public.visit_bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own bookings" ON public.visit_bookings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Agents can view their assigned bookings" ON public.visit_bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = visit_bookings.agent_id
      AND agents.user_id = auth.uid()
    )
  );

-- RLS Policies for agent_availability
CREATE POLICY "Anyone can view agent availability" ON public.agent_availability
  FOR SELECT USING (true);

CREATE POLICY "Agents can manage their availability" ON public.agent_availability
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = agent_availability.agent_id
      AND agents.user_id = auth.uid()
    )
  );

-- RLS Policies for fleet_vehicles
CREATE POLICY "Anyone can view available vehicles" ON public.fleet_vehicles
  FOR SELECT USING (status = 'available');

CREATE POLICY "Admins can manage fleet" ON public.fleet_vehicles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for visit_notifications
CREATE POLICY "Users can view their notifications" ON public.visit_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.visit_bookings
      WHERE visit_bookings.id = visit_notifications.booking_id
      AND visit_bookings.user_id = auth.uid()
    )
  );

-- RLS Policies for visit_feedback
CREATE POLICY "Users can view their feedback" ON public.visit_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create feedback" ON public.visit_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_visit_bookings_user ON public.visit_bookings(user_id);
CREATE INDEX idx_visit_bookings_agent ON public.visit_bookings(agent_id);
CREATE INDEX idx_visit_bookings_property ON public.visit_bookings(property_id);
CREATE INDEX idx_visit_bookings_date ON public.visit_bookings(visit_date);
CREATE INDEX idx_visit_bookings_status ON public.visit_bookings(status);
CREATE INDEX idx_agent_availability_agent_date ON public.agent_availability(agent_id, date);
CREATE INDEX idx_fleet_vehicles_status ON public.fleet_vehicles(status);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_visit_booking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_visit_bookings_timestamp
  BEFORE UPDATE ON public.visit_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_visit_booking_timestamp();

-- Insert sample fleet vehicles
INSERT INTO public.fleet_vehicles (vehicle_type, vehicle_number, vehicle_model, driver_name, driver_phone, capacity) VALUES
  ('base', 'KA-01-AB-1234', 'Maruti Dzire', 'Ravi Kumar', '+91-9876543210', 4),
  ('base', 'KA-01-CD-5678', 'Honda City', 'Suresh Patil', '+91-9876543211', 4),
  ('premium', 'KA-01-EF-9012', 'Toyota Innova Crysta', 'Manoj Singh', '+91-9876543212', 7),
  ('premium', 'KA-01-GH-3456', 'MG Hector', 'Prakash Reddy', '+91-9876543213', 5),
  ('ultimate', 'KA-01-IJ-7890', 'Mercedes-Benz E-Class', 'Vikram Mehta', '+91-9876543214', 5),
  ('ultimate', 'KA-01-KL-2345', 'BMW 5 Series', 'Arjun Desai', '+91-9876543215', 5)
ON CONFLICT DO NOTHING;