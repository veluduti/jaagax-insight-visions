CREATE TABLE public.hotel_price_markups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 scope text NOT NULL,
 hotel_id uuid REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
 percentage numeric(9,4) NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid,
 CONSTRAINT hotel_markup_scope CHECK ((scope='global' AND hotel_id IS NULL) OR (scope='hotel' AND hotel_id IS NOT NULL)),
 CONSTRAINT hotel_markup_percentage CHECK (percentage >= 0 AND percentage < 100000 AND percentage <> 'NaN'::numeric)
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.hotel_price_markups TO authenticated;
GRANT ALL ON public.hotel_price_markups TO service_role;
ALTER TABLE public.hotel_price_markups ENABLE ROW LEVEL SECURITY;
CREATE POLICY global_admin_markups ON public.hotel_price_markups FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE UNIQUE INDEX hotel_markup_global_unique ON public.hotel_price_markups(scope) WHERE scope='global';
CREATE UNIQUE INDEX hotel_markup_hotel_unique ON public.hotel_price_markups(hotel_id) WHERE scope='hotel';
CREATE TABLE public.hotel_price_markup_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), scope text NOT NULL, hotel_id uuid,
 old_percentage numeric, new_percentage numeric, actor_id uuid, changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hotel_price_markup_audit TO authenticated;
GRANT ALL ON public.hotel_price_markup_audit TO service_role;
ALTER TABLE public.hotel_price_markup_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY global_admin_markup_audit ON public.hotel_price_markup_audit FOR SELECT TO authenticated USING(public.is_admin(auth.uid()));
CREATE FUNCTION public.audit_hotel_markup() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  INSERT INTO public.hotel_price_markup_audit(scope,hotel_id,old_percentage,actor_id) VALUES(OLD.scope,OLD.hotel_id,OLD.percentage,auth.uid());
  RETURN OLD;
 END IF;
 NEW.updated_at=now(); NEW.updated_by=auth.uid();
 INSERT INTO public.hotel_price_markup_audit(scope,hotel_id,old_percentage,new_percentage,actor_id) VALUES(NEW.scope,NEW.hotel_id,CASE WHEN TG_OP='UPDATE' THEN OLD.percentage ELSE NULL END,NEW.percentage,auth.uid());
 RETURN NEW;
END $$;
CREATE TRIGGER hotel_markup_audit BEFORE INSERT OR UPDATE OR DELETE ON public.hotel_price_markups FOR EACH ROW EXECUTE FUNCTION public.audit_hotel_markup();
CREATE FUNCTION public.effective_hotel_markup(_hotel_id uuid) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT COALESCE((SELECT percentage FROM hotel_price_markups WHERE hotel_id=_hotel_id AND scope='hotel'),(SELECT percentage FROM hotel_price_markups WHERE scope='global'),0)
$$;
REVOKE ALL ON FUNCTION public.effective_hotel_markup(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.effective_hotel_markup(uuid) TO service_role;
CREATE FUNCTION public.hotel_public_markup_rates() RETURNS TABLE(hotel_id uuid,percentage numeric) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT h.id,public.effective_hotel_markup(h.id) FROM partner_hotels h WHERE h.is_active=true OR public.is_admin(auth.uid())
$$;
REVOKE ALL ON FUNCTION public.hotel_public_markup_rates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hotel_public_markup_rates() TO anon,authenticated,service_role;
CREATE FUNCTION public.set_hotel_price_markup(_hotel_id uuid,_percentage numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Global administrator access required' USING ERRCODE='42501'; END IF;
 IF _percentage IS NOT NULL AND (_percentage < 0 OR _percentage >= 100000 OR _percentage = 'NaN'::numeric) THEN RAISE EXCEPTION 'Enter a valid non-negative markup percentage'; END IF;
 IF _hotel_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM partner_hotels WHERE id=_hotel_id) THEN RAISE EXCEPTION 'Hotel not found'; END IF;
 IF _percentage IS NULL THEN
  DELETE FROM hotel_price_markups WHERE (_hotel_id IS NULL AND scope='global') OR (scope='hotel' AND hotel_id=_hotel_id);
 ELSIF _hotel_id IS NULL THEN
  INSERT INTO hotel_price_markups(scope,percentage) VALUES('global',_percentage) ON CONFLICT(scope) WHERE scope='global' DO UPDATE SET percentage=excluded.percentage;
 ELSE
  INSERT INTO hotel_price_markups(scope,hotel_id,percentage) VALUES('hotel',_hotel_id,_percentage) ON CONFLICT(hotel_id) WHERE scope='hotel' DO UPDATE SET percentage=excluded.percentage;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_hotel_price_markup(uuid,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_hotel_price_markup(uuid,numeric) TO authenticated;
CREATE OR REPLACE FUNCTION public.long_stay_quote(_room_id uuid, _plan text, _duration integer, _occupants integer DEFAULT 1)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE r hotel_rooms; a jsonb; wk numeric; mo numeric; per numeric; extras numeric; util numeric;
 mode text; adv numeric; dep numeric; fees numeric; taxp numeric; first numeric; tax numeric; n int; occ int; mult int; f numeric; markup numeric;
BEGIN
 SELECT * INTO r FROM hotel_rooms WHERE id=_room_id;
 IF r.id IS NULL THEN RAISE EXCEPTION 'Room not found'; END IF;
 IF _plan NOT IN ('weekly','monthly') THEN RAISE EXCEPTION 'Choose weekly or monthly'; END IF;
 a:=COALESCE(r.attributes,'{}'::jsonb);
 markup:=public.effective_hotel_markup(r.hotel_id);
 wk:=round(GREATEST(COALESCE(r.weekly_price,0),0)*(1+markup/100),2);
 mo:=round(GREATEST(COALESCE(r.monthly_price,0),0)*(1+markup/100),2);
 IF mo=0 AND wk>0 THEN mo:=round(wk*52/12,2); END IF;
 per:=CASE WHEN _plan='monthly' THEN mo ELSE wk END;
 IF per<=0 THEN RAISE EXCEPTION 'This % plan is not offered',_plan; END IF;
 n:=GREATEST(COALESCE(_duration,1),1);
 IF _plan='monthly' AND n<COALESCE(NULLIF(a->>'min_months','')::numeric,0) THEN RAISE EXCEPTION 'Minimum stay is % months',a->>'min_months'; END IF;
 IF n>60 THEN RAISE EXCEPTION 'Duration too long'; END IF;
 occ:=GREATEST(COALESCE(_occupants,1),1); mult:=CASE WHEN r.stay_unit='bed' THEN occ ELSE 1 END;
 f:=0;
 util:=GREATEST(COALESCE(NULLIF(a->>'utility_charges','')::numeric,0),0)+GREATEST(COALESCE(NULLIF(a->>'food_charges','')::numeric,0),0)+GREATEST(COALESCE(NULLIF(a->>'service_charges','')::numeric,0),0);
 extras:=CASE WHEN _plan='monthly' THEN util ELSE round(util*12/52,2) END;
 mode:=lower(COALESCE(a->>'advance_mode',''));
 adv:=CASE WHEN mode LIKE 'fixed%' THEN GREATEST(COALESCE(NULLIF(a->>'advance_amount','')::numeric,0),0) WHEN mode LIKE 'one%' THEN mo WHEN mode LIKE 'two%' THEN mo*2 ELSE 0 END;
 dep:=GREATEST(COALESCE(NULLIF(a->>'security_deposit','')::numeric,0),0);
 fees:=GREATEST(COALESCE(NULLIF(a->>'other_fees','')::numeric,0),0);
 taxp:=LEAST(GREATEST(COALESCE(NULLIF(a->>'tax_percent','')::numeric,0),0),28);
 first:=round((per+extras)*mult,2); tax:=round((first+fees)*taxp/100,2);
 adv:=round(adv*mult,2); dep:=round(dep*mult,2);
 RETURN jsonb_build_object('plan',_plan,'duration',n,'occupants',occ,'weekly',wk,'monthly',mo,'markup_percentage',markup,'period_rent',round(per*mult,2),'extras',round(extras*mult,2),'one_time_fees',fees,'tax_percent',taxp,'tax',tax,'advance',adv,'deposit',dep,'due_at_booking',round(first+fees+tax+adv+dep,2),'recurring',round(first*(1+taxp/100),2),'currency','INR');
END $$;