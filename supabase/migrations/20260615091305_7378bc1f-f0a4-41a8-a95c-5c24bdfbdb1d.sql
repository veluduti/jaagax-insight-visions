
ALTER TABLE public.financial_providers
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.update_financial_loan_document_status(
  _document_id uuid, _status text, _notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_ok boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF _status NOT IN ('pending','verified','rejected','missing') THEN
    RAISE EXCEPTION 'Invalid status %', _status;
  END IF;
  SELECT EXISTS(
    SELECT 1 FROM public.financial_loan_documents d
    JOIN public.financial_loan_applications a ON a.id = d.application_id
    JOIN public.financial_providers fp ON fp.id = a.provider_id
    WHERE d.id = _document_id AND fp.user_id = v_uid
  ) INTO v_ok;
  IF NOT v_ok THEN RAISE EXCEPTION 'Not allowed'; END IF;
  UPDATE public.financial_loan_documents
    SET verified_status = _status, notes = COALESCE(_notes, notes),
        verified_by = v_uid, updated_at = now()
    WHERE id = _document_id;
END $$;

CREATE OR REPLACE FUNCTION public.purchase_financial_promotion(
  _package_type text, _amount numeric, _duration_days integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_provider public.financial_providers%ROWTYPE; v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  SELECT * INTO v_provider FROM public.financial_providers WHERE user_id = v_uid;
  IF v_provider.id IS NULL THEN RAISE EXCEPTION 'Provider profile missing'; END IF;
  IF _package_type NOT IN ('homepage_featured','top_search','preferred_partner','premium_badge') THEN
    RAISE EXCEPTION 'Invalid package %', _package_type;
  END IF;
  PERFORM public.decrement_wallet_balance(v_uid, _amount,
    'Financial promotion: ' || _package_type, 'fin_promo:' || _package_type);
  INSERT INTO public.financial_promotions(provider_id, package_type, amount, duration_days, end_date, is_active)
    VALUES (v_provider.id, _package_type, _amount, _duration_days,
            now() + (_duration_days || ' days')::interval, true)
    RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'promotion_id', v_id);
END $$;
