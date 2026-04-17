-- Add columns needed for full Add Project flow
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS project_type text DEFAULT 'Apartment',
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS pincode text,
  ADD COLUMN IF NOT EXISTS total_towers integer,
  ADD COLUMN IF NOT EXISTS total_units integer,
  ADD COLUMN IF NOT EXISTS floors_per_tower integer,
  ADD COLUMN IF NOT EXISTS price_per_sqft numeric,
  ADD COLUMN IF NOT EXISTS launch_date date,
  ADD COLUMN IF NOT EXISTS videos text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS master_plan_url text,
  ADD COLUMN IF NOT EXISTS layout_plan_url text,
  ADD COLUMN IF NOT EXISTS brochure_url text,
  ADD COLUMN IF NOT EXISTS rera_document_url text,
  ADD COLUMN IF NOT EXISTS environmental_clearance_url text,
  ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false;

-- Allow builders to insert / update / delete their own projects
DROP POLICY IF EXISTS "Builders can insert own projects" ON public.projects;
CREATE POLICY "Builders can insert own projects"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Builders can update own projects" ON public.projects;
CREATE POLICY "Builders can update own projects"
  ON public.projects FOR UPDATE TO authenticated
  USING (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Builders can delete own projects" ON public.projects;
CREATE POLICY "Builders can delete own projects"
  ON public.projects FOR DELETE TO authenticated
  USING (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Admins can manage all projects" ON public.projects;
CREATE POLICY "Admins can manage all projects"
  ON public.projects FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Storage bucket for project media/documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-media', 'project-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can read project media" ON storage.objects;
CREATE POLICY "Public can read project media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-media');

DROP POLICY IF EXISTS "Authenticated can upload project media" ON storage.objects;
CREATE POLICY "Authenticated can upload project media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-media');

DROP POLICY IF EXISTS "Authenticated can update own project media" ON storage.objects;
CREATE POLICY "Authenticated can update own project media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'project-media' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Authenticated can delete own project media" ON storage.objects;
CREATE POLICY "Authenticated can delete own project media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-media' AND auth.uid()::text = (storage.foldername(name))[1]);