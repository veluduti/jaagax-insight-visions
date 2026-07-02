
-- Extend hotel_rooms with rich attributes
ALTER TABLE public.hotel_rooms
  ADD COLUMN IF NOT EXISTS bed_type text,
  ADD COLUMN IF NOT EXISTS size_sqft integer,
  ADD COLUMN IF NOT EXISTS view_type text,
  ADD COLUMN IF NOT EXISTS smoking_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS breakfast_included boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS extra_bed_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS extra_bed_price numeric,
  ADD COLUMN IF NOT EXISTS cancellation_policy text,
  ADD COLUMN IF NOT EXISTS min_nights integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pms_room_code text,
  ADD COLUMN IF NOT EXISTS pms_room_id text;

-- Per-room channel mappings
CREATE TABLE IF NOT EXISTS public.hotel_room_channel_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  channel text NOT NULL,
  external_room_id text,
  external_rate_plan_id text,
  sync_enabled boolean NOT NULL DEFAULT true,
  commission_percent numeric(5,2),
  notes text,
  last_sync_at timestamptz,
  last_sync_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, channel)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_room_channel_mappings TO authenticated;
GRANT ALL ON public.hotel_room_channel_mappings TO service_role;

ALTER TABLE public.hotel_room_channel_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages room channel mappings"
  ON public.hotel_room_channel_mappings
  FOR ALL
  USING (public.user_owns_hotel(hotel_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.user_owns_hotel(hotel_id) OR public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_room_channel_map_room ON public.hotel_room_channel_mappings(room_id);
CREATE INDEX IF NOT EXISTS idx_room_channel_map_hotel ON public.hotel_room_channel_mappings(hotel_id);

CREATE TRIGGER trg_room_channel_map_updated
  BEFORE UPDATE ON public.hotel_room_channel_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
