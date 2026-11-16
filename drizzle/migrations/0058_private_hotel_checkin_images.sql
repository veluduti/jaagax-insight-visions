CREATE POLICY "Booking participants read checkin images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'hotel-checkin-documents' AND EXISTS (SELECT 1 FROM public.hotel_bookings b WHERE b.id::text = split_part(name, '/', 1) AND (b.user_id = auth.uid() OR public.is_hotel_member(b.hotel_id, auth.uid()))));
CREATE OR REPLACE FUNCTION public.save_hotel_checkin_image(p_booking_id uuid, p_info jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hotel_id uuid;
BEGIN
 SELECT hotel_id INTO v_hotel_id FROM hotel_bookings WHERE id = p_booking_id AND status IN ('confirmed','checked_in') FOR UPDATE;
 IF v_hotel_id IS NULL THEN RAISE EXCEPTION 'Booking is not eligible for check-in'; END IF;
 UPDATE hotel_bookings SET checkin_info = p_info WHERE id = p_booking_id;
 INSERT INTO guest_portal_requests(booking_id,hotel_id,request_type,payload) VALUES(p_booking_id,v_hotel_id,'checkin',p_info);
END; $$;
REVOKE ALL ON FUNCTION public.save_hotel_checkin_image(uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_hotel_checkin_image(uuid,jsonb) TO service_role;