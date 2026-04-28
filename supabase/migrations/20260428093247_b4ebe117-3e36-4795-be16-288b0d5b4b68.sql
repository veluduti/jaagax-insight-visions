-- 1. Properties: featured flag
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz,
  ADD COLUMN IF NOT EXISTS boost_payment_ref text;

CREATE INDEX IF NOT EXISTS idx_properties_featured_live
  ON public.properties (is_featured DESC, published_at DESC)
  WHERE is_live = true;

-- 2. Profiles: banned flag
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_reason text,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz;

-- 3. Reports table
CREATE TABLE IF NOT EXISTS public.property_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  reported_by uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_reports_property ON public.property_reports(property_id);
CREATE INDEX IF NOT EXISTS idx_property_reports_status ON public.property_reports(status);

ALTER TABLE public.property_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can submit reports"
  ON public.property_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users view own reports, admins all"
  ON public.property_reports FOR SELECT TO authenticated
  USING (auth.uid() = reported_by OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage reports"
  ON public.property_reports FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete reports"
  ON public.property_reports FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_property_reports_updated
  BEFORE UPDATE ON public.property_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Mark featured RPC (called after successful payment)
CREATE OR REPLACE FUNCTION public.mark_property_featured(
  _property_id uuid,
  _days integer DEFAULT 30,
  _payment_ref text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
BEGIN
  SELECT submitted_by INTO _owner FROM public.properties WHERE id = _property_id;
  IF _owner IS NULL THEN
    RAISE EXCEPTION 'Property not found';
  END IF;
  IF _owner <> auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  UPDATE public.properties
  SET is_featured = true,
      featured_until = now() + (_days || ' days')::interval,
      boost_payment_ref = COALESCE(_payment_ref, boost_payment_ref),
      updated_at = now()
  WHERE id = _property_id;
END;
$$;

-- 5. Expire boosts sweep
CREATE OR REPLACE FUNCTION public.expire_featured_boosts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  UPDATE public.properties
  SET is_featured = false, updated_at = now()
  WHERE is_featured = true
    AND featured_until IS NOT NULL
    AND featured_until <= now();
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

-- 6. Ban user RPC: takes their live listings offline
CREATE OR REPLACE FUNCTION public.admin_ban_user(_user_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  UPDATE public.profiles
  SET is_banned = true,
      banned_reason = _reason,
      banned_at = now(),
      updated_at = now()
  WHERE user_id = _user_id;

  UPDATE public.properties
  SET is_live = false,
      verification_status = 'blocked',
      rejection_reason = COALESCE(rejection_reason, 'User banned: ' || COALESCE(_reason, '')),
      updated_at = now()
  WHERE submitted_by = _user_id AND is_live = true;
END;
$$;

-- 7. Admin disable single listing
CREATE OR REPLACE FUNCTION public.admin_block_property(_property_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  UPDATE public.properties
  SET is_live = false,
      verification_status = 'blocked',
      rejection_reason = _reason,
      updated_at = now()
  WHERE id = _property_id;
END;
$$;