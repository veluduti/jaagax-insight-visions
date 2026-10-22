-- Run with: lovable supabase query "$(printf '\n'; cat src/lib/__tests__/agentFinalApproval.sql)"
-- Read-only regression: final approval must preserve both lifecycle steps.
DO $$
BEGIN
  IF NOT public.is_valid_property_transition('verification_submitted', 'pending_final_approval') THEN
    RAISE EXCEPTION 'TEST FAILED: submitted report cannot enter final approval';
  END IF;
  IF NOT public.is_valid_property_transition('pending_final_approval', 'live_verified') THEN
    RAISE EXCEPTION 'TEST FAILED: final approval cannot publish';
  END IF;
  IF public.is_valid_property_transition('verification_submitted', 'live_verified') THEN
    RAISE EXCEPTION 'TEST FAILED: final approval step can be skipped';
  END IF;
END;
$$;