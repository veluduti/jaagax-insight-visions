
CREATE TABLE public.nl_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES public.nl_farms(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed','confirmed','packed','shipped','delivered','cancelled')),
  subtotal INTEGER NOT NULL DEFAULT 0,
  delivery_fee INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,
  delivery_address TEXT NOT NULL,
  delivery_city TEXT,
  delivery_pincode TEXT,
  contact_phone TEXT,
  notes TEXT,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.nl_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.nl_orders(id) ON DELETE CASCADE,
  crop_id UUID REFERENCES public.nl_crops(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity_kg NUMERIC NOT NULL DEFAULT 1,
  price_per_kg INTEGER NOT NULL DEFAULT 0,
  line_total INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_orders TO authenticated;
GRANT ALL ON public.nl_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_order_items TO authenticated;
GRANT ALL ON public.nl_order_items TO service_role;

ALTER TABLE public.nl_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nl_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage their own orders" ON public.nl_orders FOR ALL
  USING (auth.uid() = customer_user_id) WITH CHECK (auth.uid() = customer_user_id);

CREATE POLICY "Farm owners view orders for their farms" ON public.nl_orders FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.nl_farms f WHERE f.id = nl_orders.farm_id AND f.owner_user_id = auth.uid()));

CREATE POLICY "Farm owners update orders for their farms" ON public.nl_orders FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.nl_farms f WHERE f.id = nl_orders.farm_id AND f.owner_user_id = auth.uid()));

CREATE POLICY "Admins manage all orders" ON public.nl_orders FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "View order items for accessible orders" ON public.nl_order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.nl_orders o
    WHERE o.id = nl_order_items.order_id
      AND (
        o.customer_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.nl_farms f WHERE f.id = o.farm_id AND f.owner_user_id = auth.uid())
        OR public.is_admin(auth.uid())
      )
  ));

CREATE POLICY "Customers insert their own order items" ON public.nl_order_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.nl_orders o WHERE o.id = nl_order_items.order_id AND o.customer_user_id = auth.uid()));

CREATE POLICY "Admins manage all order items" ON public.nl_order_items FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_nl_orders_updated_at BEFORE UPDATE ON public.nl_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_nl_orders_customer ON public.nl_orders(customer_user_id);
CREATE INDEX idx_nl_orders_farm ON public.nl_orders(farm_id);
CREATE INDEX idx_nl_order_items_order ON public.nl_order_items(order_id);
