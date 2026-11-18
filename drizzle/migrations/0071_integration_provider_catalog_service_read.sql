DROP POLICY "Signed-in users read integration providers" ON public.integration_provider_catalog;
REVOKE SELECT ON public.integration_provider_catalog FROM anon, authenticated;