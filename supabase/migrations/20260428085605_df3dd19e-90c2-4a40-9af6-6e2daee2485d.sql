-- 1. Add expiry tracking column to properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_properties_expiry_live
  ON public.properties (expiry_date)
  WHERE is_live = true;

CREATE INDEX IF NOT EXISTS idx_properties_status_live
  ON public.properties (verification_status, is_live);

-- 2. Auto-set expiry_date whenever a listing transitions to approved+live
CREATE OR REPLACE FUNCTION public.set_property_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a property becomes live (approved+live), default expiry to +30 days
  -- if the caller didn't already supply one.
  IF NEW.is_live = true
     AND NEW.verification_status = 'approved'
     AND NEW.expiry_date IS NULL
  THEN
    NEW.expiry_date := COALESCE(NEW.published_at, now()) + INTERVAL '30 days';
  END IF;

  -- When a listing flips back to a non-live state (rejected / draft / pending),
  -- clear expiry so the cron can't accidentally re-process it.
  IF NEW.is_live = false
     AND NEW.verification_status IN ('rejected', 'draft', 'pending')
  THEN
    NEW.expiry_date := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_property_expiry ON public.properties;
CREATE TRIGGER trg_set_property_expiry
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.set_property_expiry();

-- 3. Renewal RPC: owner sends listing back to admin approval queue
CREATE OR REPLACE FUNCTION public.renew_property_listing(_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_title text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT submitted_by, title INTO v_owner, v_title
  FROM public.properties
  WHERE id = _property_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  IF v_owner <> auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only the listing owner can renew this property';
  END IF;

  UPDATE public.properties
  SET verification_status = 'pending',
      verified = false,
      is_live = false,
      expiry_date = NULL,
      rejection_reason = NULL,
      updated_at = now()
  WHERE id = _property_id;

  -- Notify admins so they pick up the renewal in the review queue
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id,
    'Renewal request — needs review',
    COALESCE(v_title, 'A property') || ' was resubmitted by its owner for renewal.',
    'alert',
    '/admin'
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
END;
$$;

-- 4. Daily expiry sweep: flips listings to expired + notifies owners
CREATE OR REPLACE FUNCTION public.expire_due_property_listings()
RETURNS TABLE(expired_count integer, warned_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count integer := 0;
  v_warned_count integer := 0;
BEGIN
  -- A) Expire listings whose expiry_date has passed
  WITH due AS (
    UPDATE public.properties
    SET verification_status = 'expired',
        is_live = false,
        verified = false,
        updated_at = now()
    WHERE is_live = true
      AND verification_status = 'approved'
      AND expiry_date IS NOT NULL
      AND expiry_date <= now()
    RETURNING id, title, submitted_by
  ),
  notif_expired AS (
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT submitted_by,
      'Listing expired',
      'Your property "' || COALESCE(title, 'Untitled') || '" has expired and is no longer visible. Renew it from your dashboard.',
      'alert',
      '/dashboard/seller'
    FROM due
    WHERE submitted_by IS NOT NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_expired_count FROM due;

  -- B) Send 7-day warning, only once (deduped via metadata->>'property_id')
  WITH soon AS (
    SELECT p.id, p.title, p.submitted_by, p.expiry_date
    FROM public.properties p
    WHERE p.is_live = true
      AND p.verification_status = 'approved'
      AND p.expiry_date IS NOT NULL
      AND p.expiry_date BETWEEN now() AND now() + INTERVAL '7 days'
      AND p.submitted_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = p.submitted_by
          AND n.type = 'listing_expiry_warning'
          AND n.metadata->>'property_id' = p.id::text
      )
  ),
  warn AS (
    INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
    SELECT submitted_by,
      'Your listing expires soon',
      'Your property "' || COALESCE(title, 'Untitled') || '" expires on ' ||
        to_char(expiry_date, 'DD Mon YYYY') || '. Renew it to keep it visible.',
      'listing_expiry_warning',
      '/dashboard/seller',
      jsonb_build_object('property_id', id, 'expiry_date', expiry_date)
    FROM soon
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_warned_count FROM soon;

  RETURN QUERY SELECT v_expired_count, v_warned_count;
END;
$$;

-- 5. Backfill: stamp expiry on already-live approved listings so the cron has something to work with
UPDATE public.properties
SET expiry_date = COALESCE(published_at, updated_at, now()) + INTERVAL '30 days'
WHERE is_live = true
  AND verification_status = 'approved'
  AND expiry_date IS NULL;