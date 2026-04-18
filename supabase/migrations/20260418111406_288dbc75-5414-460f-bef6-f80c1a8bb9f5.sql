
-- Allow public (unauthenticated) hotel partner applications
ALTER TABLE public.hotel_partner_applications ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing insert policy if restrictive, recreate as public
DROP POLICY IF EXISTS "Users can submit their own application" ON public.hotel_partner_applications;
DROP POLICY IF EXISTS "Users can insert their own applications" ON public.hotel_partner_applications;
DROP POLICY IF EXISTS "Anyone can submit hotel application" ON public.hotel_partner_applications;

CREATE POLICY "Anyone can submit hotel application"
ON public.hotel_partner_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Storage policies: allow anonymous uploads to hotel-photos and hotel-documents under a public/ prefix
DROP POLICY IF EXISTS "Public can upload hotel photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload hotel documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can read hotel photos" ON storage.objects;

CREATE POLICY "Public can upload hotel photos"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'hotel-photos');

CREATE POLICY "Public can read hotel photos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'hotel-photos');

CREATE POLICY "Public can upload hotel documents"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'hotel-documents');

-- Update notification trigger to handle null user_id (skip applicant notification if anonymous)
CREATE OR REPLACE FUNCTION public.notify_hotel_application_submitted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (NEW.user_id,
      'Application Received',
      'We received your hotel partner application for ' || NEW.hotel_name || '. Review takes 24–48h.',
      'info', '/hotels/partner/status');
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id,
    'New Hotel Partner Application',
    NEW.hotel_name || ' (' || NEW.city || ') submitted an application for review.',
    'alert', '/admin'
  FROM public.user_roles ur
  WHERE ur.role = 'admin';

  RETURN NEW;
END;
$function$;

-- Update review trigger to skip applicant notification if no user_id
CREATE OR REPLACE FUNCTION public.handle_hotel_application_review()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

    IF NEW.user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (NEW.user_id,
        '🎉 Hotel Partnership Approved',
        NEW.hotel_name || ' is now live as a verified partner hotel.',
        'success', '/hotels/' || new_hotel_id);
    END IF;
  ELSIF NEW.status = 'rejected' AND OLD.status <> 'rejected' THEN
    IF NEW.user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (NEW.user_id,
        'Hotel Partnership Update',
        'Your application for ' || NEW.hotel_name || ' needs revision: ' || COALESCE(NEW.rejection_reason, 'See admin notes.'),
        'alert', '/hotels/partner/status');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
