
ALTER TABLE public.weekend_bookings
  ADD COLUMN IF NOT EXISTS final_payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS final_payment_amount numeric,
  ADD COLUMN IF NOT EXISTS final_payment_reference text,
  ADD COLUMN IF NOT EXISTS final_paid_at timestamptz;

DROP POLICY IF EXISTS "Buyers delete own weekend bookings" ON public.weekend_bookings;
CREATE POLICY "Buyers delete own weekend bookings"
ON public.weekend_bookings FOR DELETE
TO authenticated
USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Admins delete any weekend bookings" ON public.weekend_bookings;
CREATE POLICY "Admins delete any weekend bookings"
ON public.weekend_bookings FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));
