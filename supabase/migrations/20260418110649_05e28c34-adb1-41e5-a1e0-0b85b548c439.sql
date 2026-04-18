-- Hotel partner applications table
CREATE TABLE public.hotel_partner_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  -- Step 1: Basic info
  hotel_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  business_type TEXT NOT NULL DEFAULT 'Hotel',
  -- Step 2: Location
  city TEXT NOT NULL,
  locality TEXT NOT NULL,
  address TEXT,
  pincode TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  -- Step 3: Hotel details
  total_rooms INTEGER DEFAULT 0,
  room_types TEXT[] DEFAULT '{}',
  price_min NUMERIC DEFAULT 0,
  price_max NUMERIC DEFAULT 0,
  check_in_time TEXT DEFAULT '14:00',
  check_out_time TEXT DEFAULT '12:00',
  -- Step 4: Amenities
  amenities TEXT[] DEFAULT '{}',
  -- Step 5: Media
  photos TEXT[] DEFAULT '{}',
  -- Step 6: Documents
  business_registration_url TEXT,
  id_proof_url TEXT,
  gst_certificate_url TEXT,
  -- Status / review
  status TEXT NOT NULL DEFAULT 'pending', -- draft | pending | approved | rejected
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  approved_hotel_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hotel_partner_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit own applications"
  ON public.hotel_partner_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own applications"
  ON public.hotel_partner_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update own pending applications"
  ON public.hotel_partner_applications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('draft','pending','rejected'));

CREATE POLICY "Admins can manage all applications"
  ON public.hotel_partner_applications FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER hotel_partner_applications_updated
  BEFORE UPDATE ON public.hotel_partner_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_hpa_status ON public.hotel_partner_applications(status);
CREATE INDEX idx_hpa_user ON public.hotel_partner_applications(user_id);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('hotel-photos', 'hotel-photos', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('hotel-documents', 'hotel-documents', false)
  ON CONFLICT (id) DO NOTHING;

-- Public read for hotel photos
CREATE POLICY "Hotel photos publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hotel-photos');

CREATE POLICY "Authenticated users upload hotel photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hotel-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners delete own hotel photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'hotel-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Private docs: only owner + admins
CREATE POLICY "Owner reads own hotel docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'hotel-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins read all hotel docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'hotel-documents' AND public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users upload hotel docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hotel-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger: on approval, create partner_hotels entry + notify applicant
CREATE OR REPLACE FUNCTION public.handle_hotel_application_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_hotel_id UUID;
BEGIN
  IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    INSERT INTO public.partner_hotels (
      name, city, locality, address, latitude, longitude,
      contact_email, contact_phone, total_rooms, price_per_night,
      check_in_time, check_out_time, amenities, images,
      manager_id, is_active, description
    ) VALUES (
      NEW.hotel_name, NEW.city, NEW.locality, NEW.address, NEW.latitude, NEW.longitude,
      NEW.email, NEW.phone, COALESCE(NEW.total_rooms, 10),
      COALESCE(NEW.price_min, 1500),
      NEW.check_in_time, NEW.check_out_time,
      NEW.amenities, NEW.photos,
      NEW.user_id, true,
      'Verified partner hotel — ' || NEW.business_type
    )
    RETURNING id INTO new_hotel_id;

    NEW.approved_hotel_id := new_hotel_id;

    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (NEW.user_id,
      '🎉 Hotel Partnership Approved',
      NEW.hotel_name || ' is now live as a verified partner hotel.',
      'success', '/hotels/' || new_hotel_id);
  ELSIF NEW.status = 'rejected' AND OLD.status <> 'rejected' THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (NEW.user_id,
      'Hotel Partnership Update',
      'Your application for ' || NEW.hotel_name || ' needs revision: ' || COALESCE(NEW.rejection_reason, 'See admin notes.'),
      'alert', '/hotels/partner/status');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_hotel_application_review
  BEFORE UPDATE ON public.hotel_partner_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_hotel_application_review();

-- Notify on submission (admin notification + applicant ack)
CREATE OR REPLACE FUNCTION public.notify_hotel_application_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify applicant
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (NEW.user_id,
    'Application Received',
    'We received your hotel partner application for ' || NEW.hotel_name || '. Review takes 24–48h.',
    'info', '/hotels/partner/status');

  -- Notify admins
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id,
    'New Hotel Partner Application',
    NEW.hotel_name || ' (' || NEW.city || ') submitted an application for review.',
    'alert', '/admin'
  FROM public.user_roles ur
  WHERE ur.role = 'admin';

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_hotel_application_submit
  AFTER INSERT ON public.hotel_partner_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_hotel_application_submitted();