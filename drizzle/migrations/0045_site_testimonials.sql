CREATE TABLE public.site_testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  rating int not null default 5,
  quote text not null,
  avatar_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT ON public.site_testimonials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_testimonials TO authenticated;
GRANT ALL ON public.site_testimonials TO service_role;
ALTER TABLE public.site_testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active testimonials" ON public.site_testimonials FOR SELECT USING (is_active OR public.is_global_admin(auth.uid()));
CREATE POLICY "Global admins insert testimonials" ON public.site_testimonials FOR INSERT TO authenticated WITH CHECK (public.is_global_admin(auth.uid()));
CREATE POLICY "Global admins update testimonials" ON public.site_testimonials FOR UPDATE TO authenticated USING (public.is_global_admin(auth.uid())) WITH CHECK (public.is_global_admin(auth.uid()));
CREATE POLICY "Global admins delete testimonials" ON public.site_testimonials FOR DELETE TO authenticated USING (public.is_global_admin(auth.uid()));
CREATE OR REPLACE FUNCTION public.validate_site_testimonial() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN RAISE EXCEPTION 'Rating must be 1-5'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER site_testimonials_validate BEFORE INSERT OR UPDATE ON public.site_testimonials FOR EACH ROW EXECUTE FUNCTION public.validate_site_testimonial();