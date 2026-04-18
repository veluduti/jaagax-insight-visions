-- TEMPORARY: open hotel partner applications for public testing
DROP POLICY IF EXISTS "Public can view hotel applications (testing)" ON public.hotel_partner_applications;
CREATE POLICY "Public can view hotel applications (testing)"
ON public.hotel_partner_applications
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public can update hotel applications (testing)" ON public.hotel_partner_applications;
CREATE POLICY "Public can update hotel applications (testing)"
ON public.hotel_partner_applications
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Allow the approval trigger to publish into partner_hotels from anon clients
DROP POLICY IF EXISTS "Public can insert partner hotels (testing)" ON public.partner_hotels;
CREATE POLICY "Public can insert partner hotels (testing)"
ON public.partner_hotels
FOR INSERT
TO anon, authenticated
WITH CHECK (true);