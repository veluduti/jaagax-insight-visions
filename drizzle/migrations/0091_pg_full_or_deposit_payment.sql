ALTER TABLE public.partner_hotels ADD COLUMN pg_booking_deposit numeric;
ALTER TABLE public.hotel_long_stays ADD COLUMN payment_choice text, ADD COLUMN booking_total numeric, ADD COLUMN move_in_balance numeric NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION public.pg_save_payment_policy(_hotel_id uuid,_deposit numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_hotel_member(_hotel_id,auth.uid()),false) THEN RAISE EXCEPTION 'Property access denied'; END IF;
 IF _deposit IS NOT NULL AND (_deposit<1 OR _deposit>10000000 OR round(_deposit,2)<>_deposit) THEN RAISE EXCEPTION 'Enter a deposit between 1 and 10000000 rupees with at most two decimal places'; END IF;
 UPDATE partner_hotels SET pg_booking_deposit=_deposit WHERE id=_hotel_id; END $$;
REVOKE ALL ON FUNCTION public.pg_save_payment_policy(uuid,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pg_save_payment_policy(uuid,numeric) TO authenticated;
CREATE OR REPLACE FUNCTION public.pg_reserve_payment(_application_id uuid,_choice text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE l hotel_leads; result jsonb; s hotel_long_stays; total numeric; dep numeric; due numeric; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO l FROM hotel_leads WHERE id=_application_id AND customer_id=auth.uid() AND lead_type='application' AND stage='approved' FOR UPDATE;
 IF l.id IS NULL THEN RAISE EXCEPTION 'Application approval required'; END IF;
 IF _choice NOT IN('full','deposit') THEN RAISE EXCEPTION 'Choose full payment or booking deposit'; END IF;
 SELECT pg_booking_deposit INTO dep FROM partner_hotels WHERE id=l.hotel_id;
 IF _choice='deposit' AND dep IS NULL THEN RAISE EXCEPTION 'Booking deposit is not configured by the property'; END IF;
 result:=long_stay_reserve((l.journey->>'room_id')::uuid,(l.journey->>'move_in')::date,l.journey->>'plan',(l.journey->>'duration')::int,(l.journey->>'occupants')::int,l.name,l.phone,l.email,l.notes);
 IF result->>'ok'<>'true' THEN RETURN result; END IF;
 SELECT * INTO s FROM hotel_long_stays WHERE id=(result->>'stay_id')::uuid FOR UPDATE;
 IF s.razorpay_order_id IS NOT NULL OR s.payment_status='paid' THEN
 IF coalesce(s.payment_choice,'full')<>_choice THEN RAISE EXCEPTION 'Payment already started with a different option; finish it or wait for the hold to expire'; END IF;
 RETURN result||jsonb_build_object('payment_choice',s.payment_choice,'pay_now',s.amount_due,'balance',s.move_in_balance); END IF;
 total:=(s.quote->>'due_at_booking')::numeric; due:=CASE WHEN _choice='deposit' THEN least(dep,total) ELSE total END;
 UPDATE hotel_long_stays SET amount_due=due,payment_choice=_choice,booking_total=total,move_in_balance=total-due WHERE id=s.id;
 RETURN result||jsonb_build_object('payment_choice',_choice,'pay_now',due,'balance',total-due,'total',total); END $$;
REVOKE ALL ON FUNCTION public.pg_reserve_payment(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pg_reserve_payment(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.guard_pg_payment_amount() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF TG_OP='UPDATE' AND OLD.razorpay_order_id IS NOT NULL AND ROW(NEW.amount_due,NEW.booking_total,NEW.payment_choice) IS DISTINCT FROM ROW(OLD.amount_due,OLD.booking_total,OLD.payment_choice) THEN RAISE EXCEPTION 'Payment amount is frozen after checkout starts'; END IF;
 IF NEW.booking_total IS NOT NULL AND (NEW.amount_due<1 OR NEW.move_in_balance<0 OR NEW.amount_due+NEW.move_in_balance<>NEW.booking_total) THEN RAISE EXCEPTION 'Invalid booking payment split'; END IF; RETURN NEW; END $$;
CREATE TRIGGER guard_pg_payment_amount BEFORE INSERT OR UPDATE ON hotel_long_stays FOR EACH ROW EXECUTE FUNCTION public.guard_pg_payment_amount();