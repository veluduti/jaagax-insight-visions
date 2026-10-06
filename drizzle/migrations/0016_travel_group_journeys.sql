CREATE TABLE public.travel_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  destination_name text NOT NULL CHECK (char_length(destination_name) BETWEEN 2 AND 80),
  description text CHECK (char_length(description) <= 1000),
  vibe text,
  start_date date,
  duration_days int CHECK (duration_days BETWEEN 1 AND 30),
  seats int NOT NULL DEFAULT 6 CHECK (seats BETWEEN 2 AND 40),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','full','closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.travel_journeys TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_journeys TO authenticated;
GRANT ALL ON public.travel_journeys TO service_role;
ALTER TABLE public.travel_journeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open journeys are public" ON public.travel_journeys FOR SELECT USING (status <> 'closed' OR host_id = auth.uid());
CREATE POLICY "Hosts create journeys" ON public.travel_journeys FOR INSERT TO authenticated WITH CHECK (host_id = auth.uid());
CREATE POLICY "Hosts update journeys" ON public.travel_journeys FOR UPDATE TO authenticated USING (host_id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (host_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Hosts delete journeys" ON public.travel_journeys FOR DELETE TO authenticated USING (host_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE TABLE public.travel_journey_members (
  journey_id uuid NOT NULL REFERENCES public.travel_journeys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (journey_id, user_id)
);
GRANT SELECT ON public.travel_journey_members TO anon;
GRANT SELECT, INSERT, DELETE ON public.travel_journey_members TO authenticated;
GRANT ALL ON public.travel_journey_members TO service_role;
ALTER TABLE public.travel_journey_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Member counts visible" ON public.travel_journey_members FOR SELECT USING (true);
CREATE POLICY "Users join journeys" ON public.travel_journey_members FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.travel_journeys j WHERE j.id = journey_id AND j.status = 'open'
      AND (SELECT count(*) FROM public.travel_journey_members m WHERE m.journey_id = j.id) < j.seats - 1));
CREATE POLICY "Users leave journeys" ON public.travel_journey_members FOR DELETE TO authenticated USING (user_id = auth.uid());