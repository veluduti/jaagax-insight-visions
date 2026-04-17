ALTER TABLE public.saved_searches REPLICA IDENTITY FULL;
ALTER TABLE public.hotel_bookings REPLICA IDENTITY FULL;
ALTER TABLE public.favorites REPLICA IDENTITY FULL;
ALTER TABLE public.visit_bookings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_searches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hotel_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.favorites;