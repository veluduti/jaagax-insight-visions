-- Allow users to delete their own profiles and user_roles so role removal persists.
CREATE POLICY "Users delete own profiles"
ON public.profiles FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own roles"
ON public.user_roles FOR DELETE
USING (auth.uid() = user_id);