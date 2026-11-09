ALTER TABLE public.partner_hotels ADD COLUMN IF NOT EXISTS supplier_content jsonb, ADD COLUMN IF NOT EXISTS supplier_synced_at timestamptz, ADD COLUMN IF NOT EXISTS supplier_sync_error text;
CREATE UNIQUE INDEX IF NOT EXISTS partner_hotels_hyperguest_unique ON public.partner_hotels (hyperguest_property_id) WHERE hyperguest_property_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS hotel_rooms_hyperguest_unique ON public.hotel_rooms (hotel_id, hyperguest_room_id) WHERE hyperguest_room_id IS NOT NULL;
CREATE TABLE public.hyperguest_sync_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id text NOT NULL, hotel_id uuid REFERENCES public.partner_hotels(id), actor_id uuid NOT NULL, status text NOT NULL, message text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.hyperguest_sync_logs TO authenticated;
GRANT ALL ON public.hyperguest_sync_logs TO service_role;
ALTER TABLE public.hyperguest_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read supplier sync logs" ON public.hyperguest_sync_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));