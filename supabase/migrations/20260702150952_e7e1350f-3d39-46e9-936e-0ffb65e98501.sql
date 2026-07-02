
-- payout settings
CREATE TABLE public.hotel_payout_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL UNIQUE REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  account_holder_name TEXT, bank_name TEXT, account_number TEXT, ifsc_code TEXT,
  upi_id TEXT, pan_number TEXT, gst_number TEXT,
  payout_frequency TEXT NOT NULL DEFAULT 'monthly',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_payout_settings TO authenticated;
GRANT ALL ON public.hotel_payout_settings TO service_role;
ALTER TABLE public.hotel_payout_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage payout settings" ON public.hotel_payout_settings
  FOR ALL USING (public.user_owns_hotel(hotel_id)) WITH CHECK (public.user_owns_hotel(hotel_id));
CREATE TRIGGER trg_hotel_payout_settings_updated_at BEFORE UPDATE ON public.hotel_payout_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- commission config
CREATE TABLE public.hotel_commission_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  commission_percent NUMERIC NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, channel)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_commission_config TO authenticated;
GRANT ALL ON public.hotel_commission_config TO service_role;
ALTER TABLE public.hotel_commission_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage commission config" ON public.hotel_commission_config
  FOR ALL USING (public.user_owns_hotel(hotel_id)) WITH CHECK (public.user_owns_hotel(hotel_id));
CREATE TRIGGER trg_hotel_commission_config_updated_at BEFORE UPDATE ON public.hotel_commission_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- payout batches
CREATE TABLE public.hotel_payout_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  period_start DATE NOT NULL, period_end DATE NOT NULL,
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  bookings_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ, payment_reference TEXT, invoice_url TEXT, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_payout_batches TO authenticated;
GRANT ALL ON public.hotel_payout_batches TO service_role;
ALTER TABLE public.hotel_payout_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view payout batches" ON public.hotel_payout_batches
  FOR SELECT USING (public.user_owns_hotel(hotel_id) OR public.is_admin(auth.uid()));
CREATE POLICY "Owners create payout batches" ON public.hotel_payout_batches
  FOR INSERT WITH CHECK (public.user_owns_hotel(hotel_id) OR public.is_admin(auth.uid()));
CREATE POLICY "Admin updates payout batches" ON public.hotel_payout_batches
  FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_hotel_payout_batches_updated_at BEFORE UPDATE ON public.hotel_payout_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- reviews
CREATE TABLE public.hotel_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.hotel_bookings(id) ON DELETE SET NULL,
  guest_user_id UUID,
  guest_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT, body TEXT, response TEXT, responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_reviews TO authenticated;
GRANT SELECT ON public.hotel_reviews TO anon;
GRANT ALL ON public.hotel_reviews TO service_role;
ALTER TABLE public.hotel_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads reviews" ON public.hotel_reviews FOR SELECT USING (true);
CREATE POLICY "Guest submits own review" ON public.hotel_reviews
  FOR INSERT WITH CHECK (auth.uid() = guest_user_id);
CREATE POLICY "Owner replies to review" ON public.hotel_reviews
  FOR UPDATE USING (public.user_owns_hotel(hotel_id)) WITH CHECK (public.user_owns_hotel(hotel_id));
CREATE POLICY "Guest deletes own review" ON public.hotel_reviews
  FOR DELETE USING (auth.uid() = guest_user_id);
CREATE TRIGGER trg_hotel_reviews_updated_at BEFORE UPDATE ON public.hotel_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- guest messages
CREATE TABLE public.hotel_guest_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.hotel_bookings(id) ON DELETE SET NULL,
  guest_user_id UUID, guest_name TEXT, guest_phone TEXT,
  sender TEXT NOT NULL CHECK (sender IN ('partner','guest','system')),
  body TEXT NOT NULL,
  sent_via_whatsapp BOOLEAN NOT NULL DEFAULT false,
  whatsapp_sid TEXT,
  read_by_partner BOOLEAN NOT NULL DEFAULT false,
  read_by_guest BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_guest_messages TO authenticated;
GRANT ALL ON public.hotel_guest_messages TO service_role;
ALTER TABLE public.hotel_guest_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages messages" ON public.hotel_guest_messages
  FOR ALL USING (public.user_owns_hotel(hotel_id)) WITH CHECK (public.user_owns_hotel(hotel_id));
CREATE POLICY "Guest views own messages" ON public.hotel_guest_messages
  FOR SELECT USING (auth.uid() = guest_user_id);
CREATE POLICY "Guest sends own message" ON public.hotel_guest_messages
  FOR INSERT WITH CHECK (auth.uid() = guest_user_id AND sender = 'guest');

CREATE INDEX idx_hotel_reviews_hotel ON public.hotel_reviews(hotel_id, created_at DESC);
CREATE INDEX idx_hotel_guest_messages_booking ON public.hotel_guest_messages(booking_id, created_at);
CREATE INDEX idx_hotel_payout_batches_hotel ON public.hotel_payout_batches(hotel_id, period_start DESC);
