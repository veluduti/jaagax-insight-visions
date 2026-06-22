CREATE OR REPLACE FUNCTION public.is_valid_property_transition(
  _from public.property_lifecycle_status,
  _to public.property_lifecycle_status
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT _from IS NULL
      OR _from = _to
      OR (_from, _to) IN (
        ('draft','submitted'),
        ('draft','cancelled_by_owner'),
        ('submitted','pending_admin_review'),
        ('submitted','cancelled_by_owner'),
        ('pending_admin_review','live'),
        ('pending_admin_review','agent_assigned'),
        ('pending_admin_review','rejected'),
        ('pending_admin_review','cancelled_by_owner'),
        ('agent_assigned','agent_accepted'),
        ('agent_assigned','agent_rejected'),
        ('agent_assigned','cancelled_by_owner'),
        ('agent_rejected','pending_admin_review'),
        ('agent_accepted','visit_scheduled'),
        ('agent_accepted','cancelled_by_owner'),
        ('visit_scheduled','visit_confirmed'),
        ('visit_scheduled','visit_reschedule_requested'),
        ('visit_scheduled','under_verification'),
        ('visit_scheduled','cancelled_by_owner'),
        ('visit_reschedule_requested','visit_scheduled'),
        ('visit_reschedule_requested','visit_confirmed'),
        ('visit_reschedule_requested','cancelled_by_owner'),
        ('visit_confirmed','under_verification'),
        ('visit_confirmed','cancelled_by_owner'),
        ('under_verification','verification_submitted'),
        ('verification_submitted','pending_final_approval'),
        ('pending_final_approval','live_verified'),
        ('pending_final_approval','rejected'),
        ('live','expired'),
        ('live','cancelled_by_owner'),
        ('live_verified','expired'),
        ('live_verified','cancelled_by_owner'),
        ('expired','renewed'),
        ('renewed','live'),
        ('renewed','live_verified'),
        ('renewed','pending_admin_review'),
        ('rejected','pending_admin_review')
      );
$$;