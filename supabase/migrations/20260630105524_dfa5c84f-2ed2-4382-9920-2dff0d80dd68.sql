
-- 1) New column: verification_requested (owner's intent)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS verification_requested boolean NOT NULL DEFAULT true;

-- 2) Admin RPC: temporarily approve a verification-requested property when no agent is available
CREATE OR REPLACE FUNCTION public.admin_temp_approve_no_agent(_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  UPDATE public.properties
  SET verified = false,
      is_live = true,
      verification_status = 'agent_unavailable',
      lifecycle_status = 'live',
      published_at = COALESCE(published_at, now()),
      rejection_reason = NULL,
      updated_at = now()
  WHERE id = _property_id;

  -- Notify the owner
  INSERT INTO public.notifications (user_id, type, title, message, link)
  SELECT p.submitted_by, 'property_approved',
    'Your listing is live (unverified)',
    p.title || ' is now live. No verification agent was available nearby — we''ll notify you when one joins your locality.',
    '/property/' || p.id::text
  FROM public.properties p
  WHERE p.id = _property_id AND p.submitted_by IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_temp_approve_no_agent(uuid) TO authenticated;

-- 3) Owner RPC: request verification later (after notification that an agent is available)
CREATE OR REPLACE FUNCTION public.owner_request_verification(_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_owner uuid; v_title text;
BEGIN
  SELECT submitted_by, title INTO v_owner, v_title
  FROM public.properties WHERE id = _property_id FOR UPDATE;

  IF v_owner IS NULL THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF v_owner <> auth.uid() THEN RAISE EXCEPTION 'Only the owner can request verification'; END IF;

  UPDATE public.properties
  SET verification_requested = true,
      verification_status = 'pending',
      updated_at = now()
  WHERE id = _property_id;

  -- Notify admins
  INSERT INTO public.notifications (user_id, type, title, message, link)
  SELECT ur.user_id, 'alert',
    'Owner requested verification',
    'Owner requested verification for "' || COALESCE(v_title, 'a property') || '". Please assign a nearby agent.',
    '/admin'
  FROM public.user_roles ur WHERE ur.role = 'admin';
END;
$$;

GRANT EXECUTE ON FUNCTION public.owner_request_verification(uuid) TO authenticated;

-- 4) Trigger on agents: when a new verified agent is added (or becomes verified), notify
--    owners of properties waiting for a nearby agent.
CREATE OR REPLACE FUNCTION public.notify_owners_of_new_agent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record;
BEGIN
  IF NOT COALESCE(NEW.verified, false) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.verified, false) = COALESCE(NEW.verified, false)
     AND COALESCE(OLD.cities_served, '') = COALESCE(NEW.cities_served, '')
     AND COALESCE(OLD.localities_served, '') = COALESCE(NEW.localities_served, '') THEN
    RETURN NEW;
  END IF;

  FOR r IN
    SELECT p.id, p.title, p.submitted_by
    FROM public.properties p
    WHERE p.verification_requested = true
      AND COALESCE(p.verified, false) = false
      AND p.verification_status = 'agent_unavailable'
      AND p.submitted_by IS NOT NULL
      AND (
        (p.locality IS NOT NULL AND NEW.localities_served ILIKE '%' || p.locality || '%')
        OR (p.city IS NOT NULL AND NEW.cities_served ILIKE '%' || p.city || '%')
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = p.submitted_by
          AND n.type = 'agent_available_for_verification'
          AND n.metadata->>'property_id' = p.id::text
      )
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    VALUES (r.submitted_by,
      'agent_available_for_verification',
      'A JAAGA verification agent is now available',
      'A verification agent has joined your locality. Would you like to verify "' || COALESCE(r.title, 'your property') || '"?',
      '/dashboard/seller',
      jsonb_build_object('property_id', r.id));
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_owners_of_new_agent ON public.agents;
CREATE TRIGGER trg_notify_owners_of_new_agent
AFTER INSERT OR UPDATE OF verified, cities_served, localities_served ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.notify_owners_of_new_agent();
