
ALTER TABLE public.hotel_guest_messages REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.hotel_guest_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
