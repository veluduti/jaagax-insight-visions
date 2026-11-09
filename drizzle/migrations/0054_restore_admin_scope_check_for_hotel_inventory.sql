CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.admin_scopes WHERE user_id = _user_id AND is_active = true AND role = 'global_admin') $$;
COMMENT ON FUNCTION public.is_admin(uuid) IS 'Checks active global admin scopes; does not depend on the retired user_roles table or editable profile metadata.';
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated, service_role;