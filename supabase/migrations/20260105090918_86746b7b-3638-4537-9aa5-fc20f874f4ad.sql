-- Drop old constraint and add new one with all statuses
ALTER TABLE visit_bookings 
DROP CONSTRAINT IF EXISTS visit_bookings_status_check;

ALTER TABLE visit_bookings 
ADD CONSTRAINT visit_bookings_status_check 
CHECK (status = ANY (ARRAY[
  'pending_approval'::text, 
  'confirmed'::text, 
  'in_progress'::text, 
  'completed'::text, 
  'cancelled'::text,
  'builder_rejected'::text
]));