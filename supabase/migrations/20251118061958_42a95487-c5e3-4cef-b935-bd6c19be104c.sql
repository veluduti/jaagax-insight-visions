-- First, drop the old status check constraint
ALTER TABLE visit_bookings 
DROP CONSTRAINT IF EXISTS visit_bookings_status_check;

-- Update existing statuses to new values
UPDATE visit_bookings 
SET status = 'pending_approval' 
WHERE status IN ('builder_pending', 'agent_pending');

UPDATE visit_bookings 
SET status = 'confirmed' 
WHERE status = 'pending';

-- Now add new check constraint with updated status values
ALTER TABLE visit_bookings 
ADD CONSTRAINT visit_bookings_status_check 
CHECK (status IN ('pending_approval', 'confirmed', 'in_progress', 'completed', 'cancelled'));