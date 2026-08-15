ALTER TABLE public.hotel_addons
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS is_taxable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_rate numeric,
  ADD COLUMN IF NOT EXISTS min_quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_quantity integer,
  ADD COLUMN IF NOT EXISTS availability_start time without time zone,
  ADD COLUMN IF NOT EXISTS availability_end time without time zone,
  ADD COLUMN IF NOT EXISTS days_available integer[] NOT NULL DEFAULT '{}';

ALTER TABLE public.hotel_addons DROP CONSTRAINT IF EXISTS hotel_addons_category_check;
ALTER TABLE public.hotel_addons ADD CONSTRAINT hotel_addons_category_check
  CHECK (category = ANY (ARRAY['fnb','breakfast','transport','experience','wellness','entertainment','amenities','other']));

CREATE INDEX IF NOT EXISTS idx_hotel_addons_hotel_active ON public.hotel_addons (hotel_id, is_active, sort_order);

ALTER TABLE public.hotel_booking_addons
  ADD COLUMN IF NOT EXISTS addon_title text,
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.hotel_booking_addons DROP CONSTRAINT IF EXISTS hotel_booking_addons_status_check;
ALTER TABLE public.hotel_booking_addons ADD CONSTRAINT hotel_booking_addons_status_check
  CHECK (status = ANY (ARRAY['pending','requested','confirmed','delivered','completed','cancelled']));

GRANT SELECT ON public.hotel_addons TO anon, authenticated;
GRANT ALL ON public.hotel_addons TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_booking_addons TO authenticated;
GRANT ALL ON public.hotel_booking_addons TO service_role;