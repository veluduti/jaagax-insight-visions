-- Run with: lovable supabase query "$(printf '\n'; cat src/lib/__tests__/agentFinalApproval.sql)"
-- Rollback-only regression: authorized approval follows the strict lifecycle;
-- agent approval is denied. Uses the existing Balanagar test assignment.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a55ca0c1-5dd8-4561-bbb9-b3dbcdb3e7fe', true);
DO $$
BEGIN
  BEGIN
    PERFORM public.property_approve_agent_verified('c2f7354a-593c-4a33-9c66-309d45f518f4');
    RAISE EXCEPTION 'TEST FAILED: agent approved a property';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'Only the matching district admin or global admin can approve' THEN RAISE; END IF;
  END;
END;
$$;
SELECT set_config('request.jwt.claim.sub', '2e18c883-a766-4afd-bd36-791d59d7cd9e', true);
SELECT public.property_approve_agent_verified('c2f7354a-593c-4a33-9c66-309d45f518f4');
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.properties WHERE id = 'c2f7354a-593c-4a33-9c66-309d45f518f4'
    AND lifecycle_status = 'live_verified' AND verification_status = 'approved'
    AND verified AND is_live AND published_at IS NOT NULL AND final_data IS NOT NULL) THEN
    RAISE EXCEPTION 'TEST FAILED: district final approval did not publish';
  END IF;
END;
$$;
ROLLBACK;