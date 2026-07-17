-- Public read access for approved (live) land registrations
GRANT SELECT ON public.nl_land_registrations TO anon;

DROP POLICY IF EXISTS "Public can view approved land registrations" ON public.nl_land_registrations;
CREATE POLICY "Public can view approved land registrations"
ON public.nl_land_registrations FOR SELECT
TO anon, authenticated
USING (status = 'approved' AND COALESCE(is_published, false) = true);