CREATE OR REPLACE FUNCTION public.admin_can_view(_country text, _state text, _district text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_scopes s
    WHERE s.user_id = auth.uid()
      AND COALESCE(s.is_active, true) = true
      AND (
        s.role = 'global_admin'
        OR (s.role = 'country_admin'
            AND (_country IS NULL OR lower(s.country) = lower(_country)))
        OR (s.role = 'state_admin'
            AND (_country IS NULL OR lower(s.country) = lower(_country))
            AND (_state IS NULL OR lower(s.state) = lower(_state)))
        OR (s.role = 'district_admin'
            AND (_country IS NULL OR lower(s.country) = lower(_country))
            AND (_state IS NULL OR lower(s.state) = lower(_state))
            AND (_district IS NULL OR lower(s.district) = lower(_district)))
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.admin_can_view_scope(_user_id uuid, _country text, _state text, _district text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_scopes s
    WHERE s.user_id = _user_id
      AND COALESCE(s.is_active, true) = true
      AND (
        s.role = 'global_admin'
        OR (s.role = 'country_admin'
            AND (_country IS NULL OR lower(s.country) = lower(_country)))
        OR (s.role = 'state_admin'
            AND (_country IS NULL OR lower(s.country) = lower(_country))
            AND (_state IS NULL OR lower(s.state) = lower(_state)))
        OR (s.role = 'district_admin'
            AND (_country IS NULL OR lower(s.country) = lower(_country))
            AND (_state IS NULL OR lower(s.state) = lower(_state))
            AND (_district IS NULL OR lower(s.district) = lower(_district)))
      )
  );
$function$;

DROP POLICY IF EXISTS "Sub-admins view scoped properties" ON public.properties;
CREATE POLICY "Sub-admins view scoped properties" ON public.properties
FOR SELECT TO authenticated
USING (public.admin_can_view_scope(auth.uid(), country, state, district));