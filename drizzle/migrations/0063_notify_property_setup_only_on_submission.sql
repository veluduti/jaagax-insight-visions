CREATE OR REPLACE FUNCTION public.notify_hotel_application_submitted() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status<>'pending' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND OLD.status='pending' THEN RETURN NEW; END IF;
 IF NEW.user_id IS NOT NULL THEN INSERT INTO public.notifications(user_id,title,message,type,link) VALUES(NEW.user_id,'Application Received','We received your hotel partner application for '||NEW.hotel_name||'. Your documents are awaiting administrator review.','info',CASE WHEN NEW.setup_hotel_id IS NOT NULL THEN '/partners/property-setup?hotel='||NEW.setup_hotel_id ELSE '/hotels/partner/status' END); END IF;
 INSERT INTO public.notifications(user_id,title,message,type,link) SELECT DISTINCT s.user_id,'New Hotel Partner Application',NEW.hotel_name||' ('||NEW.city||') submitted an application for review.','alert','/admin' FROM public.admin_scopes s WHERE s.role='global_admin' AND s.is_active=true;
 RETURN NEW;
END $$;
CREATE TRIGGER hotel_setup_application_submitted AFTER UPDATE OF status ON public.hotel_partner_applications FOR EACH ROW EXECUTE FUNCTION public.notify_hotel_application_submitted();