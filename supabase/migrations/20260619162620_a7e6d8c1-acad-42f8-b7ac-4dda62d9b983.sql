
-- =========================================================
-- 1. ENUMS
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.property_lifecycle_status AS ENUM (
    'draft','submitted','pending_admin_review',
    'agent_assigned','agent_accepted','agent_rejected',
    'visit_scheduled','under_verification','verification_submitted',
    'pending_final_approval','live','live_verified',
    'expired','renewed','rejected','cancelled_by_owner'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.agent_assignment_state AS ENUM ('pending','accepted','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.lead_source AS ENUM ('call','whatsapp','inquiry');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.lead_status AS ENUM ('new','contacted','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.verification_artifact_status AS ENUM ('in_progress','submitted','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- 2. PROPERTIES: new columns (backward compatible)
-- =========================================================
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS lifecycle_status public.property_lifecycle_status,
  ADD COLUMN IF NOT EXISTS force_verification BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agent_assignment_status public.agent_assignment_state,
  ADD COLUMN IF NOT EXISTS agent_assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agent_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agent_rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agent_rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS edit_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS was_ever_rejected BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS listed_by_role_snapshot TEXT;

-- Backfill lifecycle_status from existing columns (one-time best effort)
UPDATE public.properties
SET lifecycle_status = CASE
  WHEN COALESCE(is_draft,false) = true THEN 'draft'::public.property_lifecycle_status
  WHEN verification_status = 'rejected' THEN 'rejected'
  WHEN verification_status = 'blocked' THEN 'rejected'
  WHEN verification_status = 'expired' THEN 'expired'
  WHEN verification_status = 'approved' AND verified = true AND is_live = true THEN 'live_verified'
  WHEN verification_status = 'approved' AND is_live = true THEN 'live'
  WHEN verification_status = 'approved' THEN 'pending_final_approval'
  WHEN assigned_agent_id IS NOT NULL THEN 'agent_assigned'
  WHEN verification_status = 'pending' THEN 'pending_admin_review'
  ELSE 'submitted'
END
WHERE lifecycle_status IS NULL;

-- Backfill snapshot of listed-by role
UPDATE public.properties
SET listed_by_role_snapshot = COALESCE(listed_by_role_snapshot, listed_by, 'seller')
WHERE listed_by_role_snapshot IS NULL;

-- Backfill last_verified_at for already verified rows
UPDATE public.properties
SET last_verified_at = COALESCE(last_verified_at, updated_at)
WHERE verified = true AND last_verified_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_properties_lifecycle_status ON public.properties(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_properties_assigned_agent ON public.properties(assigned_agent_id);

-- =========================================================
-- 3. NEW TABLE: property_verifications
-- =========================================================
CREATE TABLE IF NOT EXISTS public.property_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  photos TEXT[] NOT NULL DEFAULT '{}',
  geo_photos JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{url, lat, lng, captured_at}]
  video_url TEXT,
  remarks TEXT,
  report_url TEXT,
  status public.verification_artifact_status NOT NULL DEFAULT 'in_progress',
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.property_verifications TO authenticated;
GRANT ALL ON public.property_verifications TO service_role;

ALTER TABLE public.property_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verif_select_stakeholders" ON public.property_verifications
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.submitted_by = auth.uid())
  );

CREATE POLICY "verif_insert_assigned_agent" ON public.property_verifications
  FOR INSERT TO authenticated
  WITH CHECK (
    agent_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND p.assigned_agent_id = auth.uid()
    )
  );

CREATE POLICY "verif_update_owner_agent_admin" ON public.property_verifications
  FOR UPDATE TO authenticated
  USING (agent_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (agent_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_property_verifications_updated_at
  BEFORE UPDATE ON public.property_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_property_verifications_property ON public.property_verifications(property_id);
CREATE INDEX IF NOT EXISTS idx_property_verifications_agent ON public.property_verifications(agent_id);

-- =========================================================
-- 4. NEW TABLE: property_audit_log
-- =========================================================
CREATE TABLE IF NOT EXISTS public.property_audit_log (
  id BIGSERIAL PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  actor_id UUID,
  action TEXT NOT NULL,                  -- e.g. 'status_change','field_edit','agent_assigned'
  from_status public.property_lifecycle_status,
  to_status public.property_lifecycle_status,
  field_changes JSONB,                   -- {field: {old, new}}
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.property_audit_log TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.property_audit_log_id_seq TO authenticated;
GRANT ALL ON public.property_audit_log TO service_role;
GRANT ALL ON SEQUENCE public.property_audit_log_id_seq TO service_role;

ALTER TABLE public.property_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select_stakeholders" ON public.property_audit_log
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND (p.submitted_by = auth.uid() OR p.assigned_agent_id = auth.uid())
    )
  );

CREATE POLICY "audit_insert_authenticated" ON public.property_audit_log
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_property_audit_property ON public.property_audit_log(property_id, created_at DESC);

-- =========================================================
-- 5. NEW TABLE: property_leads
-- =========================================================
CREATE TABLE IF NOT EXISTS public.property_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  lead_user_id UUID,                     -- nullable for anonymous
  lead_name TEXT,
  lead_phone TEXT,
  lead_email TEXT,
  owner_id UUID NOT NULL,                -- snapshot at creation
  assigned_agent_id UUID,                -- snapshot at creation (frozen, historical)
  source public.lead_source NOT NULL,
  status public.lead_status NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.property_leads TO authenticated;
GRANT INSERT ON public.property_leads TO anon;          -- anon buyer enquiries allowed
GRANT ALL ON public.property_leads TO service_role;

ALTER TABLE public.property_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_insert_anyone" ON public.property_leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "leads_select_stakeholders" ON public.property_leads
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR lead_user_id = auth.uid()
    OR owner_id = auth.uid()
    OR assigned_agent_id = auth.uid()
  );

CREATE POLICY "leads_update_owner_agent_admin" ON public.property_leads
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR owner_id = auth.uid() OR assigned_agent_id = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR owner_id = auth.uid() OR assigned_agent_id = auth.uid());

CREATE TRIGGER trg_property_leads_updated_at
  BEFORE UPDATE ON public.property_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_property_leads_property ON public.property_leads(property_id);
CREATE INDEX IF NOT EXISTS idx_property_leads_agent ON public.property_leads(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_property_leads_owner ON public.property_leads(owner_id);

-- =========================================================
-- 6. STATUS TRANSITION GUARD
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_valid_property_transition(
  _from public.property_lifecycle_status,
  _to public.property_lifecycle_status
) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
  SELECT _from IS NULL
      OR _from = _to
      OR (_from, _to) IN (
        ('draft','submitted'),
        ('draft','cancelled_by_owner'),
        ('submitted','pending_admin_review'),
        ('submitted','cancelled_by_owner'),
        ('pending_admin_review','live'),
        ('pending_admin_review','agent_assigned'),
        ('pending_admin_review','rejected'),
        ('pending_admin_review','cancelled_by_owner'),
        ('agent_assigned','agent_accepted'),
        ('agent_assigned','agent_rejected'),
        ('agent_assigned','cancelled_by_owner'),
        ('agent_rejected','pending_admin_review'),
        ('agent_accepted','visit_scheduled'),
        ('agent_accepted','cancelled_by_owner'),
        ('visit_scheduled','under_verification'),
        ('visit_scheduled','cancelled_by_owner'),
        ('under_verification','verification_submitted'),
        ('verification_submitted','pending_final_approval'),
        ('pending_final_approval','live_verified'),
        ('pending_final_approval','rejected'),
        ('live','expired'),
        ('live','cancelled_by_owner'),
        ('live_verified','expired'),
        ('live_verified','cancelled_by_owner'),
        ('expired','renewed'),
        ('renewed','live'),
        ('renewed','live_verified'),
        ('renewed','pending_admin_review'),
        ('rejected','pending_admin_review')
      );
$$;

CREATE OR REPLACE FUNCTION public.enforce_property_lifecycle()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN := false;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    v_is_admin := public.is_admin(auth.uid());
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.lifecycle_status IS NULL THEN
      NEW.lifecycle_status := CASE WHEN COALESCE(NEW.is_draft,false) THEN 'draft' ELSE 'submitted' END;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status THEN
    IF NOT v_is_admin AND NOT public.is_valid_property_transition(OLD.lifecycle_status, NEW.lifecycle_status) THEN
      RAISE EXCEPTION 'Invalid property status transition: % -> %', OLD.lifecycle_status, NEW.lifecycle_status;
    END IF;

    -- Side effects
    IF NEW.lifecycle_status = 'agent_accepted' THEN
      NEW.edit_locked := true;
      NEW.agent_accepted_at := COALESCE(NEW.agent_accepted_at, now());
      NEW.agent_assignment_status := 'accepted';
    ELSIF NEW.lifecycle_status = 'agent_rejected' THEN
      NEW.agent_rejected_at := COALESCE(NEW.agent_rejected_at, now());
      NEW.agent_assignment_status := 'rejected';
      NEW.edit_locked := false;
    ELSIF NEW.lifecycle_status = 'agent_assigned' THEN
      NEW.agent_assigned_at := COALESCE(NEW.agent_assigned_at, now());
      NEW.agent_assignment_status := 'pending';
      NEW.edit_locked := false;
    ELSIF NEW.lifecycle_status = 'live_verified' THEN
      NEW.verified := true;
      NEW.is_live := true;
      NEW.last_verified_at := COALESCE(NEW.last_verified_at, now());
      NEW.verification_status := 'approved';
    ELSIF NEW.lifecycle_status = 'live' THEN
      NEW.is_live := true;
      NEW.verification_status := 'approved';
    ELSIF NEW.lifecycle_status = 'rejected' THEN
      NEW.was_ever_rejected := true;
      NEW.is_live := false;
      NEW.verification_status := 'rejected';
    ELSIF NEW.lifecycle_status = 'expired' THEN
      NEW.is_live := false;
      NEW.verification_status := 'expired';
    END IF;
  END IF;

  -- Owner edit-lock enforcement (admin bypasses)
  IF NOT v_is_admin
     AND auth.uid() IS NOT NULL
     AND NEW.submitted_by = auth.uid()
     AND COALESCE(OLD.edit_locked, false) = true
     AND NEW.lifecycle_status = OLD.lifecycle_status
  THEN
    -- Only allow harmless flags through; block content edits
    IF (NEW.title, NEW.description, NEW.price, NEW.area_sqft, NEW.bhk, NEW.bedrooms,
        NEW.bathrooms, NEW.address, NEW.locality, NEW.city, NEW.images, NEW.amenities,
        NEW.type, NEW.listing_type)
       IS DISTINCT FROM
       (OLD.title, OLD.description, OLD.price, OLD.area_sqft, OLD.bhk, OLD.bedrooms,
        OLD.bathrooms, OLD.address, OLD.locality, OLD.city, OLD.images, OLD.amenities,
        OLD.type, OLD.listing_type)
    THEN
      RAISE EXCEPTION 'Property is locked for owner edits after the assigned agent accepted. Contact admin to modify.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_property_lifecycle ON public.properties;
CREATE TRIGGER trg_enforce_property_lifecycle
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.enforce_property_lifecycle();

-- =========================================================
-- 7. AUDIT WRITER TRIGGER
-- =========================================================
CREATE OR REPLACE FUNCTION public.write_property_audit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_changes JSONB := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.property_audit_log(property_id, actor_id, action, to_status, metadata)
    VALUES (NEW.id, auth.uid(), 'created', NEW.lifecycle_status,
            jsonb_build_object('listed_by', NEW.listed_by_role_snapshot));
    RETURN NEW;
  END IF;

  IF NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status THEN
    INSERT INTO public.property_audit_log(property_id, actor_id, action, from_status, to_status)
    VALUES (NEW.id, auth.uid(), 'status_change', OLD.lifecycle_status, NEW.lifecycle_status);
  END IF;

  IF NEW.assigned_agent_id IS DISTINCT FROM OLD.assigned_agent_id THEN
    INSERT INTO public.property_audit_log(property_id, actor_id, action, metadata)
    VALUES (NEW.id, auth.uid(), 'agent_assigned',
            jsonb_build_object('from', OLD.assigned_agent_id, 'to', NEW.assigned_agent_id));
  END IF;

  IF (NEW.title, NEW.price, NEW.description, NEW.address, NEW.locality, NEW.city,
      NEW.area_sqft, NEW.bhk, NEW.bedrooms, NEW.bathrooms, NEW.images, NEW.amenities)
     IS DISTINCT FROM
     (OLD.title, OLD.price, OLD.description, OLD.address, OLD.locality, OLD.city,
      OLD.area_sqft, OLD.bhk, OLD.bedrooms, OLD.bathrooms, OLD.images, OLD.amenities)
  THEN
    IF NEW.title IS DISTINCT FROM OLD.title THEN v_changes := v_changes || jsonb_build_object('title', jsonb_build_object('old', OLD.title, 'new', NEW.title)); END IF;
    IF NEW.price IS DISTINCT FROM OLD.price THEN v_changes := v_changes || jsonb_build_object('price', jsonb_build_object('old', OLD.price, 'new', NEW.price)); END IF;
    IF NEW.description IS DISTINCT FROM OLD.description THEN v_changes := v_changes || jsonb_build_object('description', jsonb_build_object('old', OLD.description, 'new', NEW.description)); END IF;
    IF NEW.address IS DISTINCT FROM OLD.address THEN v_changes := v_changes || jsonb_build_object('address', jsonb_build_object('old', OLD.address, 'new', NEW.address)); END IF;
    IF NEW.locality IS DISTINCT FROM OLD.locality THEN v_changes := v_changes || jsonb_build_object('locality', jsonb_build_object('old', OLD.locality, 'new', NEW.locality)); END IF;
    IF NEW.city IS DISTINCT FROM OLD.city THEN v_changes := v_changes || jsonb_build_object('city', jsonb_build_object('old', OLD.city, 'new', NEW.city)); END IF;
    INSERT INTO public.property_audit_log(property_id, actor_id, action, field_changes)
    VALUES (NEW.id, auth.uid(), 'field_edit', v_changes);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_write_property_audit ON public.properties;
CREATE TRIGGER trg_write_property_audit
  AFTER INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.write_property_audit();

-- =========================================================
-- 8. RENEWAL ROUTER
-- =========================================================
CREATE OR REPLACE FUNCTION public.renew_property_listing_v2(_property_id UUID)
RETURNS public.property_lifecycle_status
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_owner UUID; v_was_verified BOOLEAN; v_ever_rejected BOOLEAN;
  v_new_status public.property_lifecycle_status;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT submitted_by, (last_verified_at IS NOT NULL), was_ever_rejected
    INTO v_owner, v_was_verified, v_ever_rejected
  FROM public.properties WHERE id = _property_id FOR UPDATE;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF v_owner <> auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only the owner can renew this listing';
  END IF;

  -- Move through renewed -> final
  UPDATE public.properties SET lifecycle_status = 'renewed', updated_at = now() WHERE id = _property_id;

  IF v_was_verified AND NOT v_ever_rejected THEN
    v_new_status := 'live_verified';
  ELSIF v_was_verified AND v_ever_rejected THEN
    v_new_status := 'live_verified';  -- previously verified takes precedence
  ELSE
    v_new_status := 'pending_admin_review';
  END IF;

  UPDATE public.properties
    SET lifecycle_status = v_new_status,
        expiry_date = CASE WHEN v_new_status IN ('live','live_verified')
                           THEN now() + INTERVAL '90 days' ELSE NULL END,
        updated_at = now()
    WHERE id = _property_id;

  INSERT INTO public.notifications(user_id, title, message, type, link)
  VALUES (v_owner,
    CASE WHEN v_new_status = 'live_verified' THEN 'Listing renewed and live ✅' ELSE 'Renewal submitted for review' END,
    CASE WHEN v_new_status = 'live_verified'
         THEN 'Your verified listing is back online for another 90 days.'
         ELSE 'Your renewal is in admin review.' END,
    'success', '/dashboard/seller');

  RETURN v_new_status;
END;
$$;

-- =========================================================
-- 9. NEARBY AGENTS RPC (distance + workload)
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_nearby_agents_for_property(
  _property_id UUID,
  _radius_km NUMERIC DEFAULT 25,
  _limit INT DEFAULT 25
)
RETURNS TABLE(
  agent_id UUID,
  agent_name TEXT,
  agent_phone TEXT,
  agent_city TEXT,
  distance_km NUMERIC,
  active_tasks INT,
  pending_tasks INT,
  completed_verifications INT,
  avg_rating NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_lat NUMERIC; v_lng NUMERIC;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  SELECT latitude, longitude INTO v_lat, v_lng
  FROM public.properties WHERE id = _property_id;

  RETURN QUERY
  WITH base AS (
    SELECT a.id, a.name, a.phone, a.city, a.latitude, a.longitude, a.avg_rating
    FROM public.agents a
    WHERE a.verified = true
  ), dist AS (
    SELECT b.*,
      CASE WHEN v_lat IS NULL OR v_lng IS NULL OR b.latitude IS NULL OR b.longitude IS NULL
        THEN NULL
        ELSE 6371 * 2 * asin(sqrt(
          power(sin(radians((b.latitude - v_lat)/2)),2) +
          cos(radians(v_lat)) * cos(radians(b.latitude)) *
          power(sin(radians((b.longitude - v_lng)/2)),2)
        ))
      END AS d_km
    FROM base b
  )
  SELECT
    d.id,
    d.name,
    d.phone,
    d.city,
    ROUND(d.d_km::numeric, 2) AS distance_km,
    (SELECT COUNT(*)::INT FROM public.properties p
       WHERE p.assigned_agent_id = d.id
         AND p.lifecycle_status IN ('agent_accepted','visit_scheduled','under_verification'))   AS active_tasks,
    (SELECT COUNT(*)::INT FROM public.properties p
       WHERE p.assigned_agent_id = d.id
         AND p.lifecycle_status = 'agent_assigned')                                              AS pending_tasks,
    (SELECT COUNT(*)::INT FROM public.property_verifications v
       WHERE v.agent_id = d.id AND v.status IN ('submitted','approved'))                        AS completed_verifications,
    COALESCE(d.avg_rating, 0)::NUMERIC
  FROM dist d
  WHERE (d.d_km IS NULL OR d.d_km <= _radius_km)
  ORDER BY d.d_km NULLS LAST, active_tasks ASC
  LIMIT _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_agents_for_property(UUID, NUMERIC, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.renew_property_listing_v2(UUID) TO authenticated;
