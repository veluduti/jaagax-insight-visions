CREATE TABLE public.integration_api_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.hotel_channel_connections(id) ON DELETE CASCADE,
  client_id text NOT NULL UNIQUE,
  secret_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz,
  revoked_at timestamptz
);
GRANT ALL ON public.integration_api_clients TO service_role;
ALTER TABLE public.integration_api_clients ENABLE ROW LEVEL SECURITY;
CREATE INDEX integration_api_clients_lookup_idx ON public.integration_api_clients(client_id) WHERE is_active=true AND revoked_at IS NULL;

CREATE OR REPLACE FUNCTION public.integration_modify_reservation(_connection_id uuid, _external_booking_id text, _version integer, _reservation jsonb, _quote jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.integration_booking_links; c public.hotel_channel_connections; b public.hotel_bookings; hold jsonb;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Service authentication required'; END IF;
  SELECT * INTO c FROM public.hotel_channel_connections WHERE id=_connection_id AND is_active=true AND review_status='active';
  IF c.id IS NULL THEN RAISE EXCEPTION 'Connection is not active'; END IF;
  SELECT * INTO l FROM public.integration_booking_links WHERE connection_id=_connection_id AND external_booking_id=_external_booking_id FOR UPDATE;
  IF l.id IS NULL THEN RAISE EXCEPTION 'External reservation not found'; END IF;
  IF _version <= l.external_version THEN
    IF _version=l.external_version THEN RETURN jsonb_build_object('booking_id',l.booking_id,'duplicate',true); END IF;
    RAISE EXCEPTION 'Stale reservation version';
  END IF;
  SELECT * INTO b FROM public.hotel_bookings WHERE id=l.booking_id FOR UPDATE;
  IF b.status='cancelled' THEN RAISE EXCEPTION 'Cancelled reservations cannot be modified'; END IF;
  IF (_reservation->>'room_id')::uuid IS DISTINCT FROM b.room_id THEN RAISE EXCEPTION 'Room changes require cancellation and a new reservation'; END IF;
  DELETE FROM public.hotel_availability_blocks WHERE booking_id=b.id;
  UPDATE public.hotel_bookings SET check_in=(_reservation->>'check_in')::date,check_out=(_reservation->>'check_out')::date,
    adults=(_reservation->>'adults')::integer,children=coalesce((_reservation->>'children')::integer,0),
    child_ages=coalesce(_reservation->'child_ages','[]'::jsonb),num_guests=(_reservation->>'adults')::integer+coalesce((_reservation->>'children')::integer,0),
    num_rooms=coalesce((_reservation->>'num_rooms')::integer,1),special_requests=_reservation->>'special_requests',
    total_amount=(_quote->>'grandTotal')::numeric,room_charges=(_quote->>'roomCharges')::numeric,
    taxable_subtotal=(_quote->>'taxableSubtotal')::numeric,tax_amount=(_quote->>'taxAmount')::numeric,
    price_snapshot=_quote,external_status='modified',updated_at=now() WHERE id=b.id;
  hold:=public.reserve_inventory(b.id);
  IF coalesce((hold->>'ok')::boolean,false)<>true THEN RAISE EXCEPTION '%',coalesce(hold->>'error','Inventory unavailable'); END IF;
  UPDATE public.integration_booking_links SET external_version=_version,raw_snapshot=_reservation,updated_at=now() WHERE id=l.id;
  RETURN jsonb_build_object('booking_id',b.id,'reference',b.booking_reference,'modified',true);
END $$;
REVOKE ALL ON FUNCTION public.integration_modify_reservation(uuid,text,integer,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.integration_modify_reservation(uuid,text,integer,jsonb,jsonb) TO service_role;

COMMENT ON COLUMN public.hotel_pms_connections.api_key_masked IS 'DEPRECATED: legacy onboarding retained only for migration history; use server-encrypted integration_credentials.';
COMMENT ON COLUMN public.hotel_pms_connections.sync_status IS 'DEPRECATED: legacy onboarding status; use hotel_channel_connections review and health fields.';