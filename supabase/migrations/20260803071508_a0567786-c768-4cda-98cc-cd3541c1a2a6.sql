ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS sold_by_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sold_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS sale_type text,
  ADD COLUMN IF NOT EXISTS sold_price numeric;

CREATE INDEX IF NOT EXISTS idx_properties_sold_by_agent ON public.properties (sold_by_agent_id) WHERE is_sold = true;

CREATE OR REPLACE FUNCTION public.mark_property_sold(_property_id uuid, _sale_type text DEFAULT NULL, _sold_price numeric DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
  v_assigned uuid;
  v_agent uuid;
  v_type text;
BEGIN
  SELECT submitted_by, assigned_agent_id INTO v_owner, v_assigned
  FROM public.properties WHERE id = _property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found'; END IF;

  SELECT id INTO v_agent FROM public.agents WHERE user_id = auth.uid();

  IF v_owner IS DISTINCT FROM auth.uid()
     AND NOT public.is_admin(auth.uid())
     AND (v_agent IS NULL OR v_assigned IS DISTINCT FROM v_agent) THEN
    RAISE EXCEPTION 'Only the listing owner or the assigned agent can mark this as sold';
  END IF;

  v_type := lower(coalesce(_sale_type, 'individual'));
  IF v_type NOT IN ('individual', 'agency') THEN v_type := 'individual'; END IF;

  UPDATE public.properties
    SET is_sold = true,
        sold_at = now(),
        is_live = false,
        sale_type = v_type,
        sold_price = coalesce(_sold_price, sold_price, price),
        sold_by_user_id = auth.uid(),
        sold_by_agent_id = coalesce(CASE WHEN v_assigned = v_agent THEN v_agent ELSE NULL END, v_assigned),
        updated_at = now()
    WHERE id = _property_id;
END $function$;