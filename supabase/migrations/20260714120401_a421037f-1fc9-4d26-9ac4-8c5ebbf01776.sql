
CREATE OR REPLACE FUNCTION public.resolve_district_admin_by_id(_district_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM public.admin_scopes
  WHERE role = 'district_admin'
    AND COALESCE(is_active, true) = true
    AND district_id = _district_id
  ORDER BY created_at DESC
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_district_admin_by_id(UUID) TO authenticated, service_role;

-- Enhance text-based resolver: try master ID first
CREATE OR REPLACE FUNCTION public.resolve_district_admin(_country TEXT, _state TEXT, _district TEXT)
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_did UUID;
  v_admin UUID;
BEGIN
  -- Resolve to master ID first
  SELECT r.district_id INTO v_did
    FROM public.resolve_location_ids(_country, _state, _district, NULL, NULL) r;
  IF v_did IS NOT NULL THEN
    v_admin := public.resolve_district_admin_by_id(v_did);
    IF v_admin IS NOT NULL THEN RETURN v_admin; END IF;
  END IF;
  -- Fallback: legacy text match on admin_scopes
  SELECT user_id INTO v_admin FROM public.admin_scopes
   WHERE role = 'district_admin'
     AND COALESCE(is_active, true) = true
     AND lower(country) = lower(_country)
     AND lower(state)   = lower(_state)
     AND lower(district)= lower(_district)
   ORDER BY created_at DESC LIMIT 1;
  RETURN v_admin;
END;
$$;

-- Trigger: prefer master district_id
CREATE OR REPLACE FUNCTION public.assign_property_district_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.district_id IS NOT NULL THEN
    NEW.responsible_district_admin_id := public.resolve_district_admin_by_id(NEW.district_id);
  ELSIF NEW.country IS NOT NULL AND NEW.state IS NOT NULL AND NEW.district IS NOT NULL THEN
    NEW.responsible_district_admin_id := public.resolve_district_admin(NEW.country, NEW.state, NEW.district);
  ELSE
    NEW.responsible_district_admin_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill any rows that now have district_id but missing admin
UPDATE public.properties p
SET responsible_district_admin_id = public.resolve_district_admin_by_id(p.district_id)
WHERE p.district_id IS NOT NULL
  AND (p.responsible_district_admin_id IS NULL);
