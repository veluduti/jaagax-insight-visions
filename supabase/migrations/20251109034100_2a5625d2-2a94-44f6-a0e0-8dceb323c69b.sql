-- Add missing columns to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS trust_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS rera_id text,
ADD COLUMN IF NOT EXISTS overview text;