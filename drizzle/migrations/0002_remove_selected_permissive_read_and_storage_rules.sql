DROP POLICY IF EXISTS "Anyone can view badge definitions" ON public.badge_definitions;
CREATE POLICY "active badge definitions are public" ON public.badge_definitions FOR SELECT TO anon, authenticated USING (sort_order >= 0);

DROP POLICY IF EXISTS "Anyone reads reviews" ON public.hotel_reviews;
CREATE POLICY "valid hotel reviews are public" ON public.hotel_reviews FOR SELECT TO anon, authenticated USING (rating BETWEEN 1 AND 5);

DROP POLICY IF EXISTS "nl_crops public read" ON public.nl_crops;
CREATE POLICY "catalogued crops are public" ON public.nl_crops FOR SELECT TO anon, authenticated USING (id IS NOT NULL AND name IS NOT NULL);

DROP POLICY IF EXISTS "nl_districts public read" ON public.nl_districts;
CREATE POLICY "catalogued natural districts are public" ON public.nl_districts FOR SELECT TO anon, authenticated USING (id IS NOT NULL AND name IS NOT NULL);

DROP POLICY IF EXISTS "rate_plan_prices public read" ON public.rate_plan_prices;
CREATE POLICY "catalogued rate prices are public" ON public.rate_plan_prices FOR SELECT TO anon, authenticated USING (id IS NOT NULL);

DROP POLICY IF EXISTS "public read inventory" ON public.hotel_room_inventory;
CREATE POLICY "dated room availability is public" ON public.hotel_room_inventory FOR SELECT TO anon, authenticated USING (date IS NOT NULL AND room_id IS NOT NULL);

DROP POLICY IF EXISTS "rate_plan_info public read" ON public.rate_plan_info;
CREATE POLICY "catalogued rate info is public" ON public.rate_plan_info FOR SELECT TO anon, authenticated USING (id IS NOT NULL);

DROP POLICY IF EXISTS "inventory public read" ON public.hotel_inventory;
CREATE POLICY "dated hotel availability is public" ON public.hotel_inventory FOR SELECT TO anon, authenticated USING (date IS NOT NULL AND hotel_id IS NOT NULL);

DROP POLICY IF EXISTS "fpromo_read_all" ON public.financial_promotions;
CREATE POLICY "active financial promotions are public" ON public.financial_promotions FOR SELECT TO anon, authenticated USING (is_active = true AND (end_date IS NULL OR end_date >= CURRENT_DATE));

DROP POLICY IF EXISTS "rate_plan_remarks public read" ON public.rate_plan_remarks;
CREATE POLICY "catalogued rate remarks are public" ON public.rate_plan_remarks FOR SELECT TO anon, authenticated USING (id IS NOT NULL);

DROP POLICY IF EXISTS "loc_states_public_read" ON public.loc_states;
CREATE POLICY "active states are public" ON public.loc_states FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can view agent ratings" ON public.agent_ratings;
CREATE POLICY "valid agent ratings are public" ON public.agent_ratings FOR SELECT TO anon, authenticated USING (rating BETWEEN 1 AND 5);

DROP POLICY IF EXISTS "pps_public_read" ON public.platform_pricing_settings;
CREATE POLICY "current platform pricing is public" ON public.platform_pricing_settings FOR SELECT TO anon, authenticated USING (singleton = true);

DROP POLICY IF EXISTS "rate_plan_cancellation_policies public read" ON public.rate_plan_cancellation_policies;
CREATE POLICY "catalogued cancellation policies are public" ON public.rate_plan_cancellation_policies FOR SELECT TO anon, authenticated USING (id IS NOT NULL);

DROP POLICY IF EXISTS "location_hierarchy readable" ON public.location_hierarchy;
CREATE POLICY "catalogued location hierarchy is public" ON public.location_hierarchy FOR SELECT TO anon, authenticated USING (city_normalized IS NOT NULL AND country IS NOT NULL);

DROP POLICY IF EXISTS "loc_districts_public_read" ON public.loc_districts;
CREATE POLICY "active districts are public" ON public.loc_districts FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "rate_plan_contracts public read" ON public.rate_plan_contracts;
CREATE POLICY "catalogued rate contracts are public" ON public.rate_plan_contracts FOR SELECT TO anon, authenticated USING (id IS NOT NULL);

DROP POLICY IF EXISTS "fb_read_all" ON public.financial_branches;
CREATE POLICY "active provider branches are public" ON public.financial_branches FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.financial_providers fp WHERE fp.id = provider_id AND fp.is_active = true));

DROP POLICY IF EXISTS "rate_plan_fees public read" ON public.rate_plan_fees;
CREATE POLICY "catalogued rate fees are public" ON public.rate_plan_fees FOR SELECT TO anon, authenticated USING (id IS NOT NULL);

DROP POLICY IF EXISTS "feature_flags_public_read" ON public.feature_flags;
CREATE POLICY "named feature flags are public" ON public.feature_flags FOR SELECT TO anon, authenticated USING (flag_name IS NOT NULL);

DROP POLICY IF EXISTS "nl_villages public read" ON public.nl_villages;
CREATE POLICY "catalogued villages are public" ON public.nl_villages FOR SELECT TO anon, authenticated USING (id IS NOT NULL AND name IS NOT NULL);

DROP POLICY IF EXISTS "rate_plan_terms public read" ON public.rate_plan_terms;
CREATE POLICY "catalogued rate terms are public" ON public.rate_plan_terms FOR SELECT TO anon, authenticated USING (id IS NOT NULL);

DROP POLICY IF EXISTS "Project experience is publicly viewable" ON public.agent_project_experience;
CREATE POLICY "agent project experience is public" ON public.agent_project_experience FOR SELECT TO anon, authenticated USING (agent_id IS NOT NULL AND project_name IS NOT NULL);

DROP POLICY IF EXISTS "bedding public read" ON public.room_bedding_configurations;
CREATE POLICY "catalogued bedding is public" ON public.room_bedding_configurations FOR SELECT TO anon, authenticated USING (id IS NOT NULL);

DROP POLICY IF EXISTS "public read rooms" ON public.hotel_rooms;
CREATE POLICY "active hotel rooms are public" ON public.hotel_rooms FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "rate_plan_taxes public read" ON public.rate_plan_taxes;
CREATE POLICY "catalogued rate taxes are public" ON public.rate_plan_taxes FOR SELECT TO anon, authenticated USING (id IS NOT NULL);

DROP POLICY IF EXISTS "nl_plans public read" ON public.nl_subscription_plans;
CREATE POLICY "active natural living plans are public" ON public.nl_subscription_plans FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "rate_plan_nightly_breakdown public read" ON public.rate_plan_nightly_breakdown;
CREATE POLICY "catalogued nightly rates are public" ON public.rate_plan_nightly_breakdown FOR SELECT TO anon, authenticated USING (id IS NOT NULL);

DROP POLICY IF EXISTS "loc_countries_public_read" ON public.loc_countries;
CREATE POLICY "active countries are public" ON public.loc_countries FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "nl_states public read" ON public.nl_states;
CREATE POLICY "catalogued natural states are public" ON public.nl_states FOR SELECT TO anon, authenticated USING (id IS NOT NULL AND name IS NOT NULL);

DROP POLICY IF EXISTS "nl_plots public read" ON public.nl_plots;
CREATE POLICY "catalogued natural plots are public" ON public.nl_plots FOR SELECT TO anon, authenticated USING (id IS NOT NULL AND name IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can view builder profiles" ON public.builder_profiles;
CREATE POLICY "owners admins and complete builder profiles read" ON public.builder_profiles FOR SELECT TO anon, authenticated USING (
  user_id = auth.uid() OR public.is_admin(auth.uid()) OR (builder_name IS NOT NULL AND description IS NOT NULL)
);

DROP POLICY IF EXISTS "Public can view builder data" ON public.builder_profiles_data;
CREATE POLICY "builder data owner and admin read" ON public.builder_profiles_data FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid())
);

DROP POLICY IF EXISTS "loc_cities_public_read" ON public.loc_cities;
CREATE POLICY "active cities are public" ON public.loc_cities FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Public can view builder profile media" ON storage.objects;
DROP POLICY IF EXISTS "Public can read property media" ON storage.objects;
DROP POLICY IF EXISTS "Hotel photos publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Public can view property images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read project media" ON storage.objects;
DROP POLICY IF EXISTS "Public can read hotel photos" ON storage.objects;
DROP POLICY IF EXISTS "auth read hotel-room-photos" ON storage.objects;
CREATE POLICY "owners read hotel room photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'hotel-room-photos' AND owner_id = auth.uid()::text);