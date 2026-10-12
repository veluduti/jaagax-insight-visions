CREATE TABLE public.hyperguest_cert_checks (
  item_key text PRIMARY KEY,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','passed','failed')),
  notes text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.hyperguest_cert_checks TO authenticated;
GRANT ALL ON public.hyperguest_cert_checks TO service_role;
ALTER TABLE public.hyperguest_cert_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cert checks" ON public.hyperguest_cert_checks
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));