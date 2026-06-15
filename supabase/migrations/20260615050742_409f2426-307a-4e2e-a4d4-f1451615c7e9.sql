
-- =========================================================
-- cashback_earnings
-- =========================================================
CREATE TABLE IF NOT EXISTS public.cashback_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  reference_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  credited_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cashback_earnings TO authenticated;
GRANT ALL ON public.cashback_earnings TO service_role;
ALTER TABLE public.cashback_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own cashback" ON public.cashback_earnings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own cashback" ON public.cashback_earnings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own cashback" ON public.cashback_earnings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_cashback_updated_at BEFORE UPDATE ON public.cashback_earnings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- financial_enquiries
-- =========================================================
CREATE TABLE IF NOT EXISTS public.financial_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_type TEXT NOT NULL,
  amount_requested NUMERIC(12,2),
  property_id UUID,
  status TEXT NOT NULL DEFAULT 'applied',
  documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  advisor_id UUID REFERENCES auth.users(id),
  notes TEXT,
  deactivated_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_enquiries TO authenticated;
GRANT ALL ON public.financial_enquiries TO service_role;
ALTER TABLE public.financial_enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own enquiries" ON public.financial_enquiries
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users create own enquiries" ON public.financial_enquiries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own enquiries" ON public.financial_enquiries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users delete own enquiries" ON public.financial_enquiries
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_fin_enq_updated_at BEFORE UPDATE ON public.financial_enquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- preferred_locations
-- =========================================================
CREATE TABLE IF NOT EXISTS public.preferred_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_type TEXT NOT NULL,
  location_name TEXT NOT NULL,
  is_auto_suggested BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, location_type, location_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preferred_locations TO authenticated;
GRANT ALL ON public.preferred_locations TO service_role;
ALTER TABLE public.preferred_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own preferred locations" ON public.preferred_locations
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- alert_preferences
-- =========================================================
CREATE TABLE IF NOT EXISTS public.alert_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  whatsapp_phone TEXT,
  sms_phone TEXT,
  email_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_preferences TO authenticated;
GRANT ALL ON public.alert_preferences TO service_role;
ALTER TABLE public.alert_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own alert prefs" ON public.alert_preferences
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_alert_prefs_updated_at BEFORE UPDATE ON public.alert_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
