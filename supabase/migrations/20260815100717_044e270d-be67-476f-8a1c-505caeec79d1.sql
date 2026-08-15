CREATE OR REPLACE FUNCTION public.property_admin_update_fields(
  _property_id uuid,
  _patch jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p public.properties%ROWTYPE;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _p FROM public.properties WHERE id = _property_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  IF NOT (
    _p.hold_admin_id = _uid
    OR public.is_admin(_uid)
    OR public.is_property_operator(_uid, _p.country, _p.state, _p.district)
  ) THEN
    RAISE EXCEPTION 'You must hold this property to edit it';
  END IF;

  UPDATE public.properties SET
    title        = COALESCE(NULLIF(_patch->>'title', ''), title),
    description  = COALESCE(NULLIF(_patch->>'description', ''), description),
    price        = COALESCE(NULLIF(_patch->>'price', '')::numeric, price),
    area_sqft    = COALESCE(NULLIF(_patch->>'area_sqft', '')::numeric, area_sqft),
    bedrooms     = COALESCE(NULLIF(_patch->>'bedrooms', '')::int, bedrooms),
    bathrooms    = COALESCE(NULLIF(_patch->>'bathrooms', '')::int, bathrooms),
    bhk          = COALESCE(NULLIF(_patch->>'bhk', '')::int, bhk),
    furnishing   = COALESCE(NULLIF(_patch->>'furnishing', ''), furnishing),
    address      = COALESCE(NULLIF(_patch->>'address', ''), address),
    locality     = COALESCE(NULLIF(_patch->>'locality', ''), locality),
    city         = COALESCE(NULLIF(_patch->>'city', ''), city),
    district     = COALESCE(NULLIF(_patch->>'district', ''), district),
    state        = COALESCE(NULLIF(_patch->>'state', ''), state),
    latitude     = COALESCE(NULLIF(_patch->>'latitude', '')::numeric, latitude),
    longitude    = COALESCE(NULLIF(_patch->>'longitude', '')::numeric, longitude),
    images       = CASE WHEN _patch ? 'images' AND jsonb_array_length(COALESCE(_patch->'images','[]'::jsonb)) > 0
                        THEN ARRAY(SELECT jsonb_array_elements_text(_patch->'images'))
                        ELSE images END,
    amenities    = CASE WHEN _patch ? 'amenities' AND jsonb_array_length(COALESCE(_patch->'amenities','[]'::jsonb)) > 0
                        THEN ARRAY(SELECT jsonb_array_elements_text(_patch->'amenities'))
                        ELSE amenities END,
    updated_at   = now()
  WHERE id = _property_id;

  INSERT INTO public.property_events (property_id, event_type, actor_id, payload)
  VALUES (_property_id, 'admin_edited', _uid, jsonb_build_object('patch', _patch))
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'property_id', _property_id);
EXCEPTION WHEN undefined_table OR undefined_column THEN
  RETURN jsonb_build_object('ok', true, 'property_id', _property_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.property_admin_update_fields(uuid, jsonb) TO authenticated;