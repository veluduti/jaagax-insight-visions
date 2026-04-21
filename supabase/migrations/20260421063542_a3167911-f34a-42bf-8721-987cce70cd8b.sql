
-- Extend weekend_bookings with new flow fields
ALTER TABLE public.weekend_bookings
  ADD COLUMN IF NOT EXISTS admin_qualified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_qualified_by UUID,
  ADD COLUMN IF NOT EXISTS admin_qualification_notes TEXT,
  ADD COLUMN IF NOT EXISTS agent_assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agent_assigned_by UUID,
  ADD COLUMN IF NOT EXISTS agent_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agent_declined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agent_decline_reason TEXT,
  ADD COLUMN IF NOT EXISTS buyer_decision TEXT, -- interested | not_interested | undecided
  ADD COLUMN IF NOT EXISTS buyer_decision_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS buyer_decision_notes TEXT,
  ADD COLUMN IF NOT EXISTS interested_property_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deal_closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deal_property_id UUID,
  ADD COLUMN IF NOT EXISTS deal_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS agent_rating INTEGER CHECK (agent_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS agent_review TEXT,
  ADD COLUMN IF NOT EXISTS agent_rated_at TIMESTAMPTZ;

-- Allow buyers to see bookings even if agent_id IS NULL but they own them (already covered)
-- Allow admins via existing is_admin policy.
-- Add a specific view policy so the assigned agent can see even before accepting (already covered by agent_id).
