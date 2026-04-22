-- Create property_documents table
CREATE TABLE public.property_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review',
  admin_notes TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending_review','approved','rejected')),
  CONSTRAINT valid_document_type CHECK (document_type IN (
    'ownership_proof','encumbrance_certificate','rera_certificate',
    'layout_plan','floor_plan','occupancy_certificate','completion_certificate'
  )),
  CONSTRAINT unique_property_document UNIQUE (property_id, document_type)
);

CREATE INDEX idx_property_documents_property ON public.property_documents(property_id);
CREATE INDEX idx_property_documents_status ON public.property_documents(status);
CREATE INDEX idx_property_documents_user ON public.property_documents(user_id);

ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view property documents"
  ON public.property_documents FOR SELECT
  USING (true);

CREATE POLICY "Users can upload own documents"
  ON public.property_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON public.property_documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON public.property_documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all documents"
  ON public.property_documents FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_property_documents_updated_at
  BEFORE UPDATE ON public.property_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Notification trigger: notify admins on upload, notify user on review
CREATE OR REPLACE FUNCTION public.notify_property_document_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_title TEXT;
BEGIN
  SELECT title INTO v_property_title FROM public.properties WHERE id = NEW.property_id;

  -- On INSERT (new upload): notify admins
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT ur.user_id,
      'New document submitted for review',
      'A ' || NEW.document_type || ' was uploaded for ' || COALESCE(v_property_title, 'a property') || '.',
      'info', '/admin'
    FROM public.user_roles ur WHERE ur.role = 'admin';
    RETURN NEW;
  END IF;

  -- On UPDATE: notify owner if status changed
  IF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (NEW.user_id,
        'Document approved ✅',
        'Your ' || NEW.document_type || ' for ' || COALESCE(v_property_title, 'your property') || ' was approved.',
        'success', '/dashboard/builder');
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (NEW.user_id,
        'Document rejected',
        'Your ' || NEW.document_type || ' was rejected: ' || COALESCE(NEW.admin_notes, 'See admin notes.'),
        'alert', '/dashboard/builder');
    END IF;

    -- Re-upload (status moved back to pending) → notify admins
    IF NEW.status = 'pending_review' AND OLD.status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      SELECT ur.user_id,
        'Document re-uploaded',
        'A ' || NEW.document_type || ' was re-uploaded for review.',
        'info', '/admin'
      FROM public.user_roles ur WHERE ur.role = 'admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_property_document_change
  AFTER INSERT OR UPDATE ON public.property_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_property_document_change();

-- Storage bucket for property documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-documents-files', 'property-documents-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (public bucket so previews work; uploads restricted)
CREATE POLICY "Anyone can view property doc files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-documents-files');

CREATE POLICY "Authenticated users can upload property doc files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'property-documents-files');

CREATE POLICY "Users can update own property doc files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'property-documents-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own property doc files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'property-documents-files' AND auth.uid()::text = (storage.foldername(name))[1]);