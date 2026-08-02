-- 1. Widen crm_notes type/status checks to match the app
ALTER TABLE public.crm_notes DROP CONSTRAINT IF EXISTS crm_notes_type_check;
ALTER TABLE public.crm_notes ADD CONSTRAINT crm_notes_type_check
  CHECK (type = ANY (ARRAY['note','task','follow_up','reminder','call','meeting']));

ALTER TABLE public.crm_notes DROP CONSTRAINT IF EXISTS crm_notes_status_check;
ALTER TABLE public.crm_notes ADD CONSTRAINT crm_notes_status_check
  CHECK (status = ANY (ARRAY['open','in_progress','active','completed','cancelled','archived']));

-- 2. Widen team_members role check
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_role_check;
ALTER TABLE public.team_members ADD CONSTRAINT team_members_role_check
  CHECK (role = ANY (ARRAY['admin','manager','agent','sales','support','viewer']));

-- 3. Secure email -> user id lookup for team invites
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_user_id_by_email(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO authenticated;