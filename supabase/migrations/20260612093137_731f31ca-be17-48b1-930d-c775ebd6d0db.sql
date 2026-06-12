
-- Restrict new SECURITY DEFINER functions to authenticated callers
REVOKE EXECUTE ON FUNCTION public.increment_wallet_balance(uuid, numeric, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decrement_wallet_balance(uuid, numeric, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_and_consume_posting_quota(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_posting_quota_status(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_property_sold(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.drop_property_price(uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_kyc(text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.review_kyc(uuid, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.increment_wallet_balance(uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_wallet_balance(uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_consume_posting_quota(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_posting_quota_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_property_sold(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.drop_property_price(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_kyc(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_kyc(uuid, text, text) TO authenticated;

-- KYC storage policies (per-user folder)
CREATE POLICY "kyc_user_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "kyc_admin_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND public.is_admin(auth.uid()));
CREATE POLICY "kyc_user_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "kyc_user_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "kyc_user_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
