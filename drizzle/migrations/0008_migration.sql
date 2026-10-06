CREATE TABLE public.hotel_ops_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'housekeeping',
  title text NOT NULL,
  room_label text,
  booking_id uuid REFERENCES public.hotel_bookings(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  notes text,
  assigned_to uuid,
  created_by uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_ops_tasks TO authenticated;
GRANT ALL ON public.hotel_ops_tasks TO service_role;
ALTER TABLE public.hotel_ops_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hotel members manage ops tasks" ON public.hotel_ops_tasks FOR ALL TO authenticated
  USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));
CREATE INDEX hotel_ops_tasks_hotel_idx ON public.hotel_ops_tasks(hotel_id, status);
CREATE TRIGGER hotel_ops_tasks_updated BEFORE UPDATE ON public.hotel_ops_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();