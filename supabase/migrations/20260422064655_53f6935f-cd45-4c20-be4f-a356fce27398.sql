
-- ============================================
-- 1. PROPERTIES — tighten update access
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can verify properties" ON public.properties;
DROP POLICY IF EXISTS "Public can update properties (temp)" ON public.properties;
-- Keep: "Builders can update own properties" (owner) + "Admins can manage all properties"

-- ============================================
-- 2. BUILDER_PROFILES — owner-only edits
-- ============================================
DROP POLICY IF EXISTS "Anyone can create builder profiles" ON public.builder_profiles;
DROP POLICY IF EXISTS "Anyone can update builder profiles" ON public.builder_profiles;
-- Keep: "Authenticated users can create profiles" (auth.uid() = user_id),
--       "Users can update own profiles", "Admins can manage all profiles", "Anyone can view builder profiles"

-- ============================================
-- 3. SIGNUP_REQUESTS — no public mutations / list
-- ============================================
DROP POLICY IF EXISTS "Public can update signup requests" ON public.signup_requests;
DROP POLICY IF EXISTS "Public can view all signup requests" ON public.signup_requests;
-- Keep: admins manage; users view + insert their own

-- ============================================
-- 4. USER_ROLES — no public read/insert
-- ============================================
DROP POLICY IF EXISTS "Public can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Public can view all user roles" ON public.user_roles;
-- Keep: admins manage; users view own; users self-assign safe roles on signup

-- ============================================
-- 5. RE-APPROVAL TRIGGER — properties
-- When a NON-admin owner edits a property, force it back to pending review.
-- ============================================
CREATE OR REPLACE FUNCTION public.force_property_reapproval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN := false;
BEGIN
  -- Skip when admin is updating
  IF auth.uid() IS NOT NULL THEN
    v_is_admin := public.is_admin(auth.uid());
  END IF;

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- If owner toggled draft→published or edited any meaningful field, reset moderation
  IF (TG_OP = 'UPDATE') AND (
       NEW.title IS DISTINCT FROM OLD.title OR
       NEW.description IS DISTINCT FROM OLD.description OR
       NEW.price IS DISTINCT FROM OLD.price OR
       NEW.area_sqft IS DISTINCT FROM OLD.area_sqft OR
       NEW.bhk IS DISTINCT FROM OLD.bhk OR
       NEW.bedrooms IS DISTINCT FROM OLD.bedrooms OR
       NEW.bathrooms IS DISTINCT FROM OLD.bathrooms OR
       NEW.address IS DISTINCT FROM OLD.address OR
       NEW.locality IS DISTINCT FROM OLD.locality OR
       NEW.city IS DISTINCT FROM OLD.city OR
       NEW.images IS DISTINCT FROM OLD.images OR
       NEW.video_urls IS DISTINCT FROM OLD.video_urls OR
       NEW.amenities IS DISTINCT FROM OLD.amenities OR
       NEW.type IS DISTINCT FROM OLD.type OR
       NEW.listing_type IS DISTINCT FROM OLD.listing_type
     )
  THEN
    NEW.verification_status := 'pending';
    NEW.verified := false;
    NEW.is_draft := COALESCE(NEW.is_draft, false);
    NEW.rejection_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_force_property_reapproval ON public.properties;
CREATE TRIGGER trg_force_property_reapproval
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.force_property_reapproval();

-- ============================================
-- 6. RE-APPROVAL TRIGGER — projects
-- ============================================
CREATE OR REPLACE FUNCTION public.force_project_reapproval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN := false;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    v_is_admin := public.is_admin(auth.uid());
  END IF;

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE') AND (
       NEW.name IS DISTINCT FROM OLD.name OR
       NEW.description IS DISTINCT FROM OLD.description OR
       NEW.price_min IS DISTINCT FROM OLD.price_min OR
       NEW.price_max IS DISTINCT FROM OLD.price_max OR
       NEW.address IS DISTINCT FROM OLD.address OR
       NEW.locality IS DISTINCT FROM OLD.locality OR
       NEW.city IS DISTINCT FROM OLD.city OR
       NEW.images IS DISTINCT FROM OLD.images OR
       NEW.amenities IS DISTINCT FROM OLD.amenities OR
       NEW.bhk_types IS DISTINCT FROM OLD.bhk_types OR
       NEW.possession_date IS DISTINCT FROM OLD.possession_date
     )
  THEN
    NEW.verified := false;
    NEW.is_draft := COALESCE(NEW.is_draft, false);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_force_project_reapproval ON public.projects;
CREATE TRIGGER trg_force_project_reapproval
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.force_project_reapproval();

-- ============================================
-- 7. NOTIFY ADMINS ON NEW SUBMISSIONS
-- (fires for every new property/project that is not a draft)
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_admins_on_property_submit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.is_draft, false) = true THEN
    RETURN NEW;
  END IF;

  IF NEW.verification_status = 'pending' AND
     (TG_OP = 'INSERT' OR OLD.verification_status IS DISTINCT FROM 'pending')
  THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT ur.user_id,
      'Property awaiting verification',
      COALESCE(NEW.title, 'A property') || ' was submitted by a ' ||
        COALESCE(NEW.listed_by, 'user') || ' and needs review.',
      'alert', '/admin'
    FROM public.user_roles ur WHERE ur.role = 'admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_property_submit ON public.properties;
CREATE TRIGGER trg_notify_admins_property_submit
  AFTER INSERT OR UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_property_submit();

CREATE OR REPLACE FUNCTION public.notify_admins_on_project_submit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.is_draft, false) = true THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.verified, false) = false AND
     (TG_OP = 'INSERT' OR COALESCE(OLD.verified, false) = true)
  THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT ur.user_id,
      'Project awaiting verification',
      COALESCE(NEW.name, 'A project') || ' submitted by ' ||
        COALESCE(NEW.builder_name, 'a builder') || ' needs review.',
      'alert', '/admin'
    FROM public.user_roles ur WHERE ur.role = 'admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_project_submit ON public.projects;
CREATE TRIGGER trg_notify_admins_project_submit
  AFTER INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_project_submit();
