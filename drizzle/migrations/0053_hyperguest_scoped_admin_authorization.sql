CREATE OR REPLACE FUNCTION public.can_manage_hyperguest(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.admin_scopes WHERE user_id = _user_id AND is_active = true AND role = 'global_admin') $$;
REVOKE ALL ON FUNCTION public.can_manage_hyperguest(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_hyperguest(uuid) TO authenticated, service_role;
DROP POLICY "Admins read supplier sync logs" ON public.hyperguest_sync_logs;
CREATE POLICY "Admins read supplier sync logs" ON public.hyperguest_sync_logs FOR SELECT TO authenticated USING (public.can_manage_hyperguest(auth.uid()));