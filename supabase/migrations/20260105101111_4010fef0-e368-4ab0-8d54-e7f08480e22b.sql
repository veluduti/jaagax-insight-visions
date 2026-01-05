-- Fix builder visibility for visit approvals and remove insecure policies

-- Remove broken/unsafe policies
DROP POLICY IF EXISTS "Builders can view visits for their properties" ON public.visit_bookings;
DROP POLICY IF EXISTS "Anyone can view builder pending visits" ON public.visit_bookings;
DROP POLICY IF EXISTS "Builders can update their visits" ON public.visit_bookings;

-- Builders can view visits for properties they submitted OR that share their builder_id
CREATE POLICY "Builders can view their property visits"
ON public.visit_bookings
FOR SELECT
TO authenticated
USING (
  property_id IN (
    SELECT p.id FROM public.properties p
    WHERE p.submitted_by = auth.uid()
  )
  OR
  builder_id IN (
    SELECT DISTINCT p.builder_id FROM public.properties p
    WHERE p.submitted_by = auth.uid()
      AND p.builder_id IS NOT NULL
  )
);

-- Ensure update policy is restricted to authenticated users as well
ALTER POLICY "Builders can update their property visits" ON public.visit_bookings
TO authenticated;