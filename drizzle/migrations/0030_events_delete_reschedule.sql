ALTER TABLE public.events ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS rescheduled_at timestamptz;
DROP POLICY IF EXISTS "events_public_read" ON public.events;
CREATE POLICY "events_public_read" ON public.events FOR SELECT TO anon, authenticated
  USING ((deleted_at IS NULL AND status IN ('approved','completed')) OR organizer_id = auth.uid() OR public.is_global_admin(auth.uid()));