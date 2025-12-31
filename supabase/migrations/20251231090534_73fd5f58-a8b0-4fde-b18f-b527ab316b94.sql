-- Create enum for advertisement types
CREATE TYPE public.ad_type AS ENUM ('property', 'project', 'builder_brand');

-- Create enum for advertisement status
CREATE TYPE public.ad_status AS ENUM ('draft', 'pending_approval', 'active', 'paused', 'expired', 'rejected');

-- Create advertisements table
CREATE TABLE public.advertisements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    builder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id INTEGER REFERENCES public.properties(id) ON DELETE SET NULL,
    project_id INTEGER REFERENCES public.projects(id) ON DELETE SET NULL,
    ad_type ad_type NOT NULL DEFAULT 'property',
    title TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    images TEXT[] DEFAULT '{}',
    highlights JSONB DEFAULT '[]',
    offer_text TEXT,
    cta_text TEXT DEFAULT 'Learn More',
    budget NUMERIC DEFAULT 0,
    status ad_status NOT NULL DEFAULT 'draft',
    priority INTEGER DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    contacts INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create saved_advertisements table
CREATE TABLE public.saved_advertisements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    advertisement_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
    notes TEXT,
    contacted BOOLEAN DEFAULT false,
    contacted_at TIMESTAMP WITH TIME ZONE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, advertisement_id)
);

-- Create ad_interactions table for analytics
CREATE TABLE public.ad_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advertisement_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    interaction_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for advertisements
CREATE POLICY "Anyone can view active advertisements"
ON public.advertisements FOR SELECT
USING (status = 'active' OR builder_id = auth.uid());

CREATE POLICY "Builders can insert their own advertisements"
ON public.advertisements FOR INSERT
WITH CHECK (auth.uid() = builder_id);

CREATE POLICY "Builders can update their own advertisements"
ON public.advertisements FOR UPDATE
USING (auth.uid() = builder_id);

CREATE POLICY "Builders can delete their own advertisements"
ON public.advertisements FOR DELETE
USING (auth.uid() = builder_id);

CREATE POLICY "Admins can manage all advertisements"
ON public.advertisements FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for saved_advertisements
CREATE POLICY "Users can view their saved advertisements"
ON public.saved_advertisements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can save advertisements"
ON public.saved_advertisements FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their saved advertisements"
ON public.saved_advertisements FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their saved advertisements"
ON public.saved_advertisements FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for ad_interactions
CREATE POLICY "Anyone can insert interactions"
ON public.ad_interactions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Builders can view their ad interactions"
ON public.ad_interactions FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.advertisements 
    WHERE id = advertisement_id AND builder_id = auth.uid()
));

CREATE POLICY "Admins can view all interactions"
ON public.ad_interactions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger to update updated_at
CREATE TRIGGER update_advertisements_updated_at
BEFORE UPDATE ON public.advertisements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to increment ad stats
CREATE OR REPLACE FUNCTION public.increment_ad_stat(
    p_ad_id UUID,
    p_stat_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_stat_type = 'impressions' THEN
        UPDATE advertisements SET impressions = impressions + 1 WHERE id = p_ad_id;
    ELSIF p_stat_type = 'clicks' THEN
        UPDATE advertisements SET clicks = clicks + 1 WHERE id = p_ad_id;
    ELSIF p_stat_type = 'saves' THEN
        UPDATE advertisements SET saves = saves + 1 WHERE id = p_ad_id;
    ELSIF p_stat_type = 'contacts' THEN
        UPDATE advertisements SET contacts = contacts + 1 WHERE id = p_ad_id;
    END IF;
    
    -- Log the interaction
    INSERT INTO ad_interactions (advertisement_id, user_id, interaction_type)
    VALUES (p_ad_id, auth.uid(), p_stat_type);
END;
$$;

-- Create function to decrement saves when unsaved
CREATE OR REPLACE FUNCTION public.decrement_ad_saves()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE advertisements SET saves = GREATEST(saves - 1, 0) WHERE id = OLD.advertisement_id;
    INSERT INTO ad_interactions (advertisement_id, user_id, interaction_type)
    VALUES (OLD.advertisement_id, OLD.user_id, 'unsave');
    RETURN OLD;
END;
$$;

CREATE TRIGGER on_advertisement_unsaved
BEFORE DELETE ON public.saved_advertisements
FOR EACH ROW
EXECUTE FUNCTION public.decrement_ad_saves();