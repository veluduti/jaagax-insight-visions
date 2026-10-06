CREATE TABLE public.hospitality_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'support',
  subject text NOT NULL,
  body text,
  booking_id uuid REFERENCES public.hotel_bookings(id) ON DELETE SET NULL,
  hotel_id uuid REFERENCES public.partner_hotels(id) ON DELETE SET NULL,
  opened_by uuid NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid,
  resolution text,
  refund_amount numeric,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.hospitality_tickets TO authenticated;
GRANT ALL ON public.hospitality_tickets TO service_role;
ALTER TABLE public.hospitality_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Openers create tickets" ON public.hospitality_tickets FOR INSERT TO authenticated
  WITH CHECK (opened_by = auth.uid() AND status = 'open' AND assigned_to IS NULL);
CREATE POLICY "Openers view own tickets" ON public.hospitality_tickets FOR SELECT TO authenticated USING (opened_by = auth.uid());
CREATE POLICY "Hotel members view hotel tickets" ON public.hospitality_tickets FOR SELECT TO authenticated
  USING (hotel_id IS NOT NULL AND kind <> 'safety' AND public.is_hotel_member(hotel_id, auth.uid()));
CREATE POLICY "Admins manage tickets" ON public.hospitality_tickets FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER hospitality_tickets_updated BEFORE UPDATE ON public.hospitality_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX hospitality_tickets_status_idx ON public.hospitality_tickets(status, created_at DESC);

CREATE TABLE public.hospitality_ticket_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.hospitality_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_role text NOT NULL DEFAULT 'customer',
  body text NOT NULL,
  internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.hospitality_ticket_updates TO authenticated;
GRANT ALL ON public.hospitality_ticket_updates TO service_role;
ALTER TABLE public.hospitality_ticket_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ticket updates" ON public.hospitality_ticket_updates FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Openers read public updates" ON public.hospitality_ticket_updates FOR SELECT TO authenticated
  USING (NOT internal AND EXISTS (SELECT 1 FROM public.hospitality_tickets t WHERE t.id = ticket_id AND t.opened_by = auth.uid()));
CREATE POLICY "Openers reply" ON public.hospitality_ticket_updates FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND NOT internal AND author_role = 'customer'
    AND EXISTS (SELECT 1 FROM public.hospitality_tickets t WHERE t.id = ticket_id AND t.opened_by = auth.uid()));

-- Tell the person who opened the ticket when JAAGA replies publicly.
CREATE OR REPLACE FUNCTION public.notify_ticket_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record;
BEGIN
  IF NEW.internal OR NEW.author_role = 'customer' THEN RETURN NEW; END IF;
  SELECT * INTO t FROM public.hospitality_tickets WHERE id = NEW.ticket_id;
  IF t.opened_by IS NOT NULL AND t.opened_by <> NEW.author_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, metadata, read, is_read, is_archived)
    VALUES (t.opened_by, 'support', 'JAAGA replied to your request', left(NEW.body, 180), '/my-trips',
            jsonb_build_object('ticket_id', t.id), false, false, false);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_ticket_reply AFTER INSERT ON public.hospitality_ticket_updates
  FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_reply();