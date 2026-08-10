CREATE OR REPLACE FUNCTION public.decrement_wallet_balance(_user_id uuid, _amount numeric, _description text DEFAULT NULL, _reference text DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_balance numeric; current_balance numeric; v_wallet_id uuid;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  SELECT id, balance INTO v_wallet_id, current_balance FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF current_balance IS NULL OR current_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;
  UPDATE public.wallets SET balance = balance - _amount, updated_at = now()
    WHERE id = v_wallet_id RETURNING balance INTO new_balance;
  INSERT INTO public.wallet_transactions(wallet_id, user_id, amount, type, category, description, status, reference_id, balance)
    VALUES (v_wallet_id, _user_id, _amount, 'debit', 'purchase', _description, 'completed', _reference, new_balance);
  RETURN new_balance;
END;
$$;