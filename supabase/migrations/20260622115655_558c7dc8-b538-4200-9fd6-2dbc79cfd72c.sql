
-- Add new lifecycle states for visit coordination
ALTER TYPE property_lifecycle_status ADD VALUE IF NOT EXISTS 'visit_confirmed';
ALTER TYPE property_lifecycle_status ADD VALUE IF NOT EXISTS 'visit_reschedule_requested';

-- Add visit scheduling columns on properties (current state)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS visit_scheduled_date date,
  ADD COLUMN IF NOT EXISTS visit_scheduled_time time,
  ADD COLUMN IF NOT EXISTS visit_scheduled_notes text,
  ADD COLUMN IF NOT EXISTS visit_scheduled_by uuid,
  ADD COLUMN IF NOT EXISTS visit_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS visit_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reschedule_reason text,
  ADD COLUMN IF NOT EXISTS reschedule_preferred_date date,
  ADD COLUMN IF NOT EXISTS reschedule_preferred_time time,
  ADD COLUMN IF NOT EXISTS reschedule_requested_at timestamptz;
