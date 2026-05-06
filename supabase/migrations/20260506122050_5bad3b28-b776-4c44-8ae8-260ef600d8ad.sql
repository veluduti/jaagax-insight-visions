CREATE OR REPLACE FUNCTION public.get_seller_contacts(_user_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text, email text, phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    u.id as user_id,
    COALESCE(sr.full_name, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email::text, '@', 1)) as full_name,
    COALESCE(sr.email, u.email::text) as email,
    COALESCE(sr.phone, u.raw_user_meta_data->>'phone', u.phone) as phone
  FROM auth.users u
  LEFT JOIN public.signup_requests sr ON sr.user_id = u.id
  WHERE u.id = ANY(_user_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_seller_contacts(uuid[]) TO authenticated;