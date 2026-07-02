
ALTER TABLE public.hotel_partner_applications
  ADD COLUMN IF NOT EXISTS pms_setup_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pms_provider TEXT;

CREATE TABLE IF NOT EXISTS public.hotel_pms_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.hotel_partner_applications(id) ON DELETE CASCADE,
  hotel_id UUID,
  pms_provider TEXT NOT NULL,
  connection_mode TEXT NOT NULL DEFAULT 'manual',
  api_endpoint TEXT,
  api_key_masked TEXT,
  property_code TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_interval_minutes INT NOT NULL DEFAULT 15,
  last_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,
  sync_rates BOOLEAN NOT NULL DEFAULT true,
  sync_inventory BOOLEAN NOT NULL DEFAULT true,
  sync_restrictions BOOLEAN NOT NULL DEFAULT false,
  sync_reservations BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_pms_connections TO authenticated;
GRANT ALL ON public.hotel_pms_connections TO service_role;
ALTER TABLE public.hotel_pms_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own pms connections"
  ON public.hotel_pms_connections FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all pms connections"
  ON public.hotel_pms_connections FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.hotel_channel_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.hotel_partner_applications(id) ON DELETE CASCADE,
  pms_connection_id UUID REFERENCES public.hotel_pms_connections(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  external_property_id TEXT,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  commission_percent NUMERIC(5,2),
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_channel_mappings TO authenticated;
GRANT ALL ON public.hotel_channel_mappings TO service_role;
ALTER TABLE public.hotel_channel_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own channel mappings"
  ON public.hotel_channel_mappings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all channel mappings"
  ON public.hotel_channel_mappings FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_pms_conn_updated ON public.hotel_pms_connections;
CREATE TRIGGER trg_pms_conn_updated BEFORE UPDATE ON public.hotel_pms_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_channel_map_updated ON public.hotel_channel_mappings;
CREATE TRIGGER trg_channel_map_updated BEFORE UPDATE ON public.hotel_channel_mappings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
