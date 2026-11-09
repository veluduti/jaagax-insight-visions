-- Run against the connected database after the admin-scope repair.
DO $$
BEGIN
  IF public.is_admin(NULL::uuid) THEN RAISE EXCEPTION 'Anonymous access must not be administrative'; END IF;
  IF public.is_admin('00000000-0000-0000-0000-000000000000'::uuid) THEN RAISE EXCEPTION 'An account without an active global admin scope must not be administrative'; END IF;
  IF pg_get_functiondef('public.is_admin(uuid)'::regprocedure) LIKE '%public.user_roles%' THEN RAISE EXCEPTION 'Admin check must not query retired roles'; END IF;
END $$;