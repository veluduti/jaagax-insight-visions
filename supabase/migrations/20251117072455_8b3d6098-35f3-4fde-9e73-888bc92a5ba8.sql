-- Allow anyone to view visit bookings with builder_pending status for testing
-- This is a temporary policy for testing the builder dashboard

DROP POLICY IF EXISTS "Builders can view pending visits" ON visit_bookings;
DROP POLICY IF EXISTS "Anyone can view builder pending visits" ON visit_bookings;

CREATE POLICY "Anyone can view builder pending visits"
ON visit_bookings
FOR SELECT
USING (status = 'builder_pending');

-- Also allow updates for the approve/reject functionality
DROP POLICY IF EXISTS "Builders can update their visits" ON visit_bookings;

CREATE POLICY "Builders can update their visits"
ON visit_bookings
FOR UPDATE
USING (status = 'builder_pending');
