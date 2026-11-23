CREATE TABLE public.hotel_supply_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  name text NOT NULL, phone text, email text, category_keys text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.hotel_supply_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  name text NOT NULL, sku text, category_key text NOT NULL, location text, unit text NOT NULL DEFAULT 'Nos',
  current_stock numeric NOT NULL DEFAULT 0, min_level numeric NOT NULL DEFAULT 0, reorder_level numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0, supplier_id uuid REFERENCES public.hotel_supply_suppliers(id) ON DELETE SET NULL,
  last_purchase_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, sku)
);
CREATE TABLE public.hotel_supply_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.hotel_supply_items(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('inward','outward','adjust')),
  quantity numeric NOT NULL, unit_cost numeric, reference text, note text,
  balance_after numeric, created_by uuid DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.hotel_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.hotel_supply_suppliers(id) ON DELETE SET NULL,
  po_number text NOT NULL, status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','ordered','received','cancelled')),
  lines jsonb NOT NULL DEFAULT '[]', total numeric NOT NULL DEFAULT 0, expected_at date, received_at timestamptz,
  created_by uuid DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_supply_suppliers, public.hotel_supply_items, public.hotel_purchase_orders TO authenticated;
GRANT SELECT, INSERT ON public.hotel_supply_movements TO authenticated;
GRANT ALL ON public.hotel_supply_suppliers, public.hotel_supply_items, public.hotel_supply_movements, public.hotel_purchase_orders TO service_role;
ALTER TABLE public.hotel_supply_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_supply_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_supply_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage suppliers" ON public.hotel_supply_suppliers FOR ALL TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));
CREATE POLICY "members manage supply items" ON public.hotel_supply_items FOR ALL TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));
CREATE POLICY "members read movements" ON public.hotel_supply_movements FOR SELECT TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid()));
CREATE POLICY "members add movements" ON public.hotel_supply_movements FOR INSERT TO authenticated WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));
CREATE POLICY "members manage POs" ON public.hotel_purchase_orders FOR ALL TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));
CREATE INDEX ON public.hotel_supply_items(hotel_id);
CREATE INDEX ON public.hotel_supply_movements(hotel_id, created_at);

-- Movements are the only way stock changes; lock the item row to stay race-safe.
CREATE OR REPLACE FUNCTION public.apply_supply_movement() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur numeric; item_hotel uuid; nxt numeric;
BEGIN
  SELECT current_stock, hotel_id INTO cur, item_hotel FROM hotel_supply_items WHERE id = NEW.item_id FOR UPDATE;
  IF item_hotel IS NULL OR item_hotel <> NEW.hotel_id THEN RAISE EXCEPTION 'Item does not belong to this property'; END IF;
  IF NEW.kind <> 'adjust' AND NEW.quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
  nxt := CASE NEW.kind WHEN 'inward' THEN cur + NEW.quantity WHEN 'outward' THEN cur - NEW.quantity ELSE NEW.quantity END;
  IF nxt < 0 THEN RAISE EXCEPTION 'Not enough stock (available %)', cur; END IF;
  NEW.balance_after := nxt;
  UPDATE hotel_supply_items SET current_stock = nxt, updated_at = now(),
    last_purchase_at = CASE WHEN NEW.kind='inward' THEN now() ELSE last_purchase_at END,
    unit_cost = CASE WHEN NEW.kind='inward' AND NEW.unit_cost IS NOT NULL THEN NEW.unit_cost ELSE unit_cost END
  WHERE id = NEW.item_id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_apply_supply_movement BEFORE INSERT ON public.hotel_supply_movements FOR EACH ROW EXECUTE FUNCTION public.apply_supply_movement();

-- Stock column is not directly editable; only movements change it.
CREATE OR REPLACE FUNCTION public.guard_supply_stock() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN NEW.current_stock := 0; ELSIF NEW.current_stock IS DISTINCT FROM OLD.current_stock AND current_user = 'authenticated' THEN NEW.current_stock := OLD.current_stock; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_guard_supply_stock BEFORE INSERT OR UPDATE ON public.hotel_supply_items FOR EACH ROW EXECUTE FUNCTION public.guard_supply_stock();

-- Goods receipt: atomically receive a PO into stock once.
CREATE OR REPLACE FUNCTION public.receive_purchase_order(_po uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE po record; ln jsonb;
BEGIN
  SELECT * INTO po FROM hotel_purchase_orders WHERE id = _po FOR UPDATE;
  IF po IS NULL OR NOT is_hotel_member(po.hotel_id, auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF po.status IN ('received','cancelled') THEN RAISE EXCEPTION 'Order already %', po.status; END IF;
  FOR ln IN SELECT * FROM jsonb_array_elements(po.lines) LOOP
    INSERT INTO hotel_supply_movements(hotel_id,item_id,kind,quantity,unit_cost,reference)
    VALUES (po.hotel_id,(ln->>'item_id')::uuid,'inward',(ln->>'qty')::numeric,NULLIF(ln->>'unit_cost','')::numeric,po.po_number);
  END LOOP;
  UPDATE hotel_purchase_orders SET status='received', received_at=now() WHERE id=_po;
END $$;
REVOKE ALL ON FUNCTION public.receive_purchase_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.receive_purchase_order(uuid) TO authenticated;