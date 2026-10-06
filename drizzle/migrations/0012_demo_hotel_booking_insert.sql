CREATE POLICY "Managers add sample bookings to their demo property"
ON public.hotel_bookings FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.partner_hotels h WHERE h.id = hotel_bookings.hotel_id AND h.manager_id = auth.uid() AND 'demo' = ANY(h.tags) AND h.is_active = false));