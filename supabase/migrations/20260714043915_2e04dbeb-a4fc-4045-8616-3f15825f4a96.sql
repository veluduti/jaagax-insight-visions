
-- Phase 3: District admins can operate on properties in their district
CREATE OR REPLACE FUNCTION public.is_property_operator(_user_id uuid, _country text, _state text, _district text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_scopes s
    WHERE s.user_id = _user_id
      AND s.is_active = true
      AND s.role = 'district_admin'
      AND _country IS NOT NULL AND _state IS NOT NULL AND _district IS NOT NULL
      AND lower(s.country)  = lower(_country)
      AND lower(s.state)    = lower(_state)
      AND lower(s.district) = lower(_district)
  );
$$;

DROP POLICY IF EXISTS "District admins can operate properties" ON public.properties;
CREATE POLICY "District admins can operate properties"
ON public.properties
FOR UPDATE
TO authenticated
USING (public.is_property_operator(auth.uid(), country, state, district))
WITH CHECK (public.is_property_operator(auth.uid(), country, state, district));
