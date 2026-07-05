
CREATE TABLE public.nl_farm_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.nl_farms(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'manager',
  permissions JSONB NOT NULL DEFAULT '{"tasks":true,"workers":true,"inventory":true}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(farm_id, manager_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_farm_managers TO authenticated;
GRANT ALL ON public.nl_farm_managers TO service_role;
ALTER TABLE public.nl_farm_managers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.nl_can_manage_farm(_farm_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.nl_farms f WHERE f.id = _farm_id AND f.owner_user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.nl_farm_managers m
    WHERE m.farm_id = _farm_id AND m.manager_id = _user_id AND m.is_active = true
  ) OR public.is_admin(_user_id);
$$;

CREATE POLICY "Owners and admins manage farm managers"
ON public.nl_farm_managers FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.nl_farms f WHERE f.id = farm_id AND f.owner_user_id = auth.uid())
  OR manager_id = auth.uid()
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.nl_farms f WHERE f.id = farm_id AND f.owner_user_id = auth.uid())
  OR public.is_admin(auth.uid())
);

CREATE TABLE public.nl_farm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.nl_farms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_farm_tasks TO authenticated;
GRANT ALL ON public.nl_farm_tasks TO service_role;
ALTER TABLE public.nl_farm_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Farm team manages tasks" ON public.nl_farm_tasks FOR ALL TO authenticated
USING (public.nl_can_manage_farm(farm_id, auth.uid()))
WITH CHECK (public.nl_can_manage_farm(farm_id, auth.uid()));

CREATE TABLE public.nl_farm_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.nl_farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'labourer',
  daily_wage NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_on DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_farm_workers TO authenticated;
GRANT ALL ON public.nl_farm_workers TO service_role;
ALTER TABLE public.nl_farm_workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Farm team manages workers" ON public.nl_farm_workers FOR ALL TO authenticated
USING (public.nl_can_manage_farm(farm_id, auth.uid()))
WITH CHECK (public.nl_can_manage_farm(farm_id, auth.uid()));

CREATE TABLE public.nl_worker_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES public.nl_farm_workers(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES public.nl_farms(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'present',
  hours NUMERIC(5,2) NOT NULL DEFAULT 8,
  wage_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(worker_id, attendance_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_worker_attendance TO authenticated;
GRANT ALL ON public.nl_worker_attendance TO service_role;
ALTER TABLE public.nl_worker_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Farm team manages attendance" ON public.nl_worker_attendance FOR ALL TO authenticated
USING (public.nl_can_manage_farm(farm_id, auth.uid()))
WITH CHECK (public.nl_can_manage_farm(farm_id, auth.uid()));

CREATE TABLE public.nl_farm_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.nl_farms(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'seeds',
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  reorder_level NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  supplier TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_farm_inventory TO authenticated;
GRANT ALL ON public.nl_farm_inventory TO service_role;
ALTER TABLE public.nl_farm_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Farm team manages inventory" ON public.nl_farm_inventory FOR ALL TO authenticated
USING (public.nl_can_manage_farm(farm_id, auth.uid()))
WITH CHECK (public.nl_can_manage_farm(farm_id, auth.uid()));

CREATE TABLE public.nl_inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES public.nl_farm_inventory(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES public.nl_farms(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL DEFAULT 'in',
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  reason TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_inventory_movements TO authenticated;
GRANT ALL ON public.nl_inventory_movements TO service_role;
ALTER TABLE public.nl_inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Farm team manages inventory movements" ON public.nl_inventory_movements FOR ALL TO authenticated
USING (public.nl_can_manage_farm(farm_id, auth.uid()))
WITH CHECK (public.nl_can_manage_farm(farm_id, auth.uid()));

CREATE TRIGGER trg_nl_farm_managers_updated BEFORE UPDATE ON public.nl_farm_managers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_nl_farm_tasks_updated BEFORE UPDATE ON public.nl_farm_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_nl_farm_workers_updated BEFORE UPDATE ON public.nl_farm_workers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_nl_worker_attendance_updated BEFORE UPDATE ON public.nl_worker_attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_nl_farm_inventory_updated BEFORE UPDATE ON public.nl_farm_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
