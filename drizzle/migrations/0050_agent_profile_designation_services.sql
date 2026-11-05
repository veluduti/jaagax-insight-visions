ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS services_offered text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS property_types_handled text[] NOT NULL DEFAULT '{}';