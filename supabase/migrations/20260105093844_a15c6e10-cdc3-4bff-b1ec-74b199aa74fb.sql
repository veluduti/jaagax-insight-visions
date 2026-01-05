-- Add phone field to builders so WhatsApp notifications can be delivered
ALTER TABLE public.builders
ADD COLUMN IF NOT EXISTS phone TEXT;