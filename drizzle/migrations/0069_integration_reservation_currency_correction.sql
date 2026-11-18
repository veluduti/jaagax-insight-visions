CREATE OR REPLACE FUNCTION public.integration_create_reservation(_connection_id uuid, _idempotency_key text, _reservation jsonb, _quote jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.hotel_channel_connections; b public.hotel_bookings; hold jsonb; external_id text := _reservation->>'external_booking_id';
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Service authentication required'; END IF;
  SELECT * INTO c FROM public.hotel_channel_connections WHERE id=_connection_id AND is_active=true AND review_status='active' FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Connection is not active'; END IF;
  IF _idempotency_key IS NULL OR length(_idempotency_key)<8 THEN RAISE EXCEPTION 'Idempotency key required'; END IF;
  SELECT * INTO b FROM public.hotel_bookings WHERE idempotency_key=_idempotency_key;
  IF b.id IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM public.integration_booking_links WHERE connection_id=_connection_id AND booking_id=b.id) THEN RAISE EXCEPTION 'Idempotency key belongs to another connection'; END IF;
    RETURN jsonb_build_object('booking_id',b.id,'reference',b.booking_reference,'duplicate',true);
  END IF;
  IF external_id IS NULL OR length(external_id)<1 THEN RAISE EXCEPTION 'External booking ID required'; END IF;
  IF EXISTS(SELECT 1 FROM public.integration_booking_links WHERE connection_id=_connection_id AND external_booking_id=external_id) THEN RAISE EXCEPTION 'External booking ID already exists'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.hotel_room_channel_mappings WHERE connection_id=_connection_id AND room_id=(_reservation->>'room_id')::uuid AND sync_enabled=true) THEN RAISE EXCEPTION 'Room is not mapped for this connection'; END IF;
  IF _reservation->>'rate_plan_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.hotel_rate_channel_mappings WHERE connection_id=_connection_id AND rate_plan_id=(_reservation->>'rate_plan_id')::uuid AND room_id=(_reservation->>'room_id')::uuid AND sync_enabled=true) THEN RAISE EXCEPTION 'Rate plan is not mapped for this connection'; END IF;
  INSERT INTO public.hotel_bookings(
    hotel_id,room_id,rate_plan_id,user_id,guest_name,guest_email,guest_phone,check_in,check_out,room_type,
    num_guests,adults,children,child_ages,num_rooms,total_amount,currency,status,payment_status,payment_method,
    special_requests,booking_type,source,channel,external_booking_id,external_reference,idempotency_key,lead_guest,
    price_snapshot,cancellation_policy_snapshot,room_charges,taxable_subtotal,tax_amount,hotel_name,hotel_address
  ) SELECT
    c.hotel_id,(_reservation->>'room_id')::uuid,nullif(_reservation->>'rate_plan_id','')::uuid,null,
    _reservation->>'guest_name',_reservation->>'guest_email',_reservation->>'guest_phone',(_reservation->>'check_in')::date,(_reservation->>'check_out')::date,_reservation->>'room_type',
    (_reservation->>'adults')::integer+coalesce((_reservation->>'children')::integer,0),(_reservation->>'adults')::integer,coalesce((_reservation->>'children')::integer,0),coalesce(_reservation->'child_ages','[]'::jsonb),coalesce((_reservation->>'num_rooms')::integer,1),
    (_quote->>'grandTotal')::numeric,coalesce(nullif(_reservation->>'currency',''),h.default_currency,'INR'),'confirmed','external','external',_reservation->>'special_requests','hotel_only','integration',c.channel,
    external_id,_reservation->>'external_reference',_idempotency_key,_reservation->'lead_guest',_quote,_reservation->'cancellation_policy_snapshot',
    (_quote->>'roomCharges')::numeric,(_quote->>'taxableSubtotal')::numeric,(_quote->>'taxAmount')::numeric,h.name,concat_ws(', ',h.address,h.locality,h.city)
  FROM public.partner_hotels h WHERE h.id=c.hotel_id RETURNING * INTO b;
  hold := public.reserve_inventory(b.id);
  IF coalesce((hold->>'ok')::boolean,false)<>true THEN RAISE EXCEPTION '%',coalesce(hold->>'error','Inventory unavailable'); END IF;
  INSERT INTO public.integration_booking_links(connection_id,booking_id,external_booking_id,external_version,raw_snapshot) VALUES(_connection_id,b.id,external_id,coalesce((_reservation->>'external_version')::integer,1),_reservation);
  RETURN jsonb_build_object('booking_id',b.id,'reference',b.booking_reference,'duplicate',false);
END $$;
REVOKE ALL ON FUNCTION public.integration_create_reservation(uuid,text,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.integration_create_reservation(uuid,text,jsonb,jsonb) TO service_role;