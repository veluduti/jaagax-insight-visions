-- Temporarily allow inserting users without auth check for seeding
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Also update properties to allow null owner_id
ALTER TABLE public.properties ALTER COLUMN owner_id DROP NOT NULL;