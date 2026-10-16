CREATE OR REPLACE FUNCTION public.property_leave(_property_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p record; lvl text; uid uuid := auth.uid();
BEGIN
  SELECT * INTO p FROM public.properties WHERE id = _property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF p.is_locked AND p.hold_admin_id IS DISTINCT FROM uid THEN RAISE EXCEPTION 'Property is on hold by another admin'; END IF;
  lvl := p.queue_level;
  IF lvl IS NULL THEN RAISE EXCEPTION 'Property is not in a review queue'; END IF;
  IF NOT public.is_admin(uid) AND p.hold_admin_id IS DISTINCT FROM uid AND NOT EXISTS (
    SELECT 1 FROM public.property_admin_timers t WHERE t.property_id=_property_id AND t.admin_id=uid AND t.level=lvl AND t.status IN ('running','paused','held')) THEN
    RAISE EXCEPTION 'You are not eligible to leave this property';
  END IF;
  UPDATE public.property_admin_timers SET status='expired', remaining_seconds=0, paused_at=NULL
   WHERE property_id=_property_id AND level=lvl AND status IN ('running','paused','held');
  UPDATE public.properties SET is_locked=false, hold_admin_id=NULL, hold_admin_role=NULL, hold_started_at=NULL,
    hold_expires_at=NULL, edit_locked=false, queue_expires_at=now() WHERE id=_property_id;
  INSERT INTO public.property_hold_events(property_id, admin_id, level, action, reason)
    VALUES (_property_id, uid, lvl, 'release', COALESCE(_reason, 'Left by admin — moving to next level'));
  RETURN public.property_escalate(_property_id);
END; $$;
REVOKE ALL ON FUNCTION public.property_leave(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.property_leave(uuid, text) TO authenticated;