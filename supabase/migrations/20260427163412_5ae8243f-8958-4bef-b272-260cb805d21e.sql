ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS final_data jsonb,
  ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_properties_is_live ON public.properties(is_live) WHERE is_live = true;