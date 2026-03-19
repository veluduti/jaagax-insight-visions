
-- Drop the foreign key constraint on user_id so bookings work without auth for testing
ALTER TABLE public.hotel_bookings DROP CONSTRAINT IF EXISTS hotel_bookings_user_id_fkey;

-- Make user_id nullable so unauthenticated bookings are possible
ALTER TABLE public.hotel_bookings ALTER COLUMN user_id DROP NOT NULL;
