ALTER TABLE public.hotel_partner_applications
  ADD COLUMN IF NOT EXISTS room_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS check_in_24h boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS front_desk_24h boolean NOT NULL DEFAULT false;