CREATE TABLE public.travel_profiles (
 user_id UUID PRIMARY KEY, interests TEXT[] NOT NULL DEFAULT '{}', moods TEXT[] NOT NULL DEFAULT '{}', pace TEXT NOT NULL DEFAULT 'balanced', budget_preference TEXT NOT NULL DEFAULT 'mid-range', companion_preference TEXT NOT NULL DEFAULT 'solo', stay_preferences TEXT[] NOT NULL DEFAULT '{}', home_city TEXT, privacy JSONB NOT NULL DEFAULT '{"personalization":true,"public_memories":false}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_profiles TO authenticated; GRANT ALL ON public.travel_profiles TO service_role;
ALTER TABLE public.travel_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Travel profiles belong to users" ON public.travel_profiles FOR ALL TO authenticated USING (user_id=auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (user_id=auth.uid() OR public.is_admin(auth.uid()));

CREATE TABLE public.travel_destinations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, state_name TEXT NOT NULL, country_name TEXT NOT NULL DEFAULT 'India', tagline TEXT, description TEXT, image_url TEXT, personality_tags TEXT[] NOT NULL DEFAULT '{}', best_time TEXT, recommended_days TEXT, local_areas TEXT[] NOT NULL DEFAULT '{}', suitability JSONB NOT NULL DEFAULT '{}'::jsonb, trust_label TEXT NOT NULL DEFAULT 'jaaga_recommended', status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN('draft','pending','approved','rejected','paused')), created_by UUID, approved_by UUID, approved_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT ON public.travel_destinations TO anon, authenticated; GRANT INSERT, UPDATE, DELETE ON public.travel_destinations TO authenticated; GRANT ALL ON public.travel_destinations TO service_role;
ALTER TABLE public.travel_destinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved destinations are public" ON public.travel_destinations FOR SELECT TO anon, authenticated USING(status='approved' OR created_by=auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage destinations" ON public.travel_destinations FOR ALL TO authenticated USING(public.is_admin(auth.uid())) WITH CHECK(public.is_admin(auth.uid()));
CREATE POLICY "Partners propose destinations" ON public.travel_destinations FOR INSERT TO authenticated WITH CHECK(created_by=auth.uid() AND status IN('draft','pending'));
CREATE POLICY "Partners edit destination drafts" ON public.travel_destinations FOR UPDATE TO authenticated USING(created_by=auth.uid() AND status IN('draft','pending','rejected')) WITH CHECK(created_by=auth.uid() AND status IN('draft','pending'));

CREATE TABLE public.travel_experiences (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), destination_id UUID REFERENCES public.travel_destinations(id) ON DELETE SET NULL, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, description TEXT, city TEXT NOT NULL, locality TEXT, category TEXT NOT NULL, duration_minutes INTEGER, best_time TEXT, best_for TEXT[] NOT NULL DEFAULT '{}', image_url TEXT, price NUMERIC(12,2), capacity INTEGER, availability JSONB NOT NULL DEFAULT '{}'::jsonb, requirements TEXT, trust_label TEXT NOT NULL DEFAULT 'jaaga_recommended', status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN('draft','pending','approved','rejected','paused')), created_by UUID, approved_by UUID, approved_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT ON public.travel_experiences TO anon, authenticated; GRANT INSERT, UPDATE, DELETE ON public.travel_experiences TO authenticated; GRANT ALL ON public.travel_experiences TO service_role;
ALTER TABLE public.travel_experiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved experiences are public" ON public.travel_experiences FOR SELECT TO anon, authenticated USING(status='approved' OR created_by=auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage experiences" ON public.travel_experiences FOR ALL TO authenticated USING(public.is_admin(auth.uid())) WITH CHECK(public.is_admin(auth.uid()));
CREATE POLICY "Partners propose experiences" ON public.travel_experiences FOR INSERT TO authenticated WITH CHECK(created_by=auth.uid() AND status IN('draft','pending'));
CREATE POLICY "Partners edit experience drafts" ON public.travel_experiences FOR UPDATE TO authenticated USING(created_by=auth.uid() AND status IN('draft','pending','rejected')) WITH CHECK(created_by=auth.uid() AND status IN('draft','pending'));

CREATE TABLE public.travel_plans (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, title TEXT NOT NULL, destination_name TEXT, start_date DATE, end_date DATE, duration_days INTEGER NOT NULL DEFAULT 1, mood TEXT, interests TEXT[] NOT NULL DEFAULT '{}', pace TEXT NOT NULL DEFAULT 'balanced', budget_preference TEXT, companion_type TEXT, purpose TEXT NOT NULL DEFAULT 'leisure', fit_score INTEGER CHECK(fit_score BETWEEN 0 AND 100), explanation TEXT, status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN('draft','planned','active','completed','archived')), is_collaborative BOOLEAN NOT NULL DEFAULT false, share_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6),'hex'), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_plans TO authenticated; GRANT ALL ON public.travel_plans TO service_role;
ALTER TABLE public.travel_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own plans" ON public.travel_plans FOR ALL TO authenticated USING(user_id=auth.uid() OR public.is_admin(auth.uid())) WITH CHECK(user_id=auth.uid() OR public.is_admin(auth.uid()));

CREATE TABLE public.travel_plan_items (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), plan_id UUID NOT NULL REFERENCES public.travel_plans(id) ON DELETE CASCADE, day_number INTEGER NOT NULL DEFAULT 1, period TEXT NOT NULL DEFAULT 'morning' CHECK(period IN('morning','afternoon','evening','flexible')), item_type TEXT NOT NULL DEFAULT 'experience' CHECK(item_type IN('experience','stay','property','note')), reference_id UUID, title TEXT NOT NULL, description TEXT, location TEXT, duration_minutes INTEGER, position INTEGER NOT NULL DEFAULT 0, is_kept BOOLEAN NOT NULL DEFAULT false, fit_score INTEGER CHECK(fit_score BETWEEN 0 AND 100), created_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_plan_items TO authenticated; GRANT ALL ON public.travel_plan_items TO service_role;
ALTER TABLE public.travel_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plan owners manage items" ON public.travel_plan_items FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.travel_plans p WHERE p.id=plan_id AND(p.user_id=auth.uid() OR public.is_admin(auth.uid())))) WITH CHECK(EXISTS(SELECT 1 FROM public.travel_plans p WHERE p.id=plan_id AND(p.user_id=auth.uid() OR public.is_admin(auth.uid()))));

CREATE TABLE public.travel_saves (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, collection_name TEXT NOT NULL DEFAULT 'Saved', item_type TEXT NOT NULL CHECK(item_type IN('destination','experience','stay','property','plan')), item_id TEXT NOT NULL, title TEXT NOT NULL, metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(user_id,item_type,item_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_saves TO authenticated; GRANT ALL ON public.travel_saves TO service_role;
ALTER TABLE public.travel_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage travel saves" ON public.travel_saves FOR ALL TO authenticated USING(user_id=auth.uid() OR public.is_admin(auth.uid())) WITH CHECK(user_id=auth.uid() OR public.is_admin(auth.uid()));

CREATE TABLE public.travel_memories (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, plan_id UUID REFERENCES public.travel_plans(id) ON DELETE SET NULL, title TEXT NOT NULL, notes TEXT, photo_urls TEXT[] NOT NULL DEFAULT '{}', rating INTEGER CHECK(rating BETWEEN 1 AND 5), is_public BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT ON public.travel_memories TO anon, authenticated; GRANT INSERT, UPDATE, DELETE ON public.travel_memories TO authenticated; GRANT ALL ON public.travel_memories TO service_role;
ALTER TABLE public.travel_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public or owned memories visible" ON public.travel_memories FOR SELECT TO anon, authenticated USING(is_public OR user_id=auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users manage memories" ON public.travel_memories FOR ALL TO authenticated USING(user_id=auth.uid() OR public.is_admin(auth.uid())) WITH CHECK(user_id=auth.uid() OR public.is_admin(auth.uid()));

CREATE TABLE public.travel_partner_profiles (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL UNIQUE, partner_type TEXT NOT NULL CHECK(partner_type IN('experience_partner','destination_partner','creator','local_expert')), display_name TEXT NOT NULL, bio TEXT, verification_status TEXT NOT NULL DEFAULT 'pending' CHECK(verification_status IN('pending','verified','rejected','paused')), verification_documents JSONB NOT NULL DEFAULT '[]'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT ON public.travel_partner_profiles TO anon, authenticated; GRANT INSERT, UPDATE, DELETE ON public.travel_partner_profiles TO authenticated; GRANT ALL ON public.travel_partner_profiles TO service_role;
ALTER TABLE public.travel_partner_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Verified partners are public" ON public.travel_partner_profiles FOR SELECT TO anon, authenticated USING(verification_status='verified' OR user_id=auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users manage partner profile" ON public.travel_partner_profiles FOR ALL TO authenticated USING(user_id=auth.uid() OR public.is_admin(auth.uid())) WITH CHECK(user_id=auth.uid() OR public.is_admin(auth.uid()));

CREATE TABLE public.travel_reports (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), reporter_id UUID NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, reason TEXT NOT NULL, details TEXT, status TEXT NOT NULL DEFAULT 'open' CHECK(status IN('open','reviewing','resolved','dismissed')), resolution_note TEXT, resolved_by UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), resolved_at TIMESTAMPTZ);
GRANT SELECT, INSERT, UPDATE ON public.travel_reports TO authenticated; GRANT ALL ON public.travel_reports TO service_role;
ALTER TABLE public.travel_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users submit and view own reports" ON public.travel_reports FOR SELECT TO authenticated USING(reporter_id=auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users submit reports" ON public.travel_reports FOR INSERT TO authenticated WITH CHECK(reporter_id=auth.uid() AND status='open');
CREATE POLICY "Admins resolve reports" ON public.travel_reports FOR UPDATE TO authenticated USING(public.is_admin(auth.uid())) WITH CHECK(public.is_admin(auth.uid()));

CREATE TABLE public.travel_events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID, event_type TEXT NOT NULL, entity_type TEXT, entity_id TEXT, source TEXT, metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT INSERT ON public.travel_events TO anon, authenticated; GRANT SELECT ON public.travel_events TO authenticated; GRANT ALL ON public.travel_events TO service_role;
ALTER TABLE public.travel_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anonymous travel events" ON public.travel_events FOR INSERT TO anon WITH CHECK(user_id IS NULL);
CREATE POLICY "Users record travel events" ON public.travel_events FOR INSERT TO authenticated WITH CHECK(user_id IS NULL OR user_id=auth.uid());
CREATE POLICY "Admins view travel events" ON public.travel_events FOR SELECT TO authenticated USING(public.is_admin(auth.uid()));
CREATE INDEX travel_destination_status_idx ON public.travel_destinations(status,name); CREATE INDEX travel_experience_city_idx ON public.travel_experiences(city,category,status); CREATE INDEX travel_plan_user_idx ON public.travel_plans(user_id,updated_at DESC); CREATE INDEX travel_plan_item_idx ON public.travel_plan_items(plan_id,day_number,position); CREATE INDEX travel_save_user_idx ON public.travel_saves(user_id,created_at DESC); CREATE INDEX travel_event_type_idx ON public.travel_events(event_type,created_at DESC);