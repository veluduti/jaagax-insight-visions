-- Phase 10: Price drop approval gating

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS price_drop_status text,
  ADD COLUMN IF NOT EXISTS price_drop_requested_price numeric,
  ADD COLUMN IF NOT EXISTS price_drop_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS price_drop_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS price_drop_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS price_drop_rejection_reason text;

-- Replace drop_property_price: now creates a pending request instead of mutating price
CREATE OR REPLACE FUNCTION public.drop_property_price(_property_id uuid, _new_price numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_owner uuid; v_old numeric; v_title text;
BEGIN
  SELECT submitted_by, price, title INTO v_owner, v_old, v_title
    FROM public.properties WHERE id = _property_id FOR UPDATE;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF v_owner <> auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only the listing owner can drop the price';
  END IF;
  IF _new_price <= 0 OR _new_price >= v_old THEN
    RAISE EXCEPTION 'New price must be lower than current price';
  END IF;

  UPDATE public.properties
    SET price_drop_status = 'pending',
        price_drop_requested_price = _new_price,
        price_drop_requested_at = now(),
        price_drop_rejection_reason = NULL,
        price_drop_reviewed_by = NULL,
        price_drop_reviewed_at = NULL,
        has_price_drop_ribbon = false,
        updated_at = now()
    WHERE id = _property_id;

  -- Notify admins
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id,
    'Price drop awaiting approval',
    'A price drop was requested for ' || COALESCE(v_title, 'a property') ||
      ' (from ₹' || v_old::text || ' to ₹' || _new_price::text || ').',
    'alert', '/admin/price-drops'
  FROM public.user_roles ur WHERE ur.role = 'admin';
END $function$;

-- Approval RPC
CREATE OR REPLACE FUNCTION public.review_price_drop(_property_id uuid, _decision text, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_owner uuid; v_old numeric; v_new numeric; v_status text; v_title text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF _decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid decision'; END IF;

  SELECT submitted_by, price, price_drop_requested_price, price_drop_status, title
    INTO v_owner, v_old, v_new, v_status, v_title
    FROM public.properties WHERE id = _property_id FOR UPDATE;

  IF v_owner IS NULL THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF v_status <> 'pending' OR v_new IS NULL THEN RAISE EXCEPTION 'No pending price drop'; END IF;

  IF _decision = 'approved' THEN
    UPDATE public.properties
      SET previous_price = v_old,
          price = v_new,
          has_price_drop_ribbon = true,
          price_dropped_at = now(),
          price_drop_status = 'approved',
          price_drop_reviewed_by = auth.uid(),
          price_drop_reviewed_at = now(),
          updated_at = now()
      WHERE id = _property_id;

    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (v_owner,
      'Price drop approved ✅',
      'Your price drop for "' || COALESCE(v_title,'your property') ||
        '" is approved and the "Price Reduced" ribbon is now live.',
      'success', '/dashboard/seller');
  ELSE
    UPDATE public.properties
      SET price_drop_status = 'rejected',
          price_drop_rejection_reason = _reason,
          price_drop_reviewed_by = auth.uid(),
          price_drop_reviewed_at = now(),
          has_price_drop_ribbon = false,
          updated_at = now()
      WHERE id = _property_id;

    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (v_owner,
      'Price drop rejected',
      COALESCE('Reason: ' || _reason, 'Your price drop request was rejected.'),
      'alert', '/dashboard/seller');
  END IF;
END $function$;
