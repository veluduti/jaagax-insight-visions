CREATE OR REPLACE FUNCTION public.can_edit_property_pricing(_property uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT _user IS NOT NULL AND public.property_pricing_public(_property) AND EXISTS(
 SELECT 1 FROM public.properties p LEFT JOIN public.builder_profiles b ON b.id=p.builder_id
 WHERE p.id=_property AND (p.submitted_by=_user OR b.user_id=_user OR EXISTS(
 SELECT 1 FROM public.agents a WHERE a.user_id=_user AND
 (a.id=p.assigned_agent_id AND coalesce(p.agent_assignment_status::text,'') NOT IN ('rejected','cancelled') OR EXISTS(
 SELECT 1 FROM public.assigned_agents aa WHERE aa.property_id=p.id AND aa.agent_id=a.id AND aa.status IN ('accepted','active','assigned'))))))
$$;
CREATE OR REPLACE FUNCTION public.list_pricing_properties()
RETURNS TABLE(id uuid,title text,type text,area_sqft numeric,price numeric,city text,creator_user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT p.id,p.title,p.type,p.area_sqft::numeric,p.price::numeric,p.city,public.property_pricing_creator(p.id)
 FROM public.properties p WHERE auth.uid() IS NOT NULL AND public.property_pricing_public(p.id)
 AND (public.can_edit_property_pricing(p.id,auth.uid()) OR public.is_global_admin(auth.uid()))
 ORDER BY p.created_at DESC LIMIT 500
$$;
CREATE OR REPLACE FUNCTION public.guard_property_pricing_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF TG_OP='INSERT' OR (TG_OP='UPDATE' AND NEW.status='approved' AND OLD.status IS DISTINCT FROM NEW.status) THEN
  PERFORM 1 FROM public.properties WHERE id=NEW.property_id FOR UPDATE;
  IF NOT public.property_pricing_public(NEW.property_id) THEN
   RAISE EXCEPTION 'The property must receive final admin approval before adding or approving pricing';
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER property_pricing_requires_approved_property BEFORE INSERT OR UPDATE ON public.property_pricing_revisions FOR EACH ROW EXECUTE FUNCTION public.guard_property_pricing_approval();
REVOKE ALL ON FUNCTION public.guard_property_pricing_approval() FROM PUBLIC, anon, authenticated;
