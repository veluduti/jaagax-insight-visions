CREATE TABLE public.hyperguest_quotes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, property_id bigint NOT NULL, snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'));
GRANT SELECT ON public.hyperguest_quotes TO authenticated;
GRANT ALL ON public.hyperguest_quotes TO service_role;
ALTER TABLE public.hyperguest_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers read own supplier quotes" ON public.hyperguest_quotes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX hyperguest_quotes_expiry_idx ON public.hyperguest_quotes(expires_at);
ALTER TABLE public.hyperguest_bookings ADD COLUMN IF NOT EXISTS customer_total numeric, ADD COLUMN IF NOT EXISTS customer_currency text, ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.hyperguest_quotes(id), ADD COLUMN IF NOT EXISTS customer_disclosures jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS hyperguest_booking_quote_once ON public.hyperguest_bookings(quote_id) WHERE quote_id IS NOT NULL;