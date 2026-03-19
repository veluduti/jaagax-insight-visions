
-- Remove temporary testing policies
DROP POLICY "Temp testing: allow all inserts" ON public.partner_hotels;
DROP POLICY "Temp testing: allow all updates" ON public.partner_hotels;
DROP POLICY "Temp testing: allow all deletes" ON public.partner_hotels;

-- Delete the test hotel
DELETE FROM public.partner_hotels WHERE name = 'Test Beach Resort Updated' AND city = 'Goa';
