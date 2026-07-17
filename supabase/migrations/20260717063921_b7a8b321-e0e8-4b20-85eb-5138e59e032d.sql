
CREATE OR REPLACE FUNCTION public.nl_notify_land_registration_submit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_label text;
BEGIN
  IF NEW.status = 'submitted'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'submitted') THEN
    v_label := COALESCE(NEW.village, NEW.district, NEW.state, 'a new land');

    IF NEW.assigned_admin_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, title, message, type, link)
      VALUES (NEW.assigned_admin_id,
        'Land registration awaiting your approval',
        'A land in ' || v_label || COALESCE(', ' || NEW.district, '') ||
          COALESCE(', ' || NEW.state, '') || ' is pending your review.',
        'alert', '/admin/land-registrations');
    END IF;

    INSERT INTO public.notifications(user_id, title, message, type, link)
    SELECT s.user_id,
      'New land registration submitted',
      'Land in ' || v_label || ' submitted for approval (assigned to ' ||
        COALESCE(NEW.assigned_admin_role, 'no approver') || ').',
      'info', '/admin/land-registrations'
    FROM public.admin_scopes s
    WHERE s.role = 'global_admin' AND COALESCE(s.is_active, true) = true
      AND s.user_id IS DISTINCT FROM NEW.assigned_admin_id;

    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (NEW.user_id,
      'Land submitted for review',
      'Your land registration has been submitted and routed to the ' ||
        COALESCE(NEW.assigned_admin_role, 'admin team') || ' for approval.',
      'success', '/natural-living/list-land');
  END IF;
  RETURN NEW;
END; $$;
