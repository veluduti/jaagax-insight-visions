ALTER TABLE public.hotel_channel_connections
  ADD COLUMN IF NOT EXISTS connection_kind text NOT NULL DEFAULT 'channel_manager',
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'outbound',
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS credentials_status text NOT NULL DEFAULT 'missing',
  ADD COLUMN IF NOT EXISTS client_id text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_tested_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_test_status text,
  ADD COLUMN IF NOT EXISTS last_test_details jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS hotel_channel_connections_client_id_unique ON public.hotel_channel_connections(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS hotel_channel_connections_review_idx ON public.hotel_channel_connections(review_status, updated_at DESC);

ALTER TABLE public.hotel_room_channel_mappings ADD COLUMN IF NOT EXISTS connection_id uuid REFERENCES public.hotel_channel_connections(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS hotel_room_channel_mappings_connection_idx ON public.hotel_room_channel_mappings(connection_id);
CREATE UNIQUE INDEX IF NOT EXISTS hotel_room_channel_mappings_connection_room_unique ON public.hotel_room_channel_mappings(connection_id, room_id) WHERE connection_id IS NOT NULL;

CREATE TABLE public.integration_provider_catalog (
  key text PRIMARY KEY,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('ota','pms','channel_manager')),
  live_adapter boolean NOT NULL DEFAULT false,
  configuration_enabled boolean NOT NULL DEFAULT true,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.integration_provider_catalog TO authenticated;
GRANT ALL ON public.integration_provider_catalog TO service_role;
ALTER TABLE public.integration_provider_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read integration providers" ON public.integration_provider_catalog FOR SELECT TO authenticated USING (true);

CREATE TABLE public.hotel_rate_channel_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.hotel_channel_connections(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  rate_plan_id uuid NOT NULL REFERENCES public.hotel_rate_plans(id) ON DELETE CASCADE,
  external_rate_plan_id text NOT NULL,
  sync_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(connection_id, rate_plan_id)
);
GRANT SELECT ON public.hotel_rate_channel_mappings TO authenticated;
GRANT ALL ON public.hotel_rate_channel_mappings TO service_role;
ALTER TABLE public.hotel_rate_channel_mappings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.integration_credentials (
  connection_id uuid PRIMARY KEY REFERENCES public.hotel_channel_connections(id) ON DELETE CASCADE,
  ciphertext text NOT NULL,
  iv text NOT NULL,
  key_version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.integration_credentials TO service_role;
ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.integration_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.hotel_channel_connections(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.integration_access_tokens TO service_role;
ALTER TABLE public.integration_access_tokens ENABLE ROW LEVEL SECURITY;
CREATE INDEX integration_access_tokens_lookup_idx ON public.integration_access_tokens(token_hash, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE public.integration_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.hotel_channel_connections(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  kind text NOT NULL,
  direction text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  idempotency_key text,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(connection_id, kind, idempotency_key)
);
GRANT SELECT ON public.integration_sync_jobs TO authenticated;
GRANT ALL ON public.integration_sync_jobs TO service_role;
ALTER TABLE public.integration_sync_jobs ENABLE ROW LEVEL SECURITY;
CREATE INDEX integration_sync_jobs_work_idx ON public.integration_sync_jobs(status, next_attempt_at) WHERE status IN ('pending','retry');

CREATE TABLE public.integration_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.hotel_channel_connections(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  external_event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'received',
  signature_verified boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE(connection_id, external_event_id)
);
GRANT SELECT ON public.integration_webhook_events TO authenticated;
GRANT ALL ON public.integration_webhook_events TO service_role;
ALTER TABLE public.integration_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX integration_webhook_events_work_idx ON public.integration_webhook_events(status, next_attempt_at) WHERE status IN ('received','retry');

CREATE TABLE public.integration_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.hotel_channel_connections(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  response_status integer,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);
GRANT SELECT ON public.integration_webhook_deliveries TO authenticated;
GRANT ALL ON public.integration_webhook_deliveries TO service_role;
ALTER TABLE public.integration_webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE INDEX integration_webhook_deliveries_work_idx ON public.integration_webhook_deliveries(status, next_attempt_at) WHERE status IN ('pending','retry');

CREATE TABLE public.integration_reconciliation_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.hotel_channel_connections(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  issue_type text NOT NULL,
  local_snapshot jsonb,
  remote_snapshot jsonb,
  status text NOT NULL DEFAULT 'open',
  details text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);
GRANT SELECT ON public.integration_reconciliation_issues TO authenticated;
GRANT ALL ON public.integration_reconciliation_issues TO service_role;
ALTER TABLE public.integration_reconciliation_issues ENABLE ROW LEVEL SECURITY;
CREATE INDEX integration_reconciliation_open_idx ON public.integration_reconciliation_issues(connection_id, status, detected_at DESC);

CREATE TABLE public.integration_booking_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.hotel_channel_connections(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.hotel_bookings(id) ON DELETE CASCADE,
  external_booking_id text NOT NULL,
  external_version integer NOT NULL DEFAULT 1,
  raw_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(connection_id, external_booking_id),
  UNIQUE(connection_id, booking_id)
);
GRANT SELECT ON public.integration_booking_links TO authenticated;
GRANT ALL ON public.integration_booking_links TO service_role;
ALTER TABLE public.integration_booking_links ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.integration_connection_access(_connection_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hotel_channel_connections c
    WHERE c.id=_connection_id AND (public.is_hotel_member(c.hotel_id, auth.uid()) OR public.is_admin(auth.uid()))
  )
$$;
GRANT EXECUTE ON FUNCTION public.integration_connection_access(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "channel connections manage" ON public.hotel_channel_connections;
CREATE POLICY "Owners and Global Admins read integration connections" ON public.hotel_channel_connections FOR SELECT TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid()) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Owner manages room channel mappings" ON public.hotel_room_channel_mappings;
CREATE POLICY "Owners and Global Admins read room integration mappings" ON public.hotel_room_channel_mappings FOR SELECT TO authenticated USING (public.user_owns_hotel(hotel_id) OR public.is_hotel_member(hotel_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Owners and Global Admins read rate integration mappings" ON public.hotel_rate_channel_mappings FOR SELECT TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Owners and Global Admins read integration jobs" ON public.integration_sync_jobs FOR SELECT TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Owners and Global Admins read webhook events" ON public.integration_webhook_events FOR SELECT TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Owners and Global Admins read webhook deliveries" ON public.integration_webhook_deliveries FOR SELECT TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Owners and Global Admins read reconciliation issues" ON public.integration_reconciliation_issues FOR SELECT TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Owners and Global Admins read integration reservation links" ON public.integration_booking_links FOR SELECT TO authenticated USING (public.integration_connection_access(connection_id));
GRANT SELECT ON public.hotel_channel_connections, public.hotel_room_channel_mappings TO authenticated;
GRANT ALL ON public.hotel_channel_connections, public.hotel_room_channel_mappings TO service_role;

CREATE OR REPLACE FUNCTION public.integration_create_reservation(_connection_id uuid, _idempotency_key text, _reservation jsonb, _quote jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.hotel_channel_connections; b public.hotel_bookings; hold jsonb; external_id text := _reservation->>'external_booking_id';
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Service authentication required'; END IF;
  SELECT * INTO c FROM public.hotel_channel_connections WHERE id=_connection_id AND is_active=true AND review_status='active' FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Connection is not active'; END IF;
  IF _idempotency_key IS NULL OR length(_idempotency_key)<8 THEN RAISE EXCEPTION 'Idempotency key required'; END IF;
  SELECT * INTO b FROM public.hotel_bookings WHERE idempotency_key=_idempotency_key;
  IF b.id IS NOT NULL THEN RETURN jsonb_build_object('booking_id',b.id,'reference',b.booking_reference,'duplicate',true); END IF;
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
    (_quote->>'grandTotal')::numeric,c.channel,'confirmed','external','external',_reservation->>'special_requests','hotel_only','integration',c.channel,
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

CREATE OR REPLACE FUNCTION public.integration_cancel_reservation(_connection_id uuid, _external_booking_id text, _version integer, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.integration_booking_links; c public.hotel_channel_connections;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Service authentication required'; END IF;
  SELECT * INTO c FROM public.hotel_channel_connections WHERE id=_connection_id AND is_active=true AND review_status='active';
  IF c.id IS NULL THEN RAISE EXCEPTION 'Connection is not active'; END IF;
  SELECT * INTO l FROM public.integration_booking_links WHERE connection_id=_connection_id AND external_booking_id=_external_booking_id FOR UPDATE;
  IF l.id IS NULL THEN RAISE EXCEPTION 'External reservation not found'; END IF;
  IF _version < l.external_version THEN RAISE EXCEPTION 'Stale reservation version'; END IF;
  DELETE FROM public.hotel_availability_blocks WHERE booking_id=l.booking_id;
  UPDATE public.hotel_bookings SET status='cancelled',cancelled_at=now(),cancellation_reason=left(coalesce(_reason,'External cancellation'),500),external_status='cancelled',updated_at=now() WHERE id=l.booking_id;
  UPDATE public.integration_booking_links SET external_version=_version,updated_at=now() WHERE id=l.id;
  RETURN jsonb_build_object('booking_id',l.booking_id,'cancelled',true);
END $$;
REVOKE ALL ON FUNCTION public.integration_cancel_reservation(uuid,text,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.integration_cancel_reservation(uuid,text,integer,text) TO service_role;
