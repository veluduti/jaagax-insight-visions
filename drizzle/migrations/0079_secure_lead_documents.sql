CREATE TABLE public.hotel_lead_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lead_id uuid NOT NULL REFERENCES public.hotel_leads(id) ON DELETE CASCADE,
 document_key text NOT NULL CHECK (document_key IN ('id','address','photo','employment','agreement','company')),
 storage_path text NOT NULL UNIQUE, file_name text NOT NULL CHECK (length(file_name) BETWEEN 1 AND 200),
 mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp','application/pdf')),
 file_size bigint NOT NULL CHECK (file_size BETWEEN 1 AND 10485760),
 status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded','verified','rejected')),
 review_note text NOT NULL DEFAULT '' CHECK (length(review_note)<=1000), uploaded_by uuid NOT NULL DEFAULT auth.uid(),
 reviewed_by uuid, reviewed_at timestamptz, status_history jsonb NOT NULL DEFAULT '[]'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.hotel_lead_documents TO authenticated;
GRANT ALL ON public.hotel_lead_documents TO service_role;
ALTER TABLE public.hotel_lead_documents ENABLE ROW LEVEL SECURITY;
CREATE INDEX hotel_lead_documents_lead_idx ON public.hotel_lead_documents(lead_id,created_at);
CREATE POLICY "property members read lead documents" ON public.hotel_lead_documents FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.hotel_leads l WHERE l.id=lead_id AND public.is_hotel_member(l.hotel_id,auth.uid())));
CREATE POLICY "property members add lead documents" ON public.hotel_lead_documents FOR INSERT TO authenticated WITH CHECK (uploaded_by=auth.uid() AND EXISTS (SELECT 1 FROM public.hotel_leads l WHERE l.id=lead_id AND public.is_hotel_member(l.hotel_id,auth.uid())));
CREATE POLICY "property members review lead documents" ON public.hotel_lead_documents FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.hotel_leads l WHERE l.id=lead_id AND public.is_hotel_member(l.hotel_id,auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM public.hotel_leads l WHERE l.id=lead_id AND public.is_hotel_member(l.hotel_id,auth.uid())));
CREATE OR REPLACE FUNCTION public.can_access_lead_document(_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (SELECT 1 FROM public.hotel_leads l WHERE l.hotel_id::text=split_part(_path,'/',1) AND l.id::text=split_part(_path,'/',2) AND public.is_hotel_member(l.hotel_id,auth.uid()) AND _path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$');
$$;
REVOKE ALL ON FUNCTION public.can_access_lead_document(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_access_lead_document(text) TO authenticated;
CREATE POLICY "members upload private lead files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='lead-documents' AND public.can_access_lead_document(name));
CREATE POLICY "members preview private lead files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='lead-documents' AND public.can_access_lead_document(name));
CREATE POLICY "members remove unlinked lead uploads" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='lead-documents' AND public.can_access_lead_document(name) AND NOT EXISTS (SELECT 1 FROM public.hotel_lead_documents d WHERE d.storage_path=name));
CREATE OR REPLACE FUNCTION public.guard_hotel_lead_document() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE h uuid; m jsonb; expected_path text;
BEGIN
 SELECT hotel_id INTO h FROM public.hotel_leads WHERE id=NEW.lead_id FOR UPDATE;
 IF h IS NULL OR NOT public.is_hotel_member(h,auth.uid()) THEN RAISE EXCEPTION 'Document access denied' USING ERRCODE='42501'; END IF;
 IF TG_OP='INSERT' THEN
  expected_path := h::text||'/'||NEW.lead_id::text||'/'||NEW.id::text||(CASE NEW.mime_type WHEN 'image/jpeg' THEN '.jpg' WHEN 'image/png' THEN '.png' WHEN 'image/webp' THEN '.webp' ELSE '.pdf' END);
  IF NEW.storage_path <> expected_path THEN RAISE EXCEPTION 'Invalid document path'; END IF;
  SELECT metadata INTO m FROM storage.objects WHERE bucket_id='lead-documents' AND name=NEW.storage_path;
  IF m IS NULL OR (m->>'size')::bigint IS DISTINCT FROM NEW.file_size OR m->>'mimetype' IS DISTINCT FROM NEW.mime_type THEN RAISE EXCEPTION 'Upload a valid document before saving'; END IF;
  NEW.status:='uploaded'; NEW.review_note:=''; NEW.uploaded_by:=auth.uid(); NEW.reviewed_by:=NULL; NEW.reviewed_at:=NULL; NEW.created_at:=now();
  NEW.status_history:=jsonb_build_array(jsonb_build_object('status','uploaded','at',now(),'by',auth.uid(),'note',''));
 ELSE
  IF ROW(NEW.id,NEW.lead_id,NEW.document_key,NEW.storage_path,NEW.file_name,NEW.mime_type,NEW.file_size,NEW.uploaded_by,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.lead_id,OLD.document_key,OLD.storage_path,OLD.file_name,OLD.mime_type,OLD.file_size,OLD.uploaded_by,OLD.created_at) THEN RAISE EXCEPTION 'Document file details cannot be changed'; END IF;
  NEW.status_history:=OLD.status_history; NEW.reviewed_by:=OLD.reviewed_by; NEW.reviewed_at:=OLD.reviewed_at;
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.review_note IS DISTINCT FROM OLD.review_note THEN
   IF NEW.status='rejected' AND length(trim(NEW.review_note))=0 THEN RAISE EXCEPTION 'Add a reason for rejecting this document'; END IF;
   NEW.reviewed_by:=auth.uid(); NEW.reviewed_at:=now();
   NEW.status_history:=OLD.status_history||jsonb_build_array(jsonb_build_object('status',NEW.status,'at',now(),'by',auth.uid(),'note',NEW.review_note));
  END IF;
 END IF;
 NEW.updated_at:=now(); RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_hotel_lead_document() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_hotel_lead_document BEFORE INSERT OR UPDATE ON public.hotel_lead_documents FOR EACH ROW EXECUTE FUNCTION public.guard_hotel_lead_document();
CREATE OR REPLACE FUNCTION public.sync_hotel_lead_document_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s text;
BEGIN
 IF TG_OP='UPDATE' AND NEW.status=OLD.status AND NEW.review_note=OLD.review_note THEN RETURN NEW; END IF;
 SELECT status INTO s FROM public.hotel_lead_documents WHERE lead_id=NEW.lead_id AND document_key=NEW.document_key ORDER BY created_at DESC,id DESC LIMIT 1;
 UPDATE public.hotel_leads SET verification=coalesce(verification,'{}'::jsonb)||jsonb_build_object(NEW.document_key,s), timeline=coalesce(timeline,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('at',now(),'label','Document '||NEW.document_key||': '||NEW.status,'note',NEW.file_name)) WHERE id=NEW.lead_id;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_hotel_lead_document_status() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sync_hotel_lead_document_status AFTER INSERT OR UPDATE ON public.hotel_lead_documents FOR EACH ROW EXECUTE FUNCTION public.sync_hotel_lead_document_status();