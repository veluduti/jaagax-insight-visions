
-- Temporary testing policy: allow anonymous inserts, updates, deletes on partner_hotels
CREATE POLICY "Temp testing: allow all inserts" ON public.partner_hotels FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Temp testing: allow all updates" ON public.partner_hotels FOR UPDATE TO anon USING (true);
CREATE POLICY "Temp testing: allow all deletes" ON public.partner_hotels FOR DELETE TO anon USING (true);
