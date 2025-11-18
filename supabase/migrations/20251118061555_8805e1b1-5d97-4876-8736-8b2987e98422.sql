-- Assign top agent to existing visits without an agent
UPDATE visit_bookings 
SET agent_id = 3 
WHERE agent_id IS NULL;