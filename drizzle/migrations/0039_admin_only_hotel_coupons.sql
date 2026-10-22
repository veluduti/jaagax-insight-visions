CREATE TABLE public.hotel_coupons (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE,
 scope text NOT NULL DEFAULT 'global' CHECK(scope IN ('global','hotel')),
 hotel_id uuid REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
 description text NOT NULL DEFAULT '', discount_type text NOT NULL DEFAULT 'percent' CHECK(discount_type IN ('percent','flat')),
 discount_value numeric NOT NULL DEFAULT 10 CHECK(discount_value > 0 AND (discount_type <> 'percent' OR discount_value <= 100)),
 max_discount numeric CHECK(max_discount > 0), min_booking_amount numeric NOT NULL DEFAULT 0 CHECK(min_booking_amount >= 0),
 min_nights integer NOT NULL DEFAULT 1 CHECK(min_nights >= 1), max_nights integer CHECK(max_nights >= min_nights),
 valid_from date, valid_until date, stay_from date, stay_until date,
 max_uses integer CHECK(max_uses > 0), uses_count integer NOT NULL DEFAULT 0,
 eligible_hotel_ids uuid[] NOT NULL DEFAULT '{}', applicable_room_ids uuid[] NOT NULL DEFAULT '{}',
 is_active boolean NOT NULL DEFAULT true, created_by uuid DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((scope='global' AND hotel_id IS NULL) OR (scope='hotel' AND hotel_id IS NOT NULL)),
 CHECK(valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from),
 CHECK(stay_until IS NULL OR stay_from IS NULL OR stay_until >= stay_from),
 CHECK(code = upper(trim(code)) AND code ~ '^[A-Z0-9_-]{3,30}$')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_coupons TO authenticated;
GRANT ALL ON public.hotel_coupons TO service_role;
ALTER TABLE public.hotel_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "JaagaX admin manages coupons" ON public.hotel_coupons FOR ALL TO authenticated USING(public.is_admin(auth.uid())) WITH CHECK(public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "team manages promos" ON public.hotel_promo_codes;
DROP POLICY IF EXISTS "public read active promos" ON public.hotel_promo_codes;
CREATE POLICY "JaagaX admin manages legacy coupons" ON public.hotel_promo_codes FOR ALL TO authenticated USING(public.is_admin(auth.uid())) WITH CHECK(public.is_admin(auth.uid()));
COMMENT ON TABLE public.hotel_promo_codes IS 'DEPRECATED: replaced by admin-only hotel_coupons; legacy codes are not redeemable.';
ALTER TABLE public.hotel_bookings ADD COLUMN coupon_id uuid REFERENCES public.hotel_coupons(id) ON DELETE RESTRICT;
ALTER TABLE public.hotel_bookings ADD COLUMN coupon_room_ids uuid[] NOT NULL DEFAULT '{}';
CREATE OR REPLACE FUNCTION public.validate_hotel_coupon(_code text,_hotel_id uuid,_room_ids uuid[],_check_in date,_check_out date,_room_total numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.hotel_coupons; n integer; d numeric;
BEGIN
 SELECT * INTO c FROM public.hotel_coupons WHERE code=upper(trim(_code));
 IF NOT FOUND OR NOT c.is_active THEN RAISE EXCEPTION 'Coupon is invalid or inactive'; END IF;
 IF _hotel_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.partner_hotels WHERE id=_hotel_id AND is_active) THEN RAISE EXCEPTION 'Hotel is not eligible for this coupon'; END IF;
 IF (c.scope='hotel' AND c.hotel_id<>_hotel_id) OR (cardinality(c.eligible_hotel_ids)>0 AND NOT _hotel_id=ANY(c.eligible_hotel_ids)) THEN RAISE EXCEPTION 'Coupon does not apply to this hotel'; END IF;
 IF (c.valid_from IS NOT NULL AND current_date<c.valid_from) OR (c.valid_until IS NOT NULL AND current_date>c.valid_until) THEN RAISE EXCEPTION 'Coupon is expired or not yet valid'; END IF;
 IF c.max_uses IS NOT NULL AND c.uses_count>=c.max_uses THEN RAISE EXCEPTION 'Coupon usage limit reached'; END IF;
 n:=_check_out-_check_in;
 IF n IS NULL OR n<c.min_nights OR (c.max_nights IS NOT NULL AND n>c.max_nights) OR _check_in<current_date THEN RAISE EXCEPTION 'Stay does not meet coupon booking conditions'; END IF;
 IF (c.stay_from IS NOT NULL AND _check_in<c.stay_from) OR (c.stay_until IS NOT NULL AND _check_out>c.stay_until) THEN RAISE EXCEPTION 'Stay dates are outside coupon conditions'; END IF;
 IF _room_total IS NULL OR _room_total<c.min_booking_amount THEN RAISE EXCEPTION 'Booking amount does not meet coupon minimum'; END IF;
 IF coalesce(cardinality(_room_ids),0)=0 OR EXISTS(SELECT 1 FROM unnest(_room_ids) r WHERE NOT EXISTS(SELECT 1 FROM public.hotel_rooms h WHERE h.id=r AND h.hotel_id=_hotel_id)) OR (cardinality(c.applicable_room_ids)>0 AND NOT _room_ids<@c.applicable_room_ids) THEN RAISE EXCEPTION 'Coupon does not apply to these rooms'; END IF;
 d:=least(_room_total,round(CASE WHEN c.discount_type='percent' THEN _room_total*c.discount_value/100 ELSE c.discount_value END,2));
 IF c.max_discount IS NOT NULL THEN d:=least(d,c.max_discount); END IF;
 RETURN jsonb_build_object('id',c.id,'code',c.code,'discount',d);
END $$;
REVOKE ALL ON FUNCTION public.validate_hotel_coupon(text,uuid,uuid[],date,date,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.validate_hotel_coupon(text,uuid,uuid[],date,date,numeric) TO service_role;
CREATE OR REPLACE FUNCTION public.guard_hotel_coupon_booking() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v jsonb; c public.hotel_coupons;
BEGIN
 IF TG_OP='INSERT' THEN
   IF NEW.coupon_id IS NULL AND nullif(trim(NEW.promo_code),'') IS NULL THEN RETURN NEW; END IF;
   IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Coupons must be applied through secure hotel checkout'; END IF;
   SELECT * INTO c FROM public.hotel_coupons WHERE code=upper(trim(NEW.promo_code)) FOR UPDATE;
   v:=public.validate_hotel_coupon(NEW.promo_code,NEW.hotel_id,NEW.coupon_room_ids,NEW.check_in,NEW.check_out,NEW.room_charges);
   IF NEW.discount_total IS DISTINCT FROM (v->>'discount')::numeric THEN RAISE EXCEPTION 'Coupon discount must match validated amount'; END IF;
   NEW.coupon_id:=(v->>'id')::uuid; NEW.promo_code:=v->>'code';
   IF NEW.status NOT IN ('cancelled','failed') THEN UPDATE public.hotel_coupons SET uses_count=uses_count+1 WHERE id=NEW.coupon_id; END IF;
   RETURN NEW;
 END IF;
 IF TG_OP='DELETE' THEN
   IF OLD.coupon_id IS NOT NULL AND OLD.status NOT IN ('cancelled','failed') THEN UPDATE public.hotel_coupons SET uses_count=greatest(0,uses_count-1) WHERE id=OLD.coupon_id; END IF;
   RETURN OLD;
 END IF;
 IF OLD.coupon_id IS NOT NULL THEN
   IF NEW.coupon_id IS DISTINCT FROM OLD.coupon_id OR NEW.promo_code IS DISTINCT FROM OLD.promo_code OR NEW.discount_total IS DISTINCT FROM OLD.discount_total OR NEW.hotel_id IS DISTINCT FROM OLD.hotel_id OR NEW.check_in IS DISTINCT FROM OLD.check_in OR NEW.check_out IS DISTINCT FROM OLD.check_out OR NEW.coupon_room_ids IS DISTINCT FROM OLD.coupon_room_ids OR NEW.room_charges IS DISTINCT FROM OLD.room_charges THEN RAISE EXCEPTION 'Coupon booking terms are frozen; create a new booking'; END IF;
   IF OLD.status NOT IN ('cancelled','failed') AND NEW.status IN ('cancelled','failed') THEN UPDATE public.hotel_coupons SET uses_count=greatest(0,uses_count-1) WHERE id=OLD.coupon_id;
   ELSIF OLD.status IN ('cancelled','failed') AND NEW.status NOT IN ('cancelled','failed') THEN RAISE EXCEPTION 'Cancelled coupon bookings cannot be reactivated'; END IF;
 ELSIF NEW.coupon_id IS NOT NULL OR NEW.promo_code IS DISTINCT FROM OLD.promo_code THEN RAISE EXCEPTION 'Coupon can only be applied at checkout'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_hotel_coupon_booking BEFORE INSERT OR UPDATE OR DELETE ON public.hotel_bookings FOR EACH ROW EXECUTE FUNCTION public.guard_hotel_coupon_booking();
CREATE OR REPLACE FUNCTION public.guard_hotel_coupon_management() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF auth.role()='authenticated' THEN
 IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Only JaagaX Admin may manage coupons'; END IF;
 IF TG_OP='INSERT' THEN NEW.uses_count:=0; NEW.created_by:=auth.uid();
 ELSIF NEW.uses_count IS DISTINCT FROM OLD.uses_count THEN RAISE EXCEPTION 'Coupon usage is managed by checkout'; END IF;
 END IF;
 NEW.updated_at:=now(); RETURN NEW;
END $$;
CREATE TRIGGER guard_hotel_coupon_management BEFORE INSERT OR UPDATE ON public.hotel_coupons FOR EACH ROW EXECUTE FUNCTION public.guard_hotel_coupon_management();