-- Drop and recreate the update policy
DROP POLICY IF EXISTS "Builders can update their property visits" ON visit_bookings;

-- Create correct policy: Builders can update visits for their properties
CREATE POLICY "Builders can update their property visits"
ON visit_bookings
FOR UPDATE
USING (
  property_id IN (
    SELECT p.id FROM properties p WHERE p.submitted_by = auth.uid()
  )
  OR
  builder_id IN (
    SELECT DISTINCT p.builder_id FROM properties p WHERE p.submitted_by = auth.uid() AND p.builder_id IS NOT NULL
  )
);