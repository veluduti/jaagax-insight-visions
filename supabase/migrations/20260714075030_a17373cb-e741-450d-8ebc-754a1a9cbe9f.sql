
-- =========================================================
-- Phase 3: Admin reminders
-- =========================================================
CREATE TABLE IF NOT EXISTS public.admin_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text,
  entity_id uuid,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  country text, state text, district text,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.admin_reminders TO authenticated;
GRANT ALL ON public.admin_reminders TO service_role;

ALTER TABLE public.admin_reminders ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_reminders_to ON public.admin_reminders(to_admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_from ON public.admin_reminders(from_admin_id, created_at DESC);

-- Helper: can the caller remind a target admin?
CREATE OR REPLACE FUNCTION public.can_remind_admin(_target_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_scopes me
    JOIN public.admin_scopes tgt ON tgt.user_id = _target_user_id
    WHERE me.user_id = auth.uid()
      AND COALESCE(me.is_active, true) = true
      AND COALESCE(tgt.is_active, true) = true
      AND (
        -- global admin can remind anyone
        me.role = 'global_admin'
        -- country admin can remind state/district admins in their country
        OR (me.role = 'country_admin'
            AND tgt.role IN ('state_admin','district_admin')
            AND tgt.country IS NOT DISTINCT FROM me.country)
        -- state admin can remind district admins in their state
        OR (me.role = 'state_admin'
            AND tgt.role = 'district_admin'
            AND tgt.country IS NOT DISTINCT FROM me.country
            AND tgt.state IS NOT DISTINCT FROM me.state)
      )
  );
$$;

DROP POLICY IF EXISTS "admin_reminders view own" ON public.admin_reminders;
CREATE POLICY "admin_reminders view own" ON public.admin_reminders
  FOR SELECT TO authenticated
  USING (from_admin_id = auth.uid() OR to_admin_id = auth.uid());

DROP POLICY IF EXISTS "admin_reminders insert scoped" ON public.admin_reminders;
CREATE POLICY "admin_reminders insert scoped" ON public.admin_reminders
  FOR INSERT TO authenticated
  WITH CHECK (from_admin_id = auth.uid() AND public.can_remind_admin(to_admin_id));

DROP POLICY IF EXISTS "admin_reminders mark read" ON public.admin_reminders;
CREATE POLICY "admin_reminders mark read" ON public.admin_reminders
  FOR UPDATE TO authenticated
  USING (to_admin_id = auth.uid()) WITH CHECK (to_admin_id = auth.uid());

-- RPC: send a reminder (also creates a notification)
CREATE OR REPLACE FUNCTION public.send_admin_reminder(
  _to_admin_id uuid, _message text,
  _entity_type text DEFAULT NULL, _entity_id uuid DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_from_name text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.can_remind_admin(_to_admin_id) THEN
    RAISE EXCEPTION 'You are not allowed to remind that admin';
  END IF;
  IF COALESCE(trim(_message), '') = '' THEN
    RAISE EXCEPTION 'Reminder message is required';
  END IF;

  INSERT INTO public.admin_reminders (from_admin_id, to_admin_id, entity_type, entity_id, message)
    VALUES (auth.uid(), _to_admin_id, _entity_type, _entity_id, _message)
    RETURNING id INTO v_id;

  BEGIN
    SELECT email INTO v_from_name FROM auth.users WHERE id = auth.uid();
  EXCEPTION WHEN OTHERS THEN v_from_name := 'A senior admin'; END;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (_to_admin_id,
    'Reminder from ' || COALESCE(v_from_name, 'a senior admin'),
    _message, 'alert', '/admin');

  RETURN v_id;
END;
$$;

-- =========================================================
-- Phase 4: Admin activity log
-- =========================================================
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  country text, state text, district text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.admin_activity_log TO authenticated;
GRANT ALL ON public.admin_activity_log TO service_role;

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_activity_created ON public.admin_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON public.admin_activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_scope ON public.admin_activity_log(country, state, district);

DROP POLICY IF EXISTS "activity actor read" ON public.admin_activity_log;
CREATE POLICY "activity actor read" ON public.admin_activity_log
  FOR SELECT TO authenticated
  USING (actor_user_id = auth.uid() OR public.admin_can_view(country, state, district));

DROP POLICY IF EXISTS "activity system insert" ON public.admin_activity_log;
CREATE POLICY "activity system insert" ON public.admin_activity_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- Property lifecycle logger
CREATE OR REPLACE FUNCTION public.log_property_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_action text := NULL;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := CASE WHEN COALESCE(NEW.is_draft, false) THEN 'property_draft_saved'
                     ELSE 'property_submitted' END;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.verification_status IS DISTINCT FROM NEW.verification_status THEN
      v_action := 'property_' || NEW.verification_status;
    ELSIF OLD.assigned_agent_id IS DISTINCT FROM NEW.assigned_agent_id AND NEW.assigned_agent_id IS NOT NULL THEN
      v_action := 'property_agent_assigned';
    ELSIF OLD.is_live IS DISTINCT FROM NEW.is_live AND NEW.is_live = true THEN
      v_action := 'property_published';
    ELSIF OLD.is_sold IS DISTINCT FROM NEW.is_sold AND NEW.is_sold = true THEN
      v_action := 'property_sold';
    END IF;
  END IF;

  IF v_action IS NOT NULL THEN
    INSERT INTO public.admin_activity_log
      (actor_user_id, action, entity_type, entity_id, country, state, district, metadata)
    VALUES (
      auth.uid(),
      v_action,
      'property',
      NEW.id,
      NEW.country, NEW.state, NEW.district,
      jsonb_build_object(
        'title', NEW.title,
        'city', NEW.city,
        'locality', NEW.locality,
        'submitted_by', NEW.submitted_by,
        'assigned_agent_id', NEW.assigned_agent_id,
        'verification_status', NEW.verification_status,
        'is_live', NEW.is_live,
        'rejection_reason', NEW.rejection_reason
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_property_activity ON public.properties;
CREATE TRIGGER trg_log_property_activity
  AFTER INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.log_property_activity();

-- Profile activity logger (role approval/rejection)
CREATE OR REPLACE FUNCTION public.log_profile_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_action text := NULL;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'profile_created';
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_action := 'profile_' || NEW.status;
  END IF;

  IF v_action IS NOT NULL THEN
    INSERT INTO public.admin_activity_log
      (actor_user_id, action, entity_type, entity_id, country, state, district, metadata)
    VALUES (auth.uid(), v_action, 'profile', NEW.id,
      NEW.country, NEW.state, NEW.district,
      jsonb_build_object('type', NEW.type, 'user_id', NEW.user_id, 'status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_profile_activity ON public.profiles;
CREATE TRIGGER trg_log_profile_activity
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_profile_activity();

-- Reminder activity logger
CREATE OR REPLACE FUNCTION public.log_reminder_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_country text; v_state text; v_district text;
BEGIN
  SELECT country, state, district INTO v_country, v_state, v_district
    FROM public.admin_scopes WHERE user_id = NEW.to_admin_id LIMIT 1;

  INSERT INTO public.admin_activity_log
    (actor_user_id, action, entity_type, entity_id, country, state, district, metadata)
  VALUES (
    NEW.from_admin_id, 'reminder_sent', 'reminder', NEW.id,
    v_country, v_state, v_district,
    jsonb_build_object('to_admin_id', NEW.to_admin_id, 'message', NEW.message,
                       'target_entity_type', NEW.entity_type,
                       'target_entity_id', NEW.entity_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_reminder_activity ON public.admin_reminders;
CREATE TRIGGER trg_log_reminder_activity
  AFTER INSERT ON public.admin_reminders
  FOR EACH ROW EXECUTE FUNCTION public.log_reminder_activity();

-- Scoped admin list for reminder targeting
CREATE OR REPLACE FUNCTION public.list_reminder_targets()
RETURNS TABLE(user_id uuid, role text, country text, state text, district text, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT tgt.user_id, tgt.role, tgt.country, tgt.state, tgt.district, u.email
  FROM public.admin_scopes tgt
  JOIN auth.users u ON u.id = tgt.user_id
  WHERE COALESCE(tgt.is_active, true) = true
    AND public.can_remind_admin(tgt.user_id);
$$;
