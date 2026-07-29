
ALTER TABLE public.nl_land_registrations
  ADD COLUMN IF NOT EXISTS profile_created boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_tier text,
  ADD COLUMN IF NOT EXISTS profile_slug text,
  ADD COLUMN IF NOT EXISTS profile_created_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS nl_land_registrations_profile_slug_key
  ON public.nl_land_registrations (profile_slug)
  WHERE profile_slug IS NOT NULL;

-- Public can also view a land through its profile once created and published.
DROP POLICY IF EXISTS "Public can view land profiles" ON public.nl_land_registrations;
CREATE POLICY "Public can view land profiles"
  ON public.nl_land_registrations
  FOR SELECT
  TO anon, authenticated
  USING (profile_created = true AND (is_published = true OR status = 'approved'));
