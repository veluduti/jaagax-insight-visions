-- Update the pending visit to confirmed status
UPDATE visit_bookings 
SET status = 'confirmed', updated_at = now()
WHERE id = '9a3d5e15-ca10-4ed0-b609-8fdd9d56fabc' 
AND status = 'pending_approval'