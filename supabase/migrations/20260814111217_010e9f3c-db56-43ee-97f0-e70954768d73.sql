CREATE OR REPLACE FUNCTION public.is_valid_property_transition(_from property_lifecycle_status, _to property_lifecycle_status)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT _from IS NULL
      OR _from = _to
      -- workflow queue/hold/verified stages are managed by SECURITY DEFINER
      -- workflow functions; allow moving into/out of them freely
      OR _to::text ~ '^(country|state|district)_(queue|hold|verified)$'
      OR _from::text ~ '^(country|state|district)_(queue|hold|verified)$'
      OR _to = 'owner_review'
      OR _from = 'owner_review'
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
        ('live','sold'),
        ('live_verified','expired'),
        ('live_verified','cancelled_by_owner'),
        ('live_verified','sold'),
        ('expired','renewed'),
        ('renewed','live'),
        ('renewed','live_verified'),
        ('renewed','pending_admin_review'),
        ('rejected','pending_admin_review')
      );
$$;

-- Re-queue listings that were stuck in 'submitted' because the transition was blocked
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT id FROM public.properties
    WHERE COALESCE(is_draft,false) = false
      AND queue_level IS NULL
      AND lifecycle_status = 'submitted'
  LOOP
    PERFORM public.property_enter_queue(r.id, 'district');
  END LOOP;
END $$;