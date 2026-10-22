CREATE OR REPLACE FUNCTION public.property_agent_submit_report(_property_id uuid, _photos text[] DEFAULT '{}'::text[], _geo_photos jsonb DEFAULT '[]'::jsonb, _video_url text DEFAULT NULL::text, _remarks text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p record;
  uid uuid := auth.uid();
  vid uuid;
  district_admin uuid;
BEGIN
  SELECT * INTO p FROM public.properties WHERE id=_property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF NOT public.is_property_agent(p.assigned_agent_id, uid) THEN RAISE EXCEPTION 'You are not the assigned agent'; END IF;
  IF COALESCE(array_length(_photos,1),0) = 0 THEN RAISE EXCEPTION 'At least one site photo is required'; END IF;

  INSERT INTO public.property_verifications(property_id, agent_id, photos, geo_photos, video_url, remarks, submitted_at)
  VALUES (_property_id, uid, _photos, _geo_photos, _video_url, _remarks, now())
  RETURNING id INTO vid;

  UPDATE public.properties
    SET lifecycle_status='verification_submitted',
        verification_status='agent_verified_pending',
        verified=false,
        agent_submitted_at=now(),
        agent_visit_completed_at=now(),
        agent_notes=COALESCE(_remarks, agent_notes)
  WHERE id=_property_id;

  INSERT INTO public.property_hold_events(property_id, admin_id, level, action, reason, metadata)
    VALUES (_property_id, uid, p.queue_level, 'verification_submitted', _remarks,
            jsonb_build_object('verification_id', vid, 'photo_count', COALESCE(array_length(_photos,1),0)));

  -- Route final approval to the district admin responsible for this property.
  district_admin := public.get_district_admin_for(p.country, p.state, p.district);
  IF district_admin IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (district_admin, 'Verification submitted — final approval',
      'The agent submitted the verification report for "' || COALESCE(p.title,'') || '". Review and give final approval.',
      'alert', '/dashboard/admin/district?tab=agent-verified');
  END IF;

  IF p.hold_admin_id IS NOT NULL AND p.hold_admin_id IS DISTINCT FROM district_admin THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (p.hold_admin_id, 'Verification report submitted',
      'The agent submitted the verification report for "' || COALESCE(p.title,'') || '". Please review.', 'info', '/admin');
  END IF;

  RETURN jsonb_build_object('verification_id', vid, 'district_admin_id', district_admin);
END;
$function$;