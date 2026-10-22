CREATE OR REPLACE FUNCTION public.guard_hotel_coupon_management() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF auth.role()='authenticated' AND pg_trigger_depth()=1 THEN
   IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Only JaagaX Admin may manage coupons'; END IF;
   IF TG_OP='INSERT' THEN NEW.uses_count:=0; NEW.created_by:=auth.uid();
   ELSIF NEW.uses_count IS DISTINCT FROM OLD.uses_count THEN RAISE EXCEPTION 'Coupon usage is managed by checkout'; END IF;
 END IF;
 NEW.updated_at:=now(); RETURN NEW;
END $$;