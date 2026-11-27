ALTER TABLE public.hotel_staff DROP CONSTRAINT IF EXISTS hotel_staff_role_check;
ALTER TABLE public.hotel_staff ADD CONSTRAINT hotel_staff_role_check CHECK (char_length(role) BETWEEN 2 AND 60);

CREATE TABLE public.hotel_staff_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, key)
);

CREATE TABLE public.hotel_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  user_id uuid,
  employee_code text NOT NULL,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  email text NOT NULL CHECK (char_length(email) <= 255),
  phone text,
  designation text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT 'Front Office',
  joining_date date NOT NULL DEFAULT current_date,
  employment_type text NOT NULL DEFAULT 'full_time' CHECK (employment_type IN ('full_time','part_time','contract','intern','temporary')),
  pay_type text NOT NULL DEFAULT 'monthly' CHECK (pay_type IN ('monthly','weekly','daily','hourly','contract')),
  roles text[] NOT NULL DEFAULT '{}',
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','on_notice','suspended','exited')),
  shift_id uuid,
  probation_end date,
  exit_date date,
  emergency_contact jsonb NOT NULL DEFAULT '{}'::jsonb,
  must_change_password boolean NOT NULL DEFAULT true,
  invited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, employee_code),
  UNIQUE (hotel_id, email)
);
CREATE INDEX hotel_employees_user_idx ON public.hotel_employees (user_id, hotel_id);

CREATE TABLE public.hotel_employee_compensation (
  employee_id uuid PRIMARY KEY REFERENCES public.hotel_employees(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  salary jsonb NOT NULL DEFAULT '{}'::jsonb,
  statutory jsonb NOT NULL DEFAULT '{}'::jsonb,
  bank jsonb NOT NULL DEFAULT '{}'::jsonb,
  bank_verified boolean NOT NULL DEFAULT false,
  revisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hotel_employee_comp_hotel_idx ON public.hotel_employee_compensation (hotel_id);

CREATE TABLE public.hotel_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  grace_minutes int NOT NULL DEFAULT 10 CHECK (grace_minutes BETWEEN 0 AND 120),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hotel_shifts_hotel_idx ON public.hotel_shifts (hotel_id);
ALTER TABLE public.hotel_employees ADD CONSTRAINT hotel_employees_shift_fk FOREIGN KEY (shift_id) REFERENCES public.hotel_shifts(id) ON DELETE SET NULL;
CREATE INDEX hotel_employees_shift_idx ON public.hotel_employees (shift_id);

CREATE TABLE public.hotel_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.hotel_employees(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  status text NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','half_day','paid_leave','unpaid_leave','holiday','weekly_off')),
  check_in timestamptz,
  check_out timestamptz,
  late_minutes int NOT NULL DEFAULT 0,
  overtime_minutes int NOT NULL DEFAULT 0 CHECK (overtime_minutes >= 0),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','self','qr','biometric')),
  approved boolean NOT NULL DEFAULT false,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, work_date)
);
CREATE INDEX hotel_attendance_hotel_idx ON public.hotel_attendance (hotel_id, work_date DESC);

CREATE TABLE public.hotel_leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.hotel_employees(id) ON DELETE CASCADE,
  leave_type text NOT NULL CHECK (leave_type IN ('annual','sick','casual','comp_off','unpaid','other')),
  from_date date NOT NULL,
  to_date date NOT NULL,
  reason text CHECK (char_length(reason) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (to_date >= from_date)
);
CREATE INDEX hotel_leave_hotel_idx ON public.hotel_leave_requests (hotel_id, created_at DESC);
CREATE INDEX hotel_leave_emp_idx ON public.hotel_leave_requests (employee_id);

CREATE TABLE public.hotel_payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'calculated' CHECK (status IN ('calculated','approved','paid','completed','cancelled')),
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);
CREATE INDEX hotel_payroll_runs_hotel_idx ON public.hotel_payroll_runs (hotel_id, period_start DESC);

CREATE TABLE public.hotel_payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.hotel_payroll_runs(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.hotel_employees(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  attendance jsonb NOT NULL DEFAULT '{}'::jsonb,
  gross numeric(12,2) NOT NULL CHECK (gross >= 0),
  deductions numeric(12,2) NOT NULL CHECK (deductions >= 0),
  net numeric(12,2) NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed')),
  payment_method text,
  payment_reference text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX hotel_payslips_no_duplicate ON public.hotel_payslips (employee_id, period_start, period_end) WHERE payment_status <> 'failed' OR payment_status = 'failed';
CREATE INDEX hotel_payslips_run_idx ON public.hotel_payslips (run_id);
CREATE INDEX hotel_payslips_hotel_idx ON public.hotel_payslips (hotel_id);

CREATE TABLE public.hotel_hr_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 150),
  body text NOT NULL CHECK (char_length(body) <= 2000),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hotel_hr_ann_hotel_idx ON public.hotel_hr_announcements (hotel_id, created_at DESC);

-- Helpers
CREATE OR REPLACE FUNCTION public.has_hotel_permission(_hotel uuid, _module text, _action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.user_owns_hotel(_hotel) OR public.is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.hotel_employees e
    WHERE e.hotel_id = _hotel AND e.user_id = auth.uid() AND e.status IN ('active','on_notice')
      AND (COALESCE(e.permissions->_module, '[]'::jsonb) ? _action OR COALESCE(e.permissions->_module, '[]'::jsonb) ? 'manage'))
$$;
CREATE OR REPLACE FUNCTION public.my_employee_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.hotel_employees WHERE user_id = auth.uid() AND status IN ('active','on_notice')
$$;
REVOKE EXECUTE ON FUNCTION public.has_hotel_permission(uuid,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_hotel_permission(uuid,text,text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.my_employee_ids() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_employee_ids() TO authenticated, service_role;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_staff_roles, public.hotel_employees, public.hotel_employee_compensation, public.hotel_shifts, public.hotel_attendance, public.hotel_leave_requests, public.hotel_payroll_runs, public.hotel_payslips, public.hotel_hr_announcements TO authenticated;
GRANT ALL ON public.hotel_staff_roles, public.hotel_employees, public.hotel_employee_compensation, public.hotel_shifts, public.hotel_attendance, public.hotel_leave_requests, public.hotel_payroll_runs, public.hotel_payslips, public.hotel_hr_announcements TO service_role;

ALTER TABLE public.hotel_staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_employee_compensation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_hr_announcements ENABLE ROW LEVEL SECURITY;

-- Roles: staff module
CREATE POLICY "roles read" ON public.hotel_staff_roles FOR SELECT TO authenticated USING ((select public.has_hotel_permission(hotel_id,'staff','view')));
CREATE POLICY "roles insert" ON public.hotel_staff_roles FOR INSERT TO authenticated WITH CHECK ((select public.has_hotel_permission(hotel_id,'staff','create')));
CREATE POLICY "roles update" ON public.hotel_staff_roles FOR UPDATE TO authenticated USING ((select public.has_hotel_permission(hotel_id,'staff','edit'))) WITH CHECK ((select public.has_hotel_permission(hotel_id,'staff','edit')));
CREATE POLICY "roles delete" ON public.hotel_staff_roles FOR DELETE TO authenticated USING ((select public.has_hotel_permission(hotel_id,'staff','delete')));

-- Employees (permission changes only via owner/staff managers)
CREATE POLICY "employees read" ON public.hotel_employees FOR SELECT TO authenticated USING (user_id = (select auth.uid()) OR (select public.has_hotel_permission(hotel_id,'staff','view')));
CREATE POLICY "employees insert" ON public.hotel_employees FOR INSERT TO authenticated WITH CHECK ((select public.has_hotel_permission(hotel_id,'staff','create')));
CREATE POLICY "employees update" ON public.hotel_employees FOR UPDATE TO authenticated USING ((select public.has_hotel_permission(hotel_id,'staff','edit'))) WITH CHECK ((select public.has_hotel_permission(hotel_id,'staff','edit')));
CREATE POLICY "employees delete" ON public.hotel_employees FOR DELETE TO authenticated USING ((select public.has_hotel_permission(hotel_id,'staff','delete')));

CREATE POLICY "comp read" ON public.hotel_employee_compensation FOR SELECT TO authenticated USING (employee_id IN (select public.my_employee_ids()) OR (select public.has_hotel_permission(hotel_id,'payroll','view')));
CREATE POLICY "comp insert" ON public.hotel_employee_compensation FOR INSERT TO authenticated WITH CHECK ((select public.has_hotel_permission(hotel_id,'payroll','edit')));
CREATE POLICY "comp update" ON public.hotel_employee_compensation FOR UPDATE TO authenticated USING ((select public.has_hotel_permission(hotel_id,'payroll','edit'))) WITH CHECK ((select public.has_hotel_permission(hotel_id,'payroll','edit')));
CREATE POLICY "comp delete" ON public.hotel_employee_compensation FOR DELETE TO authenticated USING ((select public.has_hotel_permission(hotel_id,'payroll','delete')));

CREATE POLICY "shifts read" ON public.hotel_shifts FOR SELECT TO authenticated USING ((select public.has_hotel_permission(hotel_id,'attendance','view')) OR hotel_id IN (select hotel_id from public.hotel_employees where id in (select public.my_employee_ids())));
CREATE POLICY "shifts write" ON public.hotel_shifts FOR INSERT TO authenticated WITH CHECK ((select public.has_hotel_permission(hotel_id,'attendance','manage')));
CREATE POLICY "shifts update" ON public.hotel_shifts FOR UPDATE TO authenticated USING ((select public.has_hotel_permission(hotel_id,'attendance','manage'))) WITH CHECK ((select public.has_hotel_permission(hotel_id,'attendance','manage')));
CREATE POLICY "shifts delete" ON public.hotel_shifts FOR DELETE TO authenticated USING ((select public.has_hotel_permission(hotel_id,'attendance','manage')));

-- Attendance: self check-in only through RPC; managers edit
CREATE POLICY "att read" ON public.hotel_attendance FOR SELECT TO authenticated USING (employee_id IN (select public.my_employee_ids()) OR (select public.has_hotel_permission(hotel_id,'attendance','view')));
CREATE POLICY "att insert" ON public.hotel_attendance FOR INSERT TO authenticated WITH CHECK ((select public.has_hotel_permission(hotel_id,'attendance','create')));
CREATE POLICY "att update" ON public.hotel_attendance FOR UPDATE TO authenticated USING ((select public.has_hotel_permission(hotel_id,'attendance','edit'))) WITH CHECK ((select public.has_hotel_permission(hotel_id,'attendance','edit')));
CREATE POLICY "att delete" ON public.hotel_attendance FOR DELETE TO authenticated USING ((select public.has_hotel_permission(hotel_id,'attendance','delete')));

CREATE POLICY "leave read" ON public.hotel_leave_requests FOR SELECT TO authenticated USING (employee_id IN (select public.my_employee_ids()) OR (select public.has_hotel_permission(hotel_id,'leave','view')));
CREATE POLICY "leave insert" ON public.hotel_leave_requests FOR INSERT TO authenticated WITH CHECK (status = 'pending' AND decided_by IS NULL AND (employee_id IN (select public.my_employee_ids()) OR (select public.has_hotel_permission(hotel_id,'leave','create'))) AND EXISTS (select 1 from public.hotel_employees e where e.id = employee_id and e.hotel_id = hotel_leave_requests.hotel_id));
CREATE POLICY "leave update" ON public.hotel_leave_requests FOR UPDATE TO authenticated USING ((select public.has_hotel_permission(hotel_id,'leave','approve'))) WITH CHECK ((select public.has_hotel_permission(hotel_id,'leave','approve')));

CREATE POLICY "runs read" ON public.hotel_payroll_runs FOR SELECT TO authenticated USING ((select public.has_hotel_permission(hotel_id,'payroll','view')));
CREATE POLICY "runs insert" ON public.hotel_payroll_runs FOR INSERT TO authenticated WITH CHECK (status = 'calculated' AND (select public.has_hotel_permission(hotel_id,'payroll','create')));
CREATE POLICY "runs delete" ON public.hotel_payroll_runs FOR DELETE TO authenticated USING (status = 'calculated' AND (select public.has_hotel_permission(hotel_id,'payroll','delete')));

CREATE POLICY "slips read" ON public.hotel_payslips FOR SELECT TO authenticated USING ((select public.has_hotel_permission(hotel_id,'payroll','view')) OR (employee_id IN (select public.my_employee_ids()) AND EXISTS (select 1 from public.hotel_payroll_runs r where r.id = run_id and r.status in ('approved','paid','completed'))));
CREATE POLICY "slips insert" ON public.hotel_payslips FOR INSERT TO authenticated WITH CHECK (payment_status = 'pending' AND (select public.has_hotel_permission(hotel_id,'payroll','create')) AND EXISTS (select 1 from public.hotel_payroll_runs r where r.id = run_id and r.status = 'calculated' and r.hotel_id = hotel_payslips.hotel_id));
CREATE POLICY "slips delete" ON public.hotel_payslips FOR DELETE TO authenticated USING ((select public.has_hotel_permission(hotel_id,'payroll','delete')) AND EXISTS (select 1 from public.hotel_payroll_runs r where r.id = run_id and r.status = 'calculated'));

CREATE POLICY "ann read" ON public.hotel_hr_announcements FOR SELECT TO authenticated USING ((select public.has_hotel_permission(hotel_id,'staff','view')) OR hotel_id IN (select hotel_id from public.hotel_employees where id in (select public.my_employee_ids())));
CREATE POLICY "ann insert" ON public.hotel_hr_announcements FOR INSERT TO authenticated WITH CHECK ((select public.has_hotel_permission(hotel_id,'staff','create')));
CREATE POLICY "ann delete" ON public.hotel_hr_announcements FOR DELETE TO authenticated USING ((select public.has_hotel_permission(hotel_id,'staff','delete')));

-- Employee access sync: operational permissions grant property membership; exit/suspension revokes it
CREATE OR REPLACE FUNCTION public.sync_employee_access() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ops boolean;
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'exited' AND NEW.exit_date IS NULL THEN NEW.exit_date := current_date; END IF;
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  SELECT EXISTS (SELECT 1 FROM jsonb_object_keys(NEW.permissions) k WHERE k NOT IN ('staff','attendance','leave','payroll','self')) INTO ops;
  IF NEW.status IN ('active','on_notice') AND ops THEN
    INSERT INTO public.hotel_staff (hotel_id, user_id, role, invited_email, is_active)
    VALUES (NEW.hotel_id, NEW.user_id, COALESCE(NEW.roles[1], 'staff'), NEW.email, true)
    ON CONFLICT (hotel_id, user_id) DO UPDATE SET is_active = true, role = EXCLUDED.role;
  ELSE
    UPDATE public.hotel_staff SET is_active = false WHERE hotel_id = NEW.hotel_id AND user_id = NEW.user_id AND role <> 'owner';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_hotel_employees_access BEFORE INSERT OR UPDATE ON public.hotel_employees FOR EACH ROW EXECUTE FUNCTION public.sync_employee_access();

-- Public portal lookup (non-sensitive fields only; available before approval, does not publish the property)
CREATE OR REPLACE FUNCTION public.property_portal(_slug text)
RETURNS TABLE(id uuid, name text, city text, locality text, property_reference text, business_types text[], image text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT h.id, h.name, h.city, h.locality, h.property_reference, h.business_types, h.images[1]
  FROM public.partner_hotels h
  WHERE (lower(h.property_reference) = lower(_slug) OR h.id::text = _slug) AND NOT ('demo' = ANY(COALESCE(h.tags,'{}')))
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.property_portal(text) TO anon, authenticated;

-- Self attendance
CREATE OR REPLACE FUNCTION public.staff_attendance_punch(_hotel uuid)
RETURNS public.hotel_attendance LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.hotel_employees; s public.hotel_shifts; a public.hotel_attendance; late int := 0; ot int := 0; worked int;
BEGIN
  SELECT * INTO e FROM public.hotel_employees WHERE hotel_id = _hotel AND user_id = auth.uid() AND status IN ('active','on_notice');
  IF e.id IS NULL THEN RAISE EXCEPTION 'You are not an active employee of this property'; END IF;
  SELECT * INTO a FROM public.hotel_attendance WHERE employee_id = e.id AND work_date = current_date;
  IF e.shift_id IS NOT NULL THEN SELECT * INTO s FROM public.hotel_shifts WHERE id = e.shift_id; END IF;
  IF a.id IS NULL THEN
    IF s.id IS NOT NULL THEN late := GREATEST(0, floor(extract(epoch FROM (localtime - s.start_time)) / 60)::int - s.grace_minutes); END IF;
    INSERT INTO public.hotel_attendance (hotel_id, employee_id, work_date, status, check_in, late_minutes, source)
    VALUES (_hotel, e.id, current_date, 'present', now(), late, 'self') RETURNING * INTO a;
  ELSIF a.check_out IS NULL AND a.check_in IS NOT NULL THEN
    worked := floor(extract(epoch FROM (now() - a.check_in)) / 60)::int;
    IF s.id IS NOT NULL THEN ot := GREATEST(0, worked - (floor(extract(epoch FROM ((s.end_time - s.start_time + interval '24 hours') - (CASE WHEN s.end_time > s.start_time THEN interval '24 hours' ELSE interval '0' END))) / 60)::int)); END IF;
    UPDATE public.hotel_attendance SET check_out = now(), overtime_minutes = ot WHERE id = a.id RETURNING * INTO a;
  ELSE RAISE EXCEPTION 'Attendance for today is already complete';
  END IF;
  RETURN a;
END $$;
REVOKE EXECUTE ON FUNCTION public.staff_attendance_punch(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.staff_attendance_punch(uuid) TO authenticated;

-- First sign-in: employee links/confirms and clears password-change flag
CREATE OR REPLACE FUNCTION public.staff_complete_first_login(_hotel uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.hotel_employees SET must_change_password = false, status = CASE WHEN status = 'invited' THEN 'active' ELSE status END
  WHERE hotel_id = _hotel AND user_id = auth.uid() AND status IN ('invited','active','on_notice');
END $$;
REVOKE EXECUTE ON FUNCTION public.staff_complete_first_login(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.staff_complete_first_login(uuid) TO authenticated;

-- Payroll workflow
CREATE OR REPLACE FUNCTION public.payroll_advance(_run uuid, _status text)
RETURNS public.hotel_payroll_runs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.hotel_payroll_runs; unpaid int;
BEGIN
  SELECT * INTO r FROM public.hotel_payroll_runs WHERE id = _run FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Payroll run not found'; END IF;
  IF NOT public.has_hotel_permission(r.hotel_id, 'payroll', 'approve') THEN RAISE EXCEPTION 'You are not allowed to approve payroll'; END IF;
  IF _status = 'approved' AND r.status = 'calculated' THEN
    UPDATE public.hotel_payroll_runs SET status = 'approved', approved_by = auth.uid(), approved_at = now() WHERE id = _run RETURNING * INTO r;
    INSERT INTO public.notifications (user_id, type, title, message, link)
    SELECT e.user_id, 'payroll', 'Salary approved', 'Your salary for ' || to_char(r.period_start,'Mon YYYY') || ' has been approved.', '/property/' || COALESCE(lower(h.property_reference), h.id::text) || '/staff?tab=payslips'
    FROM public.hotel_payslips p JOIN public.hotel_employees e ON e.id = p.employee_id JOIN public.partner_hotels h ON h.id = r.hotel_id
    WHERE p.run_id = _run AND e.user_id IS NOT NULL;
  ELSIF _status = 'cancelled' AND r.status = 'calculated' THEN
    UPDATE public.hotel_payroll_runs SET status = 'cancelled' WHERE id = _run RETURNING * INTO r;
    DELETE FROM public.hotel_payslips WHERE run_id = _run;
  ELSIF _status = 'completed' AND r.status IN ('approved','paid') THEN
    SELECT count(*) INTO unpaid FROM public.hotel_payslips WHERE run_id = _run AND payment_status <> 'paid';
    IF unpaid > 0 THEN RAISE EXCEPTION '% payslip(s) are not paid yet', unpaid; END IF;
    UPDATE public.hotel_payroll_runs SET status = 'completed', completed_at = now() WHERE id = _run RETURNING * INTO r;
  ELSE RAISE EXCEPTION 'Payroll cannot move from % to %', r.status, _status;
  END IF;
  RETURN r;
END $$;
REVOKE EXECUTE ON FUNCTION public.payroll_advance(uuid,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.payroll_advance(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.payroll_record_payment(_slip uuid, _status text, _method text, _reference text)
RETURNS public.hotel_payslips LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.hotel_payslips; r public.hotel_payroll_runs; uid uuid;
BEGIN
  SELECT * INTO p FROM public.hotel_payslips WHERE id = _slip FOR UPDATE;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Payslip not found'; END IF;
  SELECT * INTO r FROM public.hotel_payroll_runs WHERE id = p.run_id;
  IF NOT public.has_hotel_permission(p.hotel_id, 'payroll', 'approve') THEN RAISE EXCEPTION 'You are not allowed to record salary payments'; END IF;
  IF r.status NOT IN ('approved','paid') THEN RAISE EXCEPTION 'Approve payroll before recording payments'; END IF;
  IF p.payment_status = 'paid' THEN RAISE EXCEPTION 'This salary is already paid'; END IF;
  IF _status NOT IN ('paid','failed') THEN RAISE EXCEPTION 'Invalid payment status'; END IF;
  IF _status = 'paid' AND (coalesce(trim(_reference),'') = '' OR char_length(_reference) > 100) THEN RAISE EXCEPTION 'Enter the bank/UPI payment reference'; END IF;
  UPDATE public.hotel_payslips SET payment_status = _status, payment_method = left(_method, 40), payment_reference = left(_reference, 100), paid_at = CASE WHEN _status = 'paid' THEN now() END WHERE id = _slip RETURNING * INTO p;
  IF _status = 'paid' THEN
    UPDATE public.hotel_payroll_runs SET status = 'paid' WHERE id = r.id AND status = 'approved';
    SELECT user_id INTO uid FROM public.hotel_employees WHERE id = p.employee_id;
    IF uid IS NOT NULL THEN INSERT INTO public.notifications (user_id, type, title, message) VALUES (uid, 'payroll', 'Salary paid', 'Your salary of ₹' || p.net || ' has been paid. Ref: ' || p.payment_reference); END IF;
  END IF;
  RETURN p;
END $$;
REVOKE EXECUTE ON FUNCTION public.payroll_record_payment(uuid,text,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.payroll_record_payment(uuid,text,text,text) TO authenticated;