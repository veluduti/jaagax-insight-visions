-- Internal physical units are visible only to the hotel's manager, active staff,
-- and existing global administrators; public availability uses separate APIs.
DROP POLICY IF EXISTS "units public read" ON public.hotel_inventory_units;
REVOKE SELECT ON public.hotel_inventory_units FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_inventory_units TO authenticated;
GRANT ALL ON public.hotel_inventory_units TO service_role;
ALTER TABLE public.hotel_inventory_units ENABLE ROW LEVEL SECURITY;

-- Preserve the existing join-policy capacity check without exposing member IDs
-- or counting only the rows that the joining user is allowed to read.
CREATE OR REPLACE FUNCTION public.travel_journey_has_capacity(_journey_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.travel_journeys j
    WHERE j.id = _journey_id
      AND j.status = 'open'
      AND (SELECT count(*) FROM public.travel_journey_members m
           WHERE m.journey_id = j.id) < j.seats - 1
  );
$$;
REVOKE ALL ON FUNCTION public.travel_journey_has_capacity(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.travel_journey_has_capacity(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Member counts visible" ON public.travel_journey_members;
CREATE POLICY "Members and hosts read journey membership"
ON public.travel_journey_members FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.travel_journeys j
    WHERE j.id = travel_journey_members.journey_id AND j.host_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);
ALTER POLICY "Users join journeys" ON public.travel_journey_members
WITH CHECK (user_id = auth.uid() AND public.travel_journey_has_capacity(journey_id));
REVOKE SELECT ON public.travel_journey_members FROM anon;
GRANT SELECT, INSERT, DELETE ON public.travel_journey_members TO authenticated;
GRANT ALL ON public.travel_journey_members TO service_role;
ALTER TABLE public.travel_journey_members ENABLE ROW LEVEL SECURITY;