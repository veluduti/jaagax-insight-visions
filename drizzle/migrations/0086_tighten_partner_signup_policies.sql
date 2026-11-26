DROP POLICY "Anyone can subscribe" ON public.partner_newsletter_subscribers;
CREATE POLICY "Anyone can subscribe with a valid email" ON public.partner_newsletter_subscribers FOR INSERT TO anon, authenticated
WITH CHECK (email = lower(email) AND char_length(email) BETWEEN 5 AND 255 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
DROP POLICY "Anyone can register" ON public.partner_webinar_registrations;
CREATE POLICY "Anyone can register for listed webinars" ON public.partner_webinar_registrations FOR INSERT TO anon, authenticated
WITH CHECK (webinar_key IN ('grow-bookings-2026-11-28','pms-channel-2026-12-05','corporate-longstay-2026-12-12') AND email = lower(email) AND char_length(name) BETWEEN 2 AND 100 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');