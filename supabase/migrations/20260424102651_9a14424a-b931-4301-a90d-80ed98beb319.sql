-- TEMPORARY TESTING MODE: allow public admin approval actions while logged out
-- This should be removed once proper admin authentication is added.

-- 1) Public approval/rejection for properties
DROP POLICY IF EXISTS "Public can update properties (testing)" ON public.properties;
CREATE POLICY "Public can update properties (testing)"
ON public.properties
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- 2) Public approval/rejection for projects
DROP POLICY IF EXISTS "Public can update projects (testing)" ON public.projects;
CREATE POLICY "Public can update projects (testing)"
ON public.projects
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- 3) Allow notifications to be created during public admin testing
DROP POLICY IF EXISTS "Public can insert notifications (testing)" ON public.notifications;
CREATE POLICY "Public can insert notifications (testing)"
ON public.notifications
FOR INSERT
TO public
WITH CHECK (true);

-- 4) Prevent anonymous admin testing from triggering re-approval resets
CREATE OR REPLACE FUNCTION public.force_property_reapproval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN := false;
BEGIN
  -- Anonymous testing path: do not reset moderation state.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_admin := public.is_admin(auth.uid());

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

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

CREATE OR REPLACE FUNCTION public.force_project_reapproval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN := false;
BEGIN
  -- Anonymous testing path: do not reset moderation state.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_admin := public.is_admin(auth.uid());

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE') AND (
       NEW.name IS DISTINCT FROM OLD.name OR
       NEW.description IS DISTINCT FROM OLD.description OR
       NEW.price_min IS DISTINCT FROM OLD.price_min OR
       NEW.price_max IS DISTINCT FROM OLD.price_max OR
       NEW.avg_price IS DISTINCT FROM OLD.avg_price OR
       NEW.address IS DISTINCT FROM OLD.address OR
       NEW.locality IS DISTINCT FROM OLD.locality OR
       NEW.city IS DISTINCT FROM OLD.city OR
       NEW.images IS DISTINCT FROM OLD.images OR
       NEW.image IS DISTINCT FROM OLD.image OR
       NEW.amenities IS DISTINCT FROM OLD.amenities OR
       NEW.bhk_types IS DISTINCT FROM OLD.bhk_types OR
       NEW.project_type IS DISTINCT FROM OLD.project_type OR
       NEW.possession_date IS DISTINCT FROM OLD.possession_date OR
       NEW.brochure_url IS DISTINCT FROM OLD.brochure_url OR
       NEW.layout_plan_url IS DISTINCT FROM OLD.layout_plan_url OR
       NEW.master_plan_url IS DISTINCT FROM OLD.master_plan_url OR
       NEW.virtual_tour_url IS DISTINCT FROM OLD.virtual_tour_url OR
       NEW.rera_id IS DISTINCT FROM OLD.rera_id OR
       NEW.rera_document_url IS DISTINCT FROM OLD.rera_document_url
     )
  THEN
    NEW.verification_status := 'pending';
    NEW.verified := false;
    NEW.is_draft := COALESCE(NEW.is_draft, false);
  END IF;

  RETURN NEW;
END;
$$;