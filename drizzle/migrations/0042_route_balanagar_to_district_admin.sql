-- Balanagar: the agent already submitted verification, but the old report
-- function never flagged it for final approval. Route it to the district admin now.
UPDATE public.properties
SET verification_status = 'agent_verified_pending', verified = false
WHERE id = 'c2f7354a-593c-4a33-9c66-309d45f518f4'
  AND lifecycle_status = 'verification_submitted';

INSERT INTO public.notifications (user_id, title, message, type, link)
SELECT public.get_district_admin_for(p.country, p.state, p.district),
       'Verification submitted — final approval',
       'The agent submitted the verification report for "' || COALESCE(p.title,'') || '". Review and give final approval.',
       'alert',
       '/dashboard/admin/district?tab=agent-verified'
FROM public.properties p
WHERE p.id = 'c2f7354a-593c-4a33-9c66-309d45f518f4'
  AND public.get_district_admin_for(p.country, p.state, p.district) IS NOT NULL;