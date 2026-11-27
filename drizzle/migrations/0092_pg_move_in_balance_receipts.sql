ALTER TABLE hotel_long_stays ADD COLUMN move_in_balance_paid numeric NOT NULL DEFAULT 0, ADD COLUMN move_in_balance_receipt text;
CREATE OR REPLACE FUNCTION public.pg_collect_move_in_balance(_stay_id uuid,_receipt text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE s hotel_long_stays; BEGIN
 SELECT * INTO s FROM hotel_long_stays WHERE id=_stay_id FOR UPDATE;
 IF s.id IS NULL OR auth.uid() IS NULL OR NOT coalesce(public.is_hotel_member(s.hotel_id,auth.uid()),false) THEN RAISE EXCEPTION 'Property access denied'; END IF;
 IF s.status<>'active' OR s.payment_status<>'paid' OR s.move_in_balance<=0 OR length(trim(coalesce(_receipt,''))) NOT BETWEEN 3 AND 200 THEN RAISE EXCEPTION 'Confirmed booking and collection receipt required'; END IF;
 UPDATE hotel_long_stays SET move_in_balance_paid=move_in_balance,move_in_balance_receipt=trim(_receipt),timeline=timeline||jsonb_build_array(jsonb_build_object('at',now(),'label','Move-in balance collected','amount',move_in_balance,'receipt',_receipt,'by',auth.uid())) WHERE id=s.id;
 INSERT INTO notifications(user_id,title,message,type,link) VALUES(s.user_id,'Move-in balance received','The property recorded your move-in balance payment','booking','/my-trips'); END $$;
REVOKE ALL ON FUNCTION public.pg_collect_move_in_balance(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pg_collect_move_in_balance(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.guard_pg_payment_amount() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF TG_OP='UPDATE' AND OLD.razorpay_order_id IS NOT NULL AND ROW(NEW.amount_due,NEW.booking_total,NEW.payment_choice,NEW.move_in_balance) IS DISTINCT FROM ROW(OLD.amount_due,OLD.booking_total,OLD.payment_choice,OLD.move_in_balance) THEN RAISE EXCEPTION 'Payment amount is frozen after checkout starts'; END IF;
 IF NEW.booking_total IS NOT NULL AND (NEW.amount_due<1 OR NEW.move_in_balance<0 OR NEW.amount_due+NEW.move_in_balance<>NEW.booking_total) THEN RAISE EXCEPTION 'Invalid booking payment split'; END IF;
 IF NEW.move_in_balance_paid<0 OR NEW.move_in_balance_paid>NEW.move_in_balance THEN RAISE EXCEPTION 'Invalid move-in collection'; END IF;
 IF TG_OP='UPDATE' AND NEW.move_in_balance_paid IS DISTINCT FROM OLD.move_in_balance_paid THEN
 IF NOT coalesce(public.is_hotel_member(NEW.hotel_id,auth.uid()),false) OR length(trim(coalesce(NEW.move_in_balance_receipt,'')))<3 THEN RAISE EXCEPTION 'Property owner and receipt required for balance collection'; END IF; END IF;
 IF NEW.resident_access_active AND NEW.move_in_balance_paid<NEW.move_in_balance THEN RAISE EXCEPTION 'Collect the move-in balance before activating resident access'; END IF;
 RETURN NEW; END $$;