CREATE OR REPLACE FUNCTION public.property_submit_agent_review(_property_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE p public.properties%ROWTYPE; actor uuid := auth.uid(); district_admin uuid;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO p FROM public.properties WHERE id=_property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF NOT public.is_property_agent(p.assigned_agent_id, actor) THEN RAISE EXCEPTION 'You are not the assigned agent'; END IF;
  IF p.lifecycle_status NOT IN ('visit_scheduled','visit_confirmed','under_verification','verification_submitted','pending_final_approval') THEN
    RAISE EXCEPTION 'Confirm the verification visit before submitting your review';
  END IF;
  IF p.lifecycle_status IN ('visit_scheduled','visit_confirmed') THEN
    UPDATE public.properties SET lifecycle_status='under_verification' WHERE id=p.id;
  END IF;
  IF p.lifecycle_status IN ('visit_scheduled','visit_confirmed','under_verification') THEN
    UPDATE public.properties SET lifecycle_status='verification_submitted' WHERE id=p.id;
  END IF;
  UPDATE public.properties SET verification_status='agent_verified_pending', verified=false, is_live=false,
    agent_submitted_at=COALESCE(agent_submitted_at,now()), agent_visit_completed_at=COALESCE(agent_visit_completed_at,now()) WHERE id=p.id;
  district_admin := public.get_district_admin_for(p.country,p.state,p.district);
  IF district_admin IS NOT NULL AND (p.verification_status IS DISTINCT FROM 'agent_verified_pending' OR p.lifecycle_status NOT IN ('verification_submitted','pending_final_approval')) THEN
    INSERT INTO public.notifications(user_id,title,message,type,link) VALUES (district_admin,'Verification submitted — final approval',
      'The agent submitted the verification review for "' || COALESCE(p.title,'') || '". Review and give final approval.',
      'alert','/dashboard/admin/district?tab=agent-verified');
  END IF;
  RETURN jsonb_build_object('property_id',p.id,'verification_status','agent_verified_pending');
END; $$;
REVOKE ALL ON FUNCTION public.property_submit_agent_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.property_submit_agent_review(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.property_approve_agent_verified(_property_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE p public.properties%ROWTYPE; actor uuid := auth.uid();
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO p FROM public.properties WHERE id=_property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF NOT (public.is_global_admin(actor) OR public.is_property_operator(actor,p.country,p.state,p.district)) THEN
    RAISE EXCEPTION 'Only the matching district admin or global admin can approve';
  END IF;
  IF p.lifecycle_status='live_verified' AND p.verification_status='approved' AND p.is_live AND p.verified THEN
    RETURN jsonb_build_object('property_id',p.id,'lifecycle_status','live_verified','already_approved',true);
  END IF;
  IF p.verification_status IS DISTINCT FROM 'agent_verified_pending' OR p.lifecycle_status NOT IN ('verification_submitted','pending_final_approval') THEN
    RAISE EXCEPTION 'Property is not awaiting final approval';
  END IF;
  IF p.lifecycle_status='verification_submitted' THEN
    UPDATE public.properties SET lifecycle_status='pending_final_approval' WHERE id=p.id;
  END IF;
  UPDATE public.properties SET verification_status='approved',verified=true,rejection_reason=NULL,
    final_data=COALESCE(p.agent_data,jsonb_build_object('basic_information',jsonb_build_object('title',p.title,'property_type',p.type),
      'location_details',jsonb_build_object('city',p.city,'locality',p.locality),'price',p.price,'area_sqft',p.area_sqft,'description',p.description,'images',p.images)),
    is_live=true,lifecycle_status='live_verified',published_at=now() WHERE id=p.id;
  RETURN jsonb_build_object('property_id',p.id,'lifecycle_status','live_verified','already_approved',false);
END; $$;
REVOKE ALL ON FUNCTION public.property_approve_agent_verified(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.property_approve_agent_verified(uuid) TO authenticated, service_role;