CREATE OR REPLACE FUNCTION public.property_approve_agent_verified(_property_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  p public.properties%ROWTYPE;
  actor uuid := auth.uid();
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO p FROM public.properties WHERE id = _property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF NOT (public.is_global_admin(actor) OR public.is_property_operator(actor, p.country, p.state, p.district)) THEN
    RAISE EXCEPTION 'Only the matching district admin or global admin can approve';
  END IF;
  IF p.verification_status IS DISTINCT FROM 'agent_verified_pending'
     OR p.lifecycle_status NOT IN ('verification_submitted', 'pending_final_approval') THEN
    RAISE EXCEPTION 'Property is not awaiting final approval';
  END IF;
  IF p.lifecycle_status = 'verification_submitted' THEN
    UPDATE public.properties SET lifecycle_status = 'pending_final_approval' WHERE id = p.id;
  END IF;
  UPDATE public.properties SET
    verification_status = 'approved', verified = true, rejection_reason = NULL,
    final_data = COALESCE(p.agent_data, jsonb_build_object(
      'basic_information', jsonb_build_object('title', p.title, 'property_type', p.type),
      'location_details', jsonb_build_object('city', p.city, 'locality', p.locality),
      'price', p.price, 'area_sqft', p.area_sqft, 'description', p.description, 'images', p.images)),
    is_live = true, lifecycle_status = 'live_verified', published_at = now()
  WHERE id = p.id;
  RETURN jsonb_build_object('property_id', p.id, 'lifecycle_status', 'live_verified');
END;
$$;
REVOKE ALL ON FUNCTION public.property_approve_agent_verified(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.property_approve_agent_verified(uuid) TO authenticated, service_role;