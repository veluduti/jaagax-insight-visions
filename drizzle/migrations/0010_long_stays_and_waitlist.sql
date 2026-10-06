CREATE TABLE public.hotel_long_stays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.hotel_rooms(id) ON DELETE SET NULL,
  unit_label text,
  resident_name text NOT NULL,
  resident_phone text,
  resident_email text,
  user_id uuid,
  move_in date NOT NULL,
  move_out date,
  monthly_rent numeric NOT NULL DEFAULT 0,
  deposit numeric NOT NULL DEFAULT 0,
  rent_due_day int NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_long_stays TO authenticated;
GRANT ALL ON public.hotel_long_stays TO service_role;
ALTER TABLE public.hotel_long_stays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hotel members manage long stays" ON public.hotel_long_stays FOR ALL TO authenticated
  USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));
CREATE POLICY "Residents view own stay" ON public.hotel_long_stays FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER hotel_long_stays_updated BEFORE UPDATE ON public.hotel_long_stays FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.hotel_rent_dues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id uuid NOT NULL REFERENCES public.hotel_long_stays(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'due',
  paid_at timestamptz,
  payment_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stay_id, period_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_rent_dues TO authenticated;
GRANT ALL ON public.hotel_rent_dues TO service_role;
ALTER TABLE public.hotel_rent_dues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hotel members manage rent dues" ON public.hotel_rent_dues FOR ALL TO authenticated
  USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));
CREATE POLICY "Residents view own dues" ON public.hotel_rent_dues FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.hotel_long_stays s WHERE s.id = stay_id AND s.user_id = auth.uid()));

CREATE TABLE public.hotel_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'waiting',
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, room_id, check_in, check_out)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_waitlist TO authenticated;
GRANT ALL ON public.hotel_waitlist TO service_role;
ALTER TABLE public.hotel_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guests manage own waitlist" ON public.hotel_waitlist FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Hotel members view waitlist" ON public.hotel_waitlist FOR SELECT TO authenticated
  USING (public.is_hotel_member(hotel_id, auth.uid()));

-- When a room is freed (cancellation / expired hold / partner unblock), tell people waiting for overlapping dates.
CREATE OR REPLACE FUNCTION public.notify_waitlist_on_release()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  WITH hit AS (
    UPDATE public.hotel_waitlist w SET status = 'notified', notified_at = now()
     WHERE w.status = 'waiting' AND w.hotel_id = OLD.hotel_id
       AND (w.room_id IS NULL OR w.room_id = OLD.room_id)
       AND w.check_in < OLD.end_date AND w.check_out > OLD.start_date
    RETURNING w.user_id, w.hotel_id, w.check_in, w.check_out)
  INSERT INTO public.notifications (user_id, type, title, message, link, metadata, read, is_read, is_archived)
  SELECT h.user_id, 'waitlist', 'A room just opened up',
         'A room you were waiting for (' || h.check_in || ' to ' || h.check_out || ') is available now. Book soon.',
         '/hotels/' || h.hotel_id, jsonb_build_object('hotel_id', h.hotel_id), false, false, false
    FROM hit h;
  RETURN OLD;
END $$;
CREATE TRIGGER trg_notify_waitlist_on_release AFTER DELETE ON public.hotel_availability_blocks
  FOR EACH ROW EXECUTE FUNCTION public.notify_waitlist_on_release();