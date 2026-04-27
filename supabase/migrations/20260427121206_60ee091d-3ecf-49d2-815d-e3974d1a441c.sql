-- Add columns for agent post-visit verification flow
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS agent_notes TEXT,
  ADD COLUMN IF NOT EXISTS original_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS agent_submitted_at TIMESTAMP WITH TIME ZONE;