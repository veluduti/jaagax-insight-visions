CREATE TABLE public.hotel_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  invoice_no text,
  kind text NOT NULL DEFAULT 'charges' CHECK (kind IN ('rent','booking','charges','deposit')),
  party_name text NOT NULL, party_phone text, party_email text,
  long_stay_id uuid REFERENCES public.hotel_long_stays(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.hotel_bookings(id) ON DELETE SET NULL,
  room_label text, room_type text, period_start date, period_end date,
  lines jsonb NOT NULL DEFAULT '[]', subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount numeric NOT NULL DEFAULT 0 CHECK (discount >= 0), tax numeric NOT NULL DEFAULT 0 CHECK (tax >= 0),
  adjustments numeric NOT NULL DEFAULT 0, total numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0, refunded_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'due' CHECK (status IN ('due','partial','paid','void','refunded')),
  due_date date NOT NULL DEFAULT current_date, notes text,
  created_by uuid DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, invoice_no)
);
CREATE UNIQUE INDEX hotel_invoices_rent_once ON public.hotel_invoices (long_stay_id, period_start) WHERE long_stay_id IS NOT NULL AND kind = 'rent';
CREATE UNIQUE INDEX hotel_invoices_booking_once ON public.hotel_invoices (booking_id) WHERE booking_id IS NOT NULL;
CREATE TABLE public.hotel_invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.hotel_invoices(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'payment' CHECK (kind IN ('payment','refund','adjustment')),
  amount numeric NOT NULL, method text NOT NULL DEFAULT 'cash', reference text, note text,
  idempotency_key text NOT NULL UNIQUE, receipt_no text,
  created_by uuid DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.hotel_invoices TO authenticated;
GRANT SELECT, INSERT ON public.hotel_invoice_payments TO authenticated;
GRANT ALL ON public.hotel_invoices, public.hotel_invoice_payments TO service_role;
ALTER TABLE public.hotel_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_invoice_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read invoices" ON public.hotel_invoices FOR SELECT TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid()));
CREATE POLICY "members add invoices" ON public.hotel_invoices FOR INSERT TO authenticated WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));
CREATE POLICY "members update invoices" ON public.hotel_invoices FOR UPDATE TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));
CREATE POLICY "members read invoice payments" ON public.hotel_invoice_payments FOR SELECT TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid()));
CREATE POLICY "members add invoice payments" ON public.hotel_invoice_payments FOR INSERT TO authenticated WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.hotel_invoice_before() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int; net numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_advisory_xact_lock(hashtext('inv:' || NEW.hotel_id::text));
    SELECT count(*) + 1 INTO n FROM hotel_invoices WHERE hotel_id = NEW.hotel_id;
    NEW.invoice_no := 'INV-' || to_char(now(), 'YYYYMM') || '-' || lpad(n::text, 4, '0');
    NEW.paid_amount := 0; NEW.refunded_amount := 0; NEW.adjustments := 0;
  ELSE
    NEW.invoice_no := OLD.invoice_no; NEW.hotel_id := OLD.hotel_id;
    IF current_setting('app.invoice_sync', true) IS DISTINCT FROM '1' THEN
      NEW.paid_amount := OLD.paid_amount; NEW.refunded_amount := OLD.refunded_amount; NEW.adjustments := OLD.adjustments;
    END IF;
  END IF;
  NEW.total := round(greatest(0, NEW.subtotal - NEW.discount + NEW.tax + NEW.adjustments), 2);
  IF NEW.status <> 'void' THEN
    net := NEW.paid_amount - NEW.refunded_amount;
    NEW.status := CASE WHEN NEW.refunded_amount > 0 AND net <= 0 THEN 'refunded'
      WHEN net >= NEW.total AND NEW.total > 0 THEN 'paid' WHEN net > 0 THEN 'partial' ELSE 'due' END;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER hotel_invoice_before BEFORE INSERT OR UPDATE ON public.hotel_invoices FOR EACH ROW EXECUTE FUNCTION public.hotel_invoice_before();

CREATE OR REPLACE FUNCTION public.hotel_invoice_payment_apply() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv hotel_invoices; n int;
BEGIN
  SELECT * INTO inv FROM hotel_invoices WHERE id = NEW.invoice_id FOR UPDATE;
  IF inv.id IS NULL OR inv.hotel_id <> NEW.hotel_id THEN RAISE EXCEPTION 'Invoice not found for this property'; END IF;
  IF inv.status = 'void' THEN RAISE EXCEPTION 'This invoice is cancelled'; END IF;
  IF NEW.kind IN ('payment','refund') AND NEW.amount <= 0 THEN RAISE EXCEPTION 'Amount must be more than zero'; END IF;
  IF NEW.kind = 'payment' AND NEW.amount > inv.total - (inv.paid_amount - inv.refunded_amount) + 0.009 THEN RAISE EXCEPTION 'Payment is more than the balance due'; END IF;
  IF NEW.kind = 'refund' AND NEW.amount > inv.paid_amount - inv.refunded_amount + 0.009 THEN RAISE EXCEPTION 'Refund is more than the amount paid'; END IF;
  SELECT count(*) + 1 INTO n FROM hotel_invoice_payments WHERE hotel_id = NEW.hotel_id;
  NEW.receipt_no := CASE NEW.kind WHEN 'refund' THEN 'RF-' WHEN 'adjustment' THEN 'ADJ-' ELSE 'RCP-' END || to_char(now(), 'YYYYMM') || '-' || lpad(n::text, 4, '0');
  PERFORM set_config('app.invoice_sync', '1', true);
  UPDATE hotel_invoices SET
    paid_amount = paid_amount + CASE WHEN NEW.kind = 'payment' THEN NEW.amount ELSE 0 END,
    refunded_amount = refunded_amount + CASE WHEN NEW.kind = 'refund' THEN NEW.amount ELSE 0 END,
    adjustments = adjustments + CASE WHEN NEW.kind = 'adjustment' THEN NEW.amount ELSE 0 END
  WHERE id = NEW.invoice_id;
  PERFORM set_config('app.invoice_sync', '0', true);
  RETURN NEW;
END $$;
CREATE TRIGGER hotel_invoice_payment_apply BEFORE INSERT ON public.hotel_invoice_payments FOR EACH ROW EXECUTE FUNCTION public.hotel_invoice_payment_apply();
REVOKE EXECUTE ON FUNCTION public.hotel_invoice_before(), public.hotel_invoice_payment_apply() FROM PUBLIC, anon, authenticated;