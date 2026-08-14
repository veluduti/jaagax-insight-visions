-- Escalate upward: district -> state -> country -> super admin
CREATE OR REPLACE FUNCTION public.workflow_next_level(_level text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _level WHEN 'district' THEN 'state' WHEN 'state' THEN 'country' ELSE NULL END;
$$;

-- Submissions enter the DISTRICT queue first
CREATE OR REPLACE FUNCTION public.property_submit_for_review(_property_id uuid, _needs_agent boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.properties WHERE id = _property_id
                 AND (submitted_by = auth.uid() OR public.is_admin(auth.uid()))) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  UPDATE public.properties
    SET needs_agent = _needs_agent, is_draft = false, lifecycle_status = 'submitted'
    WHERE id = _property_id;
  INSERT INTO public.property_hold_events(property_id, admin_id, action, metadata)
    VALUES (_property_id, auth.uid(), 'submitted', jsonb_build_object('needs_agent', _needs_agent));
  RETURN public.property_enter_queue(_property_id, 'district');
END;
$$;

-- Timeout escalation defaults to district when queue level is unknown
CREATE OR REPLACE FUNCTION public.property_escalate(_property_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; nxt text;
BEGIN
  SELECT * INTO p FROM public.properties WHERE id = _property_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','property_not_found'); END IF;
  nxt := public.workflow_next_level(COALESCE(p.queue_level,'district'));
  UPDATE public.property_admin_timers SET status='expired'
   WHERE property_id=_property_id AND status IN ('running','paused');
  INSERT INTO public.property_hold_events(property_id, level, action, reason)
    VALUES (_property_id, p.queue_level, 'escalated', 'Queue completed without verification');
  IF nxt IS NULL THEN
    UPDATE public.properties SET lifecycle_status='pending_admin_review', queue_level=NULL,
      queue_expires_at=NULL, is_locked=false WHERE id=_property_id;
    RETURN jsonb_build_object('escalated_to','super_admin');
  END IF;
  RETURN public.property_enter_queue(_property_id, nxt);
END;
$$;