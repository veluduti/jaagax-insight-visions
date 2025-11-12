-- Create enum for event categories
CREATE TYPE event_category AS ENUM (
  'festival',
  'cultural',
  'sports',
  'community',
  'workshop',
  'exhibition',
  'concert',
  'food',
  'religious',
  'other'
);

-- Create enum for RSVP status
CREATE TYPE rsvp_status AS ENUM ('confirmed', 'pending', 'cancelled', 'waitlist');

-- Create enum for vendor status
CREATE TYPE vendor_status AS ENUM ('pending', 'approved', 'rejected', 'active');

-- Create community_events table
CREATE TABLE public.community_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  city TEXT NOT NULL,
  locality TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  end_date DATE,
  end_time TIME,
  venue TEXT NOT NULL,
  venue_address TEXT,
  lat NUMERIC,
  lng NUMERIC,
  category event_category NOT NULL DEFAULT 'community',
  image_url TEXT,
  images TEXT[],
  organizer TEXT NOT NULL,
  organizer_contact TEXT,
  organizer_email TEXT,
  verified BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  ticket_price NUMERIC DEFAULT 0,
  max_attendees INTEGER,
  current_attendees INTEGER DEFAULT 0,
  tags TEXT[],
  language TEXT DEFAULT 'English',
  accessibility_features TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE,
  cancelled BOOLEAN DEFAULT false,
  cancellation_reason TEXT
);

-- Create event_rsvps table
CREATE TABLE public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.community_events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status rsvp_status DEFAULT 'pending',
  tickets_count INTEGER DEFAULT 1,
  total_amount NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',
  payment_id TEXT,
  attendee_name TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  attendee_phone TEXT,
  special_requests TEXT,
  check_in_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create event_vendors table
CREATE TABLE public.event_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.community_events(id) ON DELETE CASCADE NOT NULL,
  vendor_name TEXT NOT NULL,
  vendor_type TEXT NOT NULL,
  status vendor_status DEFAULT 'pending',
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  description TEXT,
  booth_number TEXT,
  setup_time TIME,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create event_logs table
CREATE TABLE public.event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.community_events(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_events
CREATE POLICY "Anyone can view published events"
  ON public.community_events FOR SELECT
  USING (published_at IS NOT NULL OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create events"
  ON public.community_events FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their events"
  ON public.community_events FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can update any event"
  ON public.community_events FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for event_rsvps
CREATE POLICY "Anyone can view RSVPs for their events"
  ON public.event_rsvps FOR SELECT
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM community_events 
      WHERE id = event_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create RSVPs"
  ON public.event_rsvps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own RSVPs"
  ON public.event_rsvps FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for event_vendors
CREATE POLICY "Anyone can view approved vendors"
  ON public.event_vendors FOR SELECT
  USING (status = 'approved' OR status = 'active');

CREATE POLICY "Event organizers can view all vendors for their events"
  ON public.event_vendors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_events 
      WHERE id = event_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can submit vendor applications"
  ON public.event_vendors FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update vendor status"
  ON public.event_vendors FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for event_logs
CREATE POLICY "Admins and organizers can view event logs"
  ON public.event_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM community_events 
      WHERE id = event_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "System can insert event logs"
  ON public.event_logs FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_community_events_city_locality ON public.community_events(city, locality);
CREATE INDEX idx_community_events_date ON public.community_events(event_date);
CREATE INDEX idx_community_events_category ON public.community_events(category);
CREATE INDEX idx_community_events_verified ON public.community_events(verified);
CREATE INDEX idx_event_rsvps_event_id ON public.event_rsvps(event_id);
CREATE INDEX idx_event_rsvps_user_id ON public.event_rsvps(user_id);
CREATE INDEX idx_event_vendors_event_id ON public.event_vendors(event_id);

-- Trigger to update updated_at
CREATE TRIGGER update_community_events_updated_at
  BEFORE UPDATE ON public.community_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_rsvps_updated_at
  BEFORE UPDATE ON public.event_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_vendors_updated_at
  BEFORE UPDATE ON public.event_vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update attendee count
CREATE OR REPLACE FUNCTION update_event_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    UPDATE community_events 
    SET current_attendees = current_attendees + NEW.tickets_count
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
    UPDATE community_events 
    SET current_attendees = current_attendees + NEW.tickets_count
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
    UPDATE community_events 
    SET current_attendees = current_attendees - OLD.tickets_count
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
    UPDATE community_events 
    SET current_attendees = current_attendees - OLD.tickets_count
    WHERE id = OLD.event_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_attendee_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.event_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION update_event_attendee_count();

-- Insert seed data for festival events
INSERT INTO public.community_events (
  title, description, city, locality, event_date, event_time, end_date, venue, venue_address,
  category, organizer, organizer_email, verified, featured, ticket_price, max_attendees,
  tags, language, image_url, published_at, lat, lng
) VALUES
(
  'Bonalu Festival 2025',
  'The grand Bonalu festival celebrating Goddess Mahakali with traditional processions, cultural performances, and community feasts. Join us for this vibrant celebration of Telugu culture and heritage.',
  'Hyderabad',
  'Secunderabad',
  '2025-07-20',
  '06:00:00',
  '2025-07-21',
  'Ujjaini Mahakali Temple',
  'Secunderabad, Hyderabad, Telangana 500003',
  'festival',
  'Telangana Tourism Department',
  'events@telanganatourism.gov.in',
  true,
  true,
  0,
  50000,
  ARRAY['festival', 'cultural', 'traditional', 'bonalu', 'telangana'],
  'Telugu',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800',
  now(),
  17.4399,
  78.4983
),
(
  'Bathukamma Festival Celebrations',
  'Experience the colorful Bathukamma festival with flower stack arrangements, traditional songs, and cultural performances. A celebration of womanhood and nature''s bounty.',
  'Hyderabad',
  'Gachibowli',
  '2025-10-02',
  '17:00:00',
  '2025-10-10',
  'Gachibowli Stadium',
  'Gachibowli, Hyderabad, Telangana 500032',
  'festival',
  'Hyderabad Cultural Society',
  'info@hyderabadculture.org',
  true,
  true,
  0,
  30000,
  ARRAY['festival', 'cultural', 'bathukamma', 'flowers', 'women'],
  'Telugu',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
  now(),
  17.4400,
  78.3489
),
(
  'Vijayawada Dasara Carnival 2025',
  'Grand Dasara celebrations featuring traditional dance performances, cultural exhibitions, food stalls, and the iconic Goddess Kanaka Durga procession. Experience the divine fervor of Vijayawada.',
  'Vijayawada',
  'Benz Circle',
  '2025-10-12',
  '05:00:00',
  '2025-10-21',
  'Indira Gandhi Municipal Stadium',
  'Benz Circle, Vijayawada, Andhra Pradesh 520010',
  'festival',
  'Vijayawada Municipal Corporation',
  'events@vijayawada.gov.in',
  true,
  true,
  100,
  75000,
  ARRAY['festival', 'dasara', 'cultural', 'religious', 'carnival'],
  'Telugu',
  'https://images.unsplash.com/photo-1569163139394-de4798aa62b6?w=800',
  now(),
  16.5062,
  80.6480
),
(
  'Tech Community Meetup - AI & Real Estate',
  'Join us for an evening of networking and learning about AI applications in real estate. Featuring talks from industry experts, live demos, and networking opportunities.',
  'Hyderabad',
  'HITEC City',
  '2025-06-15',
  '18:00:00',
  NULL,
  'T-Hub',
  'Raidurgam, Hyderabad, Telangana 500081',
  'workshop',
  'JaagaX Tech Community',
  'community@jaagax.com',
  true,
  false,
  500,
  200,
  ARRAY['technology', 'AI', 'real-estate', 'networking', 'workshop'],
  'English',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
  now(),
  17.4326,
  78.3874
),
(
  'Local Food Festival - Taste of Vijayawada',
  'Sample authentic Andhra cuisine from local vendors and restaurants. Live cooking demonstrations, food competitions, and cultural performances.',
  'Vijayawada',
  'MG Road',
  '2025-08-10',
  '11:00:00',
  '2025-08-11',
  'Prakasam Barrage',
  'MG Road, Vijayawada, Andhra Pradesh 520001',
  'food',
  'Vijayawada Food Association',
  'info@vijayawadafood.org',
  true,
  false,
  200,
  5000,
  ARRAY['food', 'cultural', 'local', 'andhra-cuisine'],
  'Telugu',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
  now(),
  16.5102,
  80.6211
);