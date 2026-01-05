-- Add phone and email fields to agents table for direct contact
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Update agent id=1 with sample contact info for testing
UPDATE public.agents 
SET phone = '9876543210', email = 'rajesh@example.com' 
WHERE id = 1;