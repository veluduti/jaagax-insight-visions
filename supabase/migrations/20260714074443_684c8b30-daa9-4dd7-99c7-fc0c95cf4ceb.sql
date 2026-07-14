
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS district_admin_id uuid;

CREATE INDEX IF NOT EXISTS idx_properties_district_admin ON public.properties(district_admin_id);

-- Trigger: after scope is filled, resolve district admin
CREATE OR REPLACE FUNCTION public.assign_district_admin_to_property()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.country IS NOT NULL AND NEW.state IS NOT NULL AND NEW.district IS NOT NULL THEN
    IF NEW.district_admin_id IS NULL
       OR (TG_OP = 'UPDATE' AND (
           OLD.country IS DISTINCT FROM NEW.country
        OR OLD.state IS DISTINCT FROM NEW.state
        OR OLD.district IS DISTINCT FROM NEW.district))
    THEN
      NEW.district_admin_id := public.get_district_admin_for(NEW.country, NEW.state, NEW.district);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_properties_assign_district_admin ON public.properties;
CREATE TRIGGER trg_properties_assign_district_admin
  BEFORE INSERT OR UPDATE OF country, state, district ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.assign_district_admin_to_property();

-- Backfill
UPDATE public.properties p
  SET district_admin_id = public.get_district_admin_for(p.country, p.state, p.district)
  WHERE p.district_admin_id IS NULL
    AND p.country IS NOT NULL AND p.state IS NOT NULL AND p.district IS NOT NULL;

-- Rewrite property submit notification: District Admin only, fallback to Global
CREATE OR REPLACE FUNCTION public.notify_admins_on_property_submit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_district_admin uuid;
BEGIN
  IF COALESCE(NEW.is_draft, false) = true THEN
    RETURN NEW;
  END IF;

  IF NEW.verification_status = 'pending' AND
     (TG_OP = 'INSERT' OR OLD.verification_status IS DISTINCT FROM 'pending')
  THEN
    v_district_admin := COALESCE(
      NEW.district_admin_id,
      public.get_district_admin_for(NEW.country, NEW.state, NEW.district)
    );

    IF v_district_admin IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        v_district_admin,
        'Property awaiting verification',
        COALESCE(NEW.title, 'A property') || ' was submitted in ' ||
          COALESCE(NEW.district, 'your district') || ' and needs review.',
        'alert', '/admin'
      );
    ELSE
      -- Fallback: notify global admins so nothing is stranded
      INSERT INTO public.notifications (user_id, title, message, type, link)
      SELECT s.user_id,
        'Property awaiting verification (no district admin assigned)',
        COALESCE(NEW.title, 'A property') || ' was submitted in ' ||
          COALESCE(NEW.district, 'an unassigned district') ||
          '. Please assign a District Admin or review directly.',
        'alert', '/admin'
      FROM public.admin_scopes s
      WHERE s.role = 'global_admin' AND COALESCE(s.is_active, true) = true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Rewrite new-profile notification similarly
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email text;
  v_district_admin uuid;
BEGIN
  BEGIN
    SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;
  EXCEPTION WHEN OTHERS THEN
    v_email := NULL;
  END;

  IF NEW.country IS NOT NULL AND NEW.state IS NOT NULL AND NEW.district IS NOT NULL THEN
    v_district_admin := public.get_district_admin_for(NEW.country, NEW.state, NEW.district);
  END IF;

  IF v_district_admin IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      v_district_admin,
      'New ' || INITCAP(NEW.type) || ' role awaiting approval',
      COALESCE(v_email, 'A user') || ' in ' || COALESCE(NEW.district, 'your district') ||
        ' requested the ' || NEW.type || ' role and needs approval.',
      'alert', '/admin'
    );
  ELSE
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT s.user_id,
      'New ' || INITCAP(NEW.type) || ' role awaiting approval',
      COALESCE(v_email, 'A user') || ' requested the ' || NEW.type || ' role and needs approval.',
      'alert', '/admin'
    FROM public.admin_scopes s
    WHERE s.role = 'global_admin' AND COALESCE(s.is_active, true) = true;
  END IF;

  RETURN NEW;
END;
$$;
