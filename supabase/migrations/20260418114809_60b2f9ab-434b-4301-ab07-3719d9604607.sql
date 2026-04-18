-- Public RPC to fetch application status by ID (no PII leak beyond status fields)
CREATE OR REPLACE FUNCTION public.get_hotel_application_status(_id uuid)
RETURNS TABLE (
  id uuid,
  hotel_name text,
  city text,
  locality text,
  status text,
  rejection_reason text,
  approved_hotel_id uuid,
  created_at timestamptz,
  reviewed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, hotel_name, city, locality, status, rejection_reason, approved_hotel_id, created_at, reviewed_at
  FROM public.hotel_partner_applications
  WHERE id = _id;
$$;

GRANT EXECUTE ON FUNCTION public.get_hotel_application_status(uuid) TO anon, authenticated;

-- Ensure admin SELECT works even when user_id is null (anonymous submissions)
DROP POLICY IF EXISTS "Users can view own applications" ON public.hotel_partner_applications;
CREATE POLICY "Users and admins can view applications"
ON public.hotel_partner_applications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));