
-- Buyer preferred locations (with radius + notifications)
CREATE TABLE IF NOT EXISTS public.buyer_preferred_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT,
  locality TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  radius_km NUMERIC NOT NULL DEFAULT 5,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  last_notification_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_preferred_locations TO authenticated;
GRANT ALL ON public.buyer_preferred_locations TO service_role;
ALTER TABLE public.buyer_preferred_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_buyer_locations_select" ON public.buyer_preferred_locations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_buyer_locations_insert" ON public.buyer_preferred_locations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_buyer_locations_update" ON public.buyer_preferred_locations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_buyer_locations_delete" ON public.buyer_preferred_locations FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_bpl_updated_at BEFORE UPDATE ON public.buyer_preferred_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Unique referral code per user
CREATE TABLE IF NOT EXISTS public.buyer_referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.buyer_referral_codes TO authenticated;
GRANT ALL ON public.buyer_referral_codes TO service_role;
ALTER TABLE public.buyer_referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_referral_code_select" ON public.buyer_referral_codes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_referral_code_insert" ON public.buyer_referral_codes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Referral events / history
CREATE TABLE IF NOT EXISTS public.buyer_referral_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referee_name TEXT,
  source TEXT NOT NULL DEFAULT 'buyer', -- buyer | agent | property_post
  status TEXT NOT NULL DEFAULT 'pending', -- pending | completed
  reward_amount NUMERIC NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.buyer_referral_events TO authenticated;
GRANT ALL ON public.buyer_referral_events TO service_role;
ALTER TABLE public.buyer_referral_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_referral_events_select" ON public.buyer_referral_events FOR SELECT TO authenticated USING (auth.uid() = referrer_id OR auth.uid() = referee_id);
CREATE POLICY "own_referral_events_insert" ON public.buyer_referral_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = referrer_id);

-- Generate / fetch a stable referral code for the current user
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_code text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT code INTO v_code FROM public.buyer_referral_codes WHERE user_id = v_uid;
  IF v_code IS NOT NULL THEN RETURN v_code; END IF;
  v_code := 'JAAGA-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  INSERT INTO public.buyer_referral_codes(user_id, code) VALUES (v_uid, v_code)
    ON CONFLICT (user_id) DO UPDATE SET code = buyer_referral_codes.code
    RETURNING code INTO v_code;
  RETURN v_code;
END $$;
GRANT EXECUTE ON FUNCTION public.get_or_create_referral_code() TO authenticated;
