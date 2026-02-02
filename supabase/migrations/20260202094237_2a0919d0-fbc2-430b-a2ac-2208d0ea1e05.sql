-- Create advertisements table for the Promotions feature
CREATE TABLE public.advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('property', 'project', 'builder_brand')),
  title TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  highlights JSONB DEFAULT '[]'::jsonb,
  offer_text TEXT,
  cta_text TEXT DEFAULT 'Learn More',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired', 'draft')),
  featured BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 5,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  contacts INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  budget NUMERIC,
  spent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for advertisements
-- Anyone can view active advertisements
CREATE POLICY "Anyone can view active advertisements"
ON public.advertisements
FOR SELECT
USING (status = 'active');

-- Builders can manage their own advertisements
CREATE POLICY "Builders can manage their advertisements"
ON public.advertisements
FOR ALL
USING (builder_id = auth.uid())
WITH CHECK (builder_id = auth.uid());

-- Create index for performance
CREATE INDEX idx_advertisements_builder ON public.advertisements(builder_id);
CREATE INDEX idx_advertisements_status ON public.advertisements(status);
CREATE INDEX idx_advertisements_featured ON public.advertisements(featured) WHERE featured = true;

-- Create updated_at trigger
CREATE TRIGGER update_advertisements_updated_at
BEFORE UPDATE ON public.advertisements
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create community_events table for Events feature
CREATE TABLE public.community_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  end_date DATE,
  end_time TIME,
  venue TEXT NOT NULL,
  venue_address TEXT,
  city TEXT NOT NULL,
  locality TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  category TEXT NOT NULL CHECK (category IN ('festival', 'community', 'cultural', 'sports', 'music', 'food', 'other')),
  organizer TEXT,
  organizer_email TEXT,
  organizer_contact TEXT,
  organizer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ticket_price NUMERIC DEFAULT 0,
  max_attendees INTEGER,
  current_attendees INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  tags JSONB DEFAULT '[]'::jsonb,
  language TEXT DEFAULT 'English',
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  accessibility_features JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_events
-- Anyone can view published events
CREATE POLICY "Anyone can view published events"
ON public.community_events
FOR SELECT
USING (published_at IS NOT NULL AND status != 'cancelled');

-- Admins can manage all events
CREATE POLICY "Admins can manage events"
ON public.community_events
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Organizers can manage their own events
CREATE POLICY "Organizers can manage their events"
ON public.community_events
FOR ALL
USING (organizer_id = auth.uid())
WITH CHECK (organizer_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_community_events_city ON public.community_events(city);
CREATE INDEX idx_community_events_date ON public.community_events(event_date);
CREATE INDEX idx_community_events_category ON public.community_events(category);
CREATE INDEX idx_community_events_featured ON public.community_events(featured) WHERE featured = true;

-- Create updated_at trigger
CREATE TRIGGER update_community_events_updated_at
BEFORE UPDATE ON public.community_events
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create event_rsvps table for tracking RSVPs
CREATE TABLE public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'going' CHECK (status IN ('going', 'interested', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- Users can view all RSVPs for events they're attending
CREATE POLICY "Users can view event RSVPs"
ON public.event_rsvps
FOR SELECT
USING (true);

-- Users can manage their own RSVPs
CREATE POLICY "Users can manage their RSVPs"
ON public.event_rsvps
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create ad_interactions table for tracking engagement
CREATE TABLE public.ad_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('impression', 'click', 'save', 'unsave', 'contact', 'share')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_interactions ENABLE ROW LEVEL SECURITY;

-- Anyone can create interactions (for tracking)
CREATE POLICY "Anyone can create ad interactions"
ON public.ad_interactions
FOR INSERT
WITH CHECK (true);

-- Users can view their own interactions
CREATE POLICY "Users can view their interactions"
ON public.ad_interactions
FOR SELECT
USING (user_id = auth.uid() OR user_id IS NULL);

-- Builders can view interactions on their ads
CREATE POLICY "Builders can view their ad interactions"
ON public.ad_interactions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.advertisements a
  WHERE a.id = ad_interactions.ad_id AND a.builder_id = auth.uid()
));

-- Create index for performance
CREATE INDEX idx_ad_interactions_ad ON public.ad_interactions(ad_id);
CREATE INDEX idx_ad_interactions_user ON public.ad_interactions(user_id);
CREATE INDEX idx_ad_interactions_type ON public.ad_interactions(interaction_type);