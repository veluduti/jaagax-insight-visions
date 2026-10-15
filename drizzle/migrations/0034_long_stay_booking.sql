ALTER TABLE public.hotel_long_stays
  ADD COLUMN IF NOT EXISTS rent_plan text,
  ADD COLUMN IF NOT EXISTS duration integer,
  ADD COLUMN IF NOT EXISTS occupants integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS quote jsonb,
  ADD COLUMN IF NOT EXISTS amount_due numeric,
  ADD COLUMN IF NOT EXISTS advance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS hold_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS special_requests text,
  ADD COLUMN IF NOT EXISTS booking_ref text;

ALTER TABLE public.hotel_availability_blocks
  ADD COLUMN IF NOT EXISTS long_stay_id uuid REFERENCES public.hotel_long_stays(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS hotel_availability_blocks_long_stay_idx ON public.hotel_availability_blocks(long_stay_id);

-- Authoritative long-stay price (mirrors src/lib/longStayPricing.ts).
CREATE OR REPLACE FUNCTION public.long_stay_quote(_room_id uuid, _plan text, _duration integer, _occupants integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r hotel_rooms; a jsonb; wk numeric; mo numeric; per numeric; extras numeric; util numeric;
  mode text; adv numeric; dep numeric; fees numeric; taxp numeric; first numeric; tax numeric; n int; occ int; mult int;
  f numeric;
BEGIN
  SELECT * INTO r FROM hotel_rooms WHERE id = _room_id;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Room not found'; END IF;
  IF _plan NOT IN ('weekly','monthly') THEN RAISE EXCEPTION 'Choose weekly or monthly'; END IF;
  a := COALESCE(r.attributes, '{}'::jsonb);
  wk := GREATEST(COALESCE(r.weekly_price, 0), 0);
  mo := GREATEST(COALESCE(r.monthly_price, 0), 0);
  IF mo = 0 AND wk > 0 THEN mo := round(wk * 52 / 12, 2); END IF;
  per := CASE WHEN _plan = 'monthly' THEN mo ELSE wk END;
  IF per <= 0 THEN RAISE EXCEPTION 'This % plan is not offered', _plan; END IF;
  n := GREATEST(COALESCE(_duration, 1), 1);
  IF _plan = 'monthly' AND n < COALESCE(NULLIF(a->>'min_months','')::numeric, 0) THEN
    RAISE EXCEPTION 'Minimum stay is % months', a->>'min_months';
  END IF;
  IF n > 60 THEN RAISE EXCEPTION 'Duration too long'; END IF;
  -- bed-based rooms are priced per occupant (each takes one bed); private rooms once
  occ := GREATEST(COALESCE(_occupants, 1), 1);
  mult := CASE WHEN r.stay_unit = 'bed' THEN occ ELSE 1 END;
  f := 0;
  util := GREATEST(COALESCE(NULLIF(a->>'utility_charges','')::numeric,0),0) + GREATEST(COALESCE(NULLIF(a->>'food_charges','')::numeric,0),0) + GREATEST(COALESCE(NULLIF(a->>'service_charges','')::numeric,0),0);
  extras := CASE WHEN _plan = 'monthly' THEN util ELSE round(util * 12 / 52, 2) END;
  mode := lower(COALESCE(a->>'advance_mode',''));
  adv := CASE WHEN mode LIKE 'fixed%' THEN GREATEST(COALESCE(NULLIF(a->>'advance_amount','')::numeric,0),0)
              WHEN mode LIKE 'one%' THEN mo WHEN mode LIKE 'two%' THEN mo * 2 ELSE 0 END;
  dep := GREATEST(COALESCE(NULLIF(a->>'security_deposit','')::numeric,0),0);
  fees := GREATEST(COALESCE(NULLIF(a->>'other_fees','')::numeric,0),0);
  taxp := LEAST(GREATEST(COALESCE(NULLIF(a->>'tax_percent','')::numeric,0),0), 28);
  first := round((per + extras) * mult, 2);
  tax := round((first + fees) * taxp / 100, 2);
  adv := round(adv * mult, 2); dep := round(dep * mult, 2);
  RETURN jsonb_build_object('plan', _plan, 'duration', n, 'occupants', occ, 'weekly', wk, 'monthly', mo,
    'period_rent', round(per * mult, 2), 'extras', round(extras * mult, 2), 'one_time_fees', fees, 'tax_percent', taxp, 'tax', tax,
    'advance', adv, 'deposit', dep, 'due_at_booking', round(first + fees + tax + adv + dep, 2),
    'recurring', round(first * (1 + taxp / 100), 2), 'currency', 'INR');
END $$;

CREATE OR REPLACE FUNCTION public.release_expired_long_stay_holds()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  WITH ex AS (
    UPDATE hotel_long_stays SET status = 'expired', payment_status = CASE WHEN payment_status = 'paid' THEN payment_status ELSE 'expired' END
     WHERE status = 'pending_payment' AND payment_status <> 'paid' AND hold_expires_at < now()
    RETURNING id), del AS (DELETE FROM hotel_availability_blocks WHERE long_stay_id IN (SELECT id FROM ex) RETURNING 1)
  SELECT count(*) INTO n FROM ex;
  RETURN n;
END $$;

-- Customer reserves a room/bed for a long stay: locks the room, checks capacity, holds inventory 20 min.
CREATE OR REPLACE FUNCTION public.long_stay_reserve(_room_id uuid, _move_in date, _plan text, _duration integer,
  _occupants integer, _name text, _phone text, _email text, _requests text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); r hotel_rooms; h partner_hotels; q jsonb; mout date; need int; free int; existing hotel_long_stays; sid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
  IF _move_in IS NULL OR _move_in < current_date THEN RAISE EXCEPTION 'Choose a move-in date from today'; END IF;
  IF COALESCE(trim(_name),'') = '' THEN RAISE EXCEPTION 'Tenant name is required'; END IF;
  SELECT * INTO r FROM hotel_rooms WHERE id = _room_id FOR UPDATE;
  IF r.id IS NULL OR r.is_active IS FALSE THEN RAISE EXCEPTION 'This room is not available'; END IF;
  SELECT * INTO h FROM partner_hotels WHERE id = r.hotel_id;
  IF h.id IS NULL OR h.is_active IS NOT TRUE THEN RAISE EXCEPTION 'This property is not open for bookings'; END IF;
  IF NOT (COALESCE(r.accommodation_kind,'') IN ('pg_room','pg_shared','hostel_dorm','hostel_private','coliving_private','coliving_shared')
          OR COALESCE(h.business_types,'{}') && ARRAY['pg','hostel','coliving']) THEN
    RAISE EXCEPTION 'Long stays are not offered for this room';
  END IF;
  PERFORM release_expired_long_stay_holds();
  q := long_stay_quote(_room_id, _plan, _duration, _occupants);
  mout := CASE WHEN _plan = 'monthly' THEN (_move_in + make_interval(months => (q->>'duration')::int))::date
               ELSE _move_in + 7 * (q->>'duration')::int END;
  need := CASE WHEN r.stay_unit = 'bed' THEN (q->>'occupants')::int ELSE 1 END;
  IF r.stay_unit <> 'bed' AND (q->>'occupants')::int > GREATEST(COALESCE(r.max_occupancy,1),1) THEN
    RAISE EXCEPTION 'This room fits up to % people', COALESCE(r.max_occupancy,1);
  END IF;

  -- Idempotent retry: same user, room, dates and plan still on hold
  SELECT * INTO existing FROM hotel_long_stays WHERE user_id = uid AND room_id = _room_id AND move_in = _move_in
    AND move_out = mout AND status = 'pending_payment' AND hold_expires_at > now() LIMIT 1;
  IF existing.id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'stay_id', existing.id, 'quote', existing.quote, 'move_out', mout, 'already', true);
  END IF;

  free := room_free_units(_room_id, _move_in, mout);
  IF free < need THEN
    RETURN jsonb_build_object('ok', false, 'error', CASE WHEN free > 0 THEN format('Only %s bed(s) free for these dates', free) ELSE 'Sorry, nothing is free for these dates' END, 'free', free);
  END IF;
  INSERT INTO hotel_long_stays (hotel_id, room_id, resident_name, resident_phone, resident_email, user_id, move_in, move_out,
    monthly_rent, deposit, advance, status, rent_plan, duration, occupants, quote, amount_due, payment_status, hold_expires_at,
    special_requests, created_by, booking_ref, unit_label)
  VALUES (r.hotel_id, r.id, trim(_name), NULLIF(trim(_phone),''), NULLIF(trim(_email),''), uid, _move_in, mout,
    (q->>'monthly')::numeric * CASE WHEN r.stay_unit='bed' THEN need ELSE 1 END, (q->>'deposit')::numeric, (q->>'advance')::numeric,
    'pending_payment', _plan, (q->>'duration')::int, (q->>'occupants')::int, q, (q->>'due_at_booking')::numeric, 'pending',
    now() + interval '20 minutes', NULLIF(left(trim(COALESCE(_requests,'')), 1000),''), uid,
    'LS-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)), r.room_type)
  RETURNING id INTO sid;
  INSERT INTO hotel_availability_blocks (hotel_id, room_id, start_date, end_date, units, reason, long_stay_id, created_by)
  VALUES (r.hotel_id, r.id, _move_in, mout, need, 'long_stay_hold', sid, uid);
  RETURN jsonb_build_object('ok', true, 'stay_id', sid, 'quote', q, 'move_out', mout);
END $$;

-- Called by the payment function after verified payment (idempotent).
CREATE OR REPLACE FUNCTION public.long_stay_confirm(_stay_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s hotel_long_stays; free int; need int; r hotel_rooms;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO s FROM hotel_long_stays WHERE id = _stay_id FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Stay not found'; END IF;
  IF s.status = 'active' THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;
  IF s.payment_status <> 'paid' THEN RAISE EXCEPTION 'Not paid'; END IF;
  IF NOT EXISTS (SELECT 1 FROM hotel_availability_blocks WHERE long_stay_id = s.id) THEN
    -- hold expired before payment landed: try to re-allocate
    SELECT * INTO r FROM hotel_rooms WHERE id = s.room_id FOR UPDATE;
    need := CASE WHEN r.stay_unit = 'bed' THEN s.occupants ELSE 1 END;
    free := room_free_units(s.room_id, s.move_in, s.move_out);
    IF free < need THEN
      UPDATE hotel_long_stays SET status = 'manual_review', notes = concat_ws(E'\n', notes, 'Paid after hold expired; no space left — refund or reallocate') WHERE id = s.id;
      RETURN jsonb_build_object('ok', false, 'manual_review', true);
    END IF;
    INSERT INTO hotel_availability_blocks (hotel_id, room_id, start_date, end_date, units, reason, long_stay_id)
    VALUES (s.hotel_id, s.room_id, s.move_in, s.move_out, need, 'long_stay', s.id);
  ELSE
    UPDATE hotel_availability_blocks SET reason = 'long_stay' WHERE long_stay_id = s.id;
  END IF;
  UPDATE hotel_long_stays SET status = 'active', hold_expires_at = NULL WHERE id = s.id;
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.long_stay_confirm(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.long_stay_confirm(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.long_stay_reserve(uuid, date, text, integer, integer, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.long_stay_reserve(uuid, date, text, integer, integer, text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.long_stay_quote(uuid, text, integer, integer) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.release_expired_long_stay_holds() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_expired_long_stay_holds() TO authenticated, service_role;