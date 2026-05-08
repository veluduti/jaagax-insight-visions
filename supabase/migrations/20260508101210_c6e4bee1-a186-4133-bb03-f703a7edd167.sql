
-- Properties
CREATE INDEX IF NOT EXISTS idx_properties_submitted_by ON public.properties(submitted_by);
CREATE INDEX IF NOT EXISTS idx_properties_builder_id ON public.properties(builder_id);
CREATE INDEX IF NOT EXISTS idx_properties_assigned_agent_id ON public.properties(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_city ON public.properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_locality ON public.properties(locality);
CREATE INDEX IF NOT EXISTS idx_properties_listing_status ON public.properties(listing_status);
CREATE INDEX IF NOT EXISTS idx_properties_verification_status ON public.properties(verification_status);
CREATE INDEX IF NOT EXISTS idx_properties_is_draft ON public.properties(is_draft);
CREATE INDEX IF NOT EXISTS idx_properties_is_live ON public.properties(is_live);
CREATE INDEX IF NOT EXISTS idx_properties_is_featured ON public.properties(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_updated_at ON public.properties(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_listing_type_price ON public.properties(listing_type, price);
CREATE INDEX IF NOT EXISTS idx_properties_expiry_date ON public.properties(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_live_verified ON public.properties(is_live, verified) WHERE is_live = true AND verified = true;
CREATE INDEX IF NOT EXISTS idx_properties_slug ON public.properties(slug);

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_submitted_by ON public.projects(submitted_by);
CREATE INDEX IF NOT EXISTS idx_projects_city ON public.projects(city);
CREATE INDEX IF NOT EXISTS idx_projects_locality ON public.projects(locality);
CREATE INDEX IF NOT EXISTS idx_projects_is_draft ON public.projects(is_draft);
CREATE INDEX IF NOT EXISTS idx_projects_verified ON public.projects(verified);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_builder_name ON public.projects(builder_name);

-- Favorites
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_property_id ON public.favorites(property_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_property ON public.favorites(user_id, property_id);

-- Visits (table may exist)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='visits') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_visits_buyer_id ON public.visits(buyer_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_visits_agent_id ON public.visits(agent_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_visits_property_id ON public.visits(property_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_visits_status ON public.visits(status)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_visits_scheduled_at ON public.visits(scheduled_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_visits_created_at ON public.visits(created_at DESC)';
  END IF;
END $$;

-- Hotel bookings
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_user_id ON public.hotel_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_hotel_id ON public.hotel_bookings(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_status ON public.hotel_bookings(status);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_check_in ON public.hotel_bookings(check_in DESC);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_created_at ON public.hotel_bookings(created_at DESC);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

-- Buyer journey events
CREATE INDEX IF NOT EXISTS idx_buyer_journey_user_created ON public.buyer_journey_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buyer_journey_property ON public.buyer_journey_events(property_id);

-- Buyer context
CREATE INDEX IF NOT EXISTS idx_buyer_context_user_id ON public.buyer_context(user_id);

-- Agents
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_verified ON public.agents(verified);

-- Agent ratings
CREATE INDEX IF NOT EXISTS idx_agent_ratings_agent_id ON public.agent_ratings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_ratings_buyer_id ON public.agent_ratings(buyer_id);

-- Agent tasks
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_id ON public.agent_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_user_id ON public.agent_tasks(agent_user_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON public.agent_tasks(status);

-- Promotions
CREATE INDEX IF NOT EXISTS idx_promotions_builder_id ON public.promotions(builder_id);
CREATE INDEX IF NOT EXISTS idx_promotions_status_end ON public.promotions(status, end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_property_id ON public.promotions(property_id);
CREATE INDEX IF NOT EXISTS idx_promotions_project_id ON public.promotions(project_id);

-- Promotion events
CREATE INDEX IF NOT EXISTS idx_promotion_events_promo ON public.promotion_events(promotion_id, created_at DESC);

-- Ad interactions
CREATE INDEX IF NOT EXISTS idx_ad_interactions_ad_id ON public.ad_interactions(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_interactions_user_id ON public.ad_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_interactions_created_at ON public.ad_interactions(created_at DESC);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_type ON public.profiles(type);

-- Builder profiles
CREATE INDEX IF NOT EXISTS idx_builder_profiles_user_id ON public.builder_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_builder_profiles_slug ON public.builder_profiles(slug);

-- Advertisements
CREATE INDEX IF NOT EXISTS idx_advertisements_status ON public.advertisements(status);
CREATE INDEX IF NOT EXISTS idx_advertisements_builder_id ON public.advertisements(builder_id);
CREATE INDEX IF NOT EXISTS idx_advertisements_property_id ON public.advertisements(property_id);
CREATE INDEX IF NOT EXISTS idx_advertisements_project_id ON public.advertisements(project_id);
