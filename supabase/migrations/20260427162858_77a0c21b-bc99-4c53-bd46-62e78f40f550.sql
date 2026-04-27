ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS agent_data jsonb,
ADD COLUMN IF NOT EXISTS field_verification jsonb;