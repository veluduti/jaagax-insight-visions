CREATE OR REPLACE FUNCTION public.expire_due_property_listings()
 RETURNS TABLE(expired_count integer, warned_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_expired_count integer := 0;
  v_warned_count integer := 0;
BEGIN
  -- A) Expire listings whose expiry_date has passed: move lifecycle_status to 'expired'
  WITH due AS (
    UPDATE public.properties
    SET lifecycle_status = 'expired',
        verification_status = 'expired',
        is_live = false,
        verified = false,
        updated_at = now()
    WHERE lifecycle_status IN ('live','live_verified')
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
    WHERE p.lifecycle_status IN ('live','live_verified')
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
$function$;