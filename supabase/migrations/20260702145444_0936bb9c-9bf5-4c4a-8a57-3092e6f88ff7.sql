
-- Read: any authenticated user (photos are semi-public for booking flows via signed URLs later; simple read grants for now)
CREATE POLICY "auth read hotel-room-photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'hotel-room-photos');

-- Owner writes: path must start with `<hotelId>/` and the caller must own that hotel
CREATE POLICY "owner upload hotel-room-photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'hotel-room-photos'
    AND public.user_owns_hotel( (split_part(name, '/', 1))::uuid )
  );

CREATE POLICY "owner update hotel-room-photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'hotel-room-photos'
    AND public.user_owns_hotel( (split_part(name, '/', 1))::uuid )
  );

CREATE POLICY "owner delete hotel-room-photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'hotel-room-photos'
    AND public.user_owns_hotel( (split_part(name, '/', 1))::uuid )
  );
