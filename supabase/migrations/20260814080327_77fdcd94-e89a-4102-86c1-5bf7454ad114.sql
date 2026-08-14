ALTER TABLE public.hotel_extra_service_enquiries
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS preferred_time_from text,
  ADD COLUMN IF NOT EXISTS preferred_time_to text;