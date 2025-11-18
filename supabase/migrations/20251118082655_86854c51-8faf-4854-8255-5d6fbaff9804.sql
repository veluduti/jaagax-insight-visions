-- Approve the specific visit booking
UPDATE visit_bookings 
SET 
  status = 'confirmed',
  updated_at = NOW()
WHERE id = 'f970de09-2851-4830-be9c-3b700a929168';