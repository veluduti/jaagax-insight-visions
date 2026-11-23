ALTER TABLE public.hotel_ops_tasks
  ADD COLUMN IF NOT EXISTS ticket_no text,
  ADD COLUMN IF NOT EXISTS category_key text,
  ADD COLUMN IF NOT EXISTS floor text,
  ADD COLUMN IF NOT EXISTS requester_name text,
  ADD COLUMN IF NOT EXISTS requester_type text,
  ADD COLUMN IF NOT EXISTS assignee_name text,
  ADD COLUMN IF NOT EXISTS vendor_id uuid,
  ADD COLUMN IF NOT EXISTS asset_id uuid,
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS is_work_order boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS timeline jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS rating smallint CHECK (rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS estimated_cost numeric;

CREATE TABLE public.hotel_maintenance_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  name text NOT NULL, phone text, email text, category_keys text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.hotel_maintenance_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  name text NOT NULL, category_key text NOT NULL, location text, serial_no text,
  installed_on date, warranty_until date, status text NOT NULL DEFAULT 'working' CHECK (status IN ('working','needs_repair','out_of_service','retired')),
  vendor_id uuid REFERENCES public.hotel_maintenance_vendors(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.hotel_preventive_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  title text NOT NULL, category_key text NOT NULL,
  asset_id uuid REFERENCES public.hotel_maintenance_assets(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES public.hotel_maintenance_vendors(id) ON DELETE SET NULL,
  every_days integer NOT NULL DEFAULT 30 CHECK (every_days > 0),
  next_due date NOT NULL, last_done date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_maintenance_vendors, public.hotel_maintenance_assets, public.hotel_preventive_schedules TO authenticated;
GRANT ALL ON public.hotel_maintenance_vendors, public.hotel_maintenance_assets, public.hotel_preventive_schedules TO service_role;
ALTER TABLE public.hotel_maintenance_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_maintenance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_preventive_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage maint vendors" ON public.hotel_maintenance_vendors FOR ALL TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));
CREATE POLICY "members manage maint assets" ON public.hotel_maintenance_assets FOR ALL TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));
CREATE POLICY "members manage pm schedules" ON public.hotel_preventive_schedules FOR ALL TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid())) WITH CHECK (public.is_hotel_member(hotel_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.set_maintenance_ticket_no() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.kind = 'maintenance' AND NEW.ticket_no IS NULL THEN
    NEW.ticket_no := 'MT-' || (10000 + (SELECT count(*) FROM hotel_ops_tasks WHERE hotel_id = NEW.hotel_id AND kind = 'maintenance') + 1);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_maintenance_ticket_no BEFORE INSERT ON public.hotel_ops_tasks FOR EACH ROW EXECUTE FUNCTION public.set_maintenance_ticket_no();

CREATE POLICY "members read maint files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'maintenance-attachments' AND public.is_hotel_member(((storage.foldername(name))[1])::uuid, auth.uid()));
CREATE POLICY "members upload maint files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'maintenance-attachments' AND public.is_hotel_member(((storage.foldername(name))[1])::uuid, auth.uid()));