-- Allow seeding without auth for users table
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Make owner_id nullable for seeding properties
ALTER TABLE public.properties ALTER COLUMN owner_id DROP NOT NULL;