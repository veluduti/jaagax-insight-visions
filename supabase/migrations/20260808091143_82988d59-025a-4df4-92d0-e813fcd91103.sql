-- 1. Applications columns
ALTER TABLE public.financial_loan_applications
  ADD COLUMN IF NOT EXISTS buyer_id uuid,
  ADD COLUMN IF NOT EXISTS buyer_name text,
  ADD COLUMN IF NOT EXISTS buyer_email text,
  ADD COLUMN IF NOT EXISTS buyer_phone text,
  ADD COLUMN IF NOT EXISTS property_id uuid,
  ADD COLUMN IF NOT EXISTS property_title text,
  ADD COLUMN IF NOT EXISTS property_value numeric(14,2),
  ADD COLUMN IF NOT EXISTS tenure_months integer,
  ADD COLUMN IF NOT EXISTS monthly_income numeric(14,2),
  ADD COLUMN IF NOT EXISTS interest_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS processing_fee numeric(12,2),
  ADD COLUMN IF NOT EXISTS emi_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS sanction_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS documents_request_reason text,
  ADD COLUMN IF NOT EXISTS assigned_rm_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_rm_name text,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS disbursed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_fla_buyer_id ON public.financial_loan_applications(buyer_id);

-- 2. Documents columns
ALTER TABLE public.financial_loan_documents
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS uploaded_by uuid,
  ADD COLUMN IF NOT EXISTS request_reason text;

CREATE INDEX IF NOT EXISTS idx_fld_app ON public.financial_loan_documents(application_id);

-- 3. Provider columns
ALTER TABLE public.financial_providers
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS rating numeric(3,2) NOT NULL DEFAULT 4.5,
  ADD COLUMN IF NOT EXISTS rbi_registration text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS loan_products jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS interest_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS processing_fee_percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{"email":true,"in_app":true,"new_application":true,"documents":true,"status":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 4. Timeline / status history
CREATE TABLE IF NOT EXISTS public.financial_application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.financial_loan_applications(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  message text,
  actor_id uuid,
  actor_role text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.financial_application_events TO authenticated;
GRANT ALL ON public.financial_application_events TO service_role;
ALTER TABLE public.financial_application_events ENABLE ROW LEVEL SECURITY;

-- 5. Internal notes
CREATE TABLE IF NOT EXISTS public.financial_application_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.financial_loan_applications(id) ON DELETE CASCADE,
  author_id uuid,
  author_name text,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_application_notes TO authenticated;
GRANT ALL ON public.financial_application_notes TO service_role;
ALTER TABLE public.financial_application_notes ENABLE ROW LEVEL SECURITY;

-- 6. Helper
CREATE OR REPLACE FUNCTION public.is_financial_owner(_application_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.financial_loan_applications a
    JOIN public.financial_providers p ON p.id = a.provider_id
    WHERE a.id = _application_id AND p.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_financial_buyer(_application_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.financial_loan_applications a
    WHERE a.id = _application_id AND a.buyer_id = auth.uid()
  );
$$;

-- 7. RLS: applications
ALTER TABLE public.financial_loan_applications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.financial_loan_applications TO authenticated;
GRANT ALL ON public.financial_loan_applications TO service_role;

DROP POLICY IF EXISTS fla_buyer_select ON public.financial_loan_applications;
CREATE POLICY fla_buyer_select ON public.financial_loan_applications FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR provider_id IN (SELECT id FROM public.financial_providers WHERE user_id = auth.uid()) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS fla_buyer_insert ON public.financial_loan_applications;
CREATE POLICY fla_buyer_insert ON public.financial_loan_applications FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());

DROP POLICY IF EXISTS fla_provider_update ON public.financial_loan_applications;
CREATE POLICY fla_provider_update ON public.financial_loan_applications FOR UPDATE TO authenticated
  USING (provider_id IN (SELECT id FROM public.financial_providers WHERE user_id = auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (true);

-- 8. RLS: providers
ALTER TABLE public.financial_providers ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.financial_providers TO anon;
GRANT SELECT, INSERT, UPDATE ON public.financial_providers TO authenticated;
GRANT ALL ON public.financial_providers TO service_role;

DROP POLICY IF EXISTS fp_public_read ON public.financial_providers;
CREATE POLICY fp_public_read ON public.financial_providers FOR SELECT USING (true);
DROP POLICY IF EXISTS fp_owner_insert ON public.financial_providers;
CREATE POLICY fp_owner_insert ON public.financial_providers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS fp_owner_update ON public.financial_providers;
CREATE POLICY fp_owner_update ON public.financial_providers FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (true);

-- 9. RLS: documents
ALTER TABLE public.financial_loan_documents ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_loan_documents TO authenticated;
GRANT ALL ON public.financial_loan_documents TO service_role;

DROP POLICY IF EXISTS fld_select ON public.financial_loan_documents;
CREATE POLICY fld_select ON public.financial_loan_documents FOR SELECT TO authenticated
  USING (public.is_financial_owner(application_id) OR public.is_financial_buyer(application_id) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS fld_insert ON public.financial_loan_documents;
CREATE POLICY fld_insert ON public.financial_loan_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_financial_owner(application_id) OR public.is_financial_buyer(application_id));
DROP POLICY IF EXISTS fld_update ON public.financial_loan_documents;
CREATE POLICY fld_update ON public.financial_loan_documents FOR UPDATE TO authenticated
  USING (public.is_financial_owner(application_id) OR public.is_financial_buyer(application_id)) WITH CHECK (true);

-- 10. RLS: events + notes
DROP POLICY IF EXISTS fae_select ON public.financial_application_events;
CREATE POLICY fae_select ON public.financial_application_events FOR SELECT TO authenticated
  USING (public.is_financial_owner(application_id) OR public.is_financial_buyer(application_id) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS fae_insert ON public.financial_application_events;
CREATE POLICY fae_insert ON public.financial_application_events FOR INSERT TO authenticated
  WITH CHECK (public.is_financial_owner(application_id) OR public.is_financial_buyer(application_id));

DROP POLICY IF EXISTS fan_all ON public.financial_application_notes;
CREATE POLICY fan_all ON public.financial_application_notes FOR ALL TO authenticated
  USING (public.is_financial_owner(application_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_financial_owner(application_id));

-- 11. RLS: notifications
ALTER TABLE public.financial_notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_notifications TO authenticated;
GRANT ALL ON public.financial_notifications TO service_role;
DROP POLICY IF EXISTS fn_owner ON public.financial_notifications;
CREATE POLICY fn_owner ON public.financial_notifications FOR ALL TO authenticated
  USING (provider_id IN (SELECT id FROM public.financial_providers WHERE user_id = auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (true);

-- 12. Auto timeline + notification
CREATE OR REPLACE FUNCTION public.financial_application_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.financial_application_events(application_id, event_type, to_status, message)
    VALUES (NEW.id, 'created', NEW.status, 'Application submitted');
    INSERT INTO public.financial_notifications(provider_id, type, title, message, link)
    VALUES (NEW.provider_id, 'lead', 'New Loan Application',
      COALESCE(NEW.buyer_name, NEW.customer_name, 'A customer') || ' applied for a loan',
      '/dashboard/financial/applications/' || NEW.id::text);
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.financial_application_events(application_id, event_type, from_status, to_status, message)
    VALUES (NEW.id, 'status_change', OLD.status, NEW.status, 'Status changed to ' || NEW.status);
    INSERT INTO public.financial_notifications(provider_id, type, title, message, link)
    VALUES (NEW.provider_id, 'approval', 'Application ' || replace(NEW.status, '_', ' '),
      COALESCE(NEW.buyer_name, NEW.customer_name, 'Customer') || ' application is now ' || replace(NEW.status, '_', ' '),
      '/dashboard/financial/applications/' || NEW.id::text);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fla_audit_ins ON public.financial_loan_applications;
CREATE TRIGGER trg_fla_audit_ins AFTER INSERT ON public.financial_loan_applications
FOR EACH ROW EXECUTE FUNCTION public.financial_application_audit();

DROP TRIGGER IF EXISTS trg_fla_audit_upd ON public.financial_loan_applications;
CREATE TRIGGER trg_fla_audit_upd BEFORE UPDATE ON public.financial_loan_applications
FOR EACH ROW EXECUTE FUNCTION public.financial_application_audit();

-- 13. Document upload notification
CREATE OR REPLACE FUNCTION public.financial_document_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid;
BEGIN
  SELECT provider_id INTO pid FROM public.financial_loan_applications WHERE id = NEW.application_id;
  IF TG_OP = 'INSERT' AND NEW.verified_status = 'missing' THEN
    INSERT INTO public.financial_application_events(application_id, event_type, message)
    VALUES (NEW.application_id, 'document_requested', 'Requested document: ' || NEW.document_type);
  ELSIF TG_OP = 'UPDATE' AND NEW.file_url IS DISTINCT FROM OLD.file_url AND NEW.file_url IS NOT NULL THEN
    INSERT INTO public.financial_application_events(application_id, event_type, message)
    VALUES (NEW.application_id, 'document_uploaded', 'Customer uploaded: ' || NEW.document_type);
    INSERT INTO public.financial_notifications(provider_id, type, title, message, link)
    VALUES (pid, 'document', 'Customer Uploaded Documents', 'New document: ' || NEW.document_type,
      '/dashboard/financial/applications/' || NEW.application_id::text);
  ELSIF TG_OP = 'UPDATE' AND NEW.verified_status IS DISTINCT FROM OLD.verified_status THEN
    INSERT INTO public.financial_application_events(application_id, event_type, message)
    VALUES (NEW.application_id, 'document_' || NEW.verified_status, NEW.document_type || ' marked ' || NEW.verified_status);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fld_audit ON public.financial_loan_documents;
CREATE TRIGGER trg_fld_audit AFTER INSERT OR UPDATE ON public.financial_loan_documents
FOR EACH ROW EXECUTE FUNCTION public.financial_document_audit();

-- 14. Realtime
ALTER TABLE public.financial_loan_applications REPLICA IDENTITY FULL;
ALTER TABLE public.financial_application_events REPLICA IDENTITY FULL;
ALTER TABLE public.financial_loan_documents REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_loan_applications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_application_events;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_loan_documents;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;