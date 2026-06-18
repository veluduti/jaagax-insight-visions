
-- Extend hotel_bookings with builder-centric fields
ALTER TABLE public.hotel_bookings
  ADD COLUMN IF NOT EXISTS builder_profile_id uuid REFERENCES public.builder_profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS hotel_name text,
  ADD COLUMN IF NOT EXISTS hotel_address text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS booking_reference text UNIQUE,
  ADD COLUMN IF NOT EXISTS invoice_url text,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

CREATE INDEX IF NOT EXISTS idx_hotel_bookings_builder_profile_id ON public.hotel_bookings(builder_profile_id);

-- RLS: allow builder to manage their own hotel bookings
DROP POLICY IF EXISTS "Builder manages own hotel bookings" ON public.hotel_bookings;
CREATE POLICY "Builder manages own hotel bookings"
ON public.hotel_bookings
FOR ALL
TO authenticated
USING (
  builder_profile_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.builder_profiles bp
    WHERE bp.id = hotel_bookings.builder_profile_id AND bp.user_id = auth.uid()
  )
)
WITH CHECK (
  builder_profile_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.builder_profiles bp
    WHERE bp.id = hotel_bookings.builder_profile_id AND bp.user_id = auth.uid()
  )
);

-- Extend financial_enquiries with builder-centric fields
ALTER TABLE public.financial_enquiries
  ADD COLUMN IF NOT EXISTS builder_profile_id uuid REFERENCES public.builder_profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS enquiry_type text,
  ADD COLUMN IF NOT EXISTS loan_amount numeric,
  ADD COLUMN IF NOT EXISTS loan_tenure_years integer,
  ADD COLUMN IF NOT EXISTS interest_rate_offered numeric,
  ADD COLUMN IF NOT EXISTS monthly_emi numeric,
  ADD COLUMN IF NOT EXISTS advisor_notes text,
  ADD COLUMN IF NOT EXISTS advisor_name text,
  ADD COLUMN IF NOT EXISTS advisor_contact text,
  ADD COLUMN IF NOT EXISTS contact_date timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_date timestamptz;

CREATE INDEX IF NOT EXISTS idx_financial_enquiries_builder_profile_id ON public.financial_enquiries(builder_profile_id);

DROP POLICY IF EXISTS "Builder manages own financial enquiries" ON public.financial_enquiries;
CREATE POLICY "Builder manages own financial enquiries"
ON public.financial_enquiries
FOR ALL
TO authenticated
USING (
  builder_profile_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.builder_profiles bp
    WHERE bp.id = financial_enquiries.builder_profile_id AND bp.user_id = auth.uid()
  )
)
WITH CHECK (
  builder_profile_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.builder_profiles bp
    WHERE bp.id = financial_enquiries.builder_profile_id AND bp.user_id = auth.uid()
  )
);
