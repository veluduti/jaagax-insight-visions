ALTER TABLE public.partner_hotels
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;