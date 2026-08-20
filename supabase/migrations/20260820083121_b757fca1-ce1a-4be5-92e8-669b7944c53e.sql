REVOKE EXECUTE ON FUNCTION public.approve_agent_admin_upgrade(uuid, text, text, text, text, uuid, uuid, uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reject_agent_admin_upgrade(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_hierarchy_admin(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.approve_agent_admin_upgrade(uuid, text, text, text, text, uuid, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_agent_admin_upgrade(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hierarchy_admin(uuid) TO authenticated;