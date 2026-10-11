
CREATE TABLE public.smart_stays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_ref text NOT NULL UNIQUE DEFAULT ('SS-' || upper(substr(md5(random()::text),1,8))),
  creator_id uuid NOT NULL DEFAULT auth.uid(),
  creator_role text NOT NULL DEFAULT 'agent' CHECK (creator_role IN ('agent','hotel_manager')),
  title text NOT NULL DEFAULT '',
  description text,
  images text[] NOT NULL DEFAULT '{}',
  inclusions text[] NOT NULL DEFAULT '{}',
  cancellation_policy text,
  currency text NOT NULL DEFAULT 'INR',
  markup numeric NOT NULL DEFAULT 0 CHECK (markup >= 0),
  valid_from date,
  valid_to date,
  itinerary jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','changes_requested','rejected','ready','published','archived')),
  current_revision int NOT NULL DEFAULT 0,
  published_revision_id uuid,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.smart_stay_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  smart_stay_id uuid NOT NULL REFERENCES public.smart_stays(id) ON DELETE CASCADE,
  revision int NOT NULL,
  snapshot jsonb NOT NULL,
  hotel_cost numeric NOT NULL,
  taxes numeric NOT NULL,
  selling_price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (smart_stay_id, revision)
);
CREATE TABLE public.smart_stay_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES public.smart_stay_revisions(id) ON DELETE CASCADE,
  smart_stay_id uuid NOT NULL REFERENCES public.smart_stays(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id) ON DELETE CASCADE,
  stays jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','changes_requested')),
  reason text,
  auto_approved boolean NOT NULL DEFAULT false,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (revision_id, hotel_id)
);
CREATE TABLE public.smart_stay_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  smart_stay_id uuid NOT NULL REFERENCES public.smart_stays(id) ON DELETE CASCADE,
  revision_id uuid NOT NULL REFERENCES public.smart_stay_revisions(id),
  customer_id uuid NOT NULL,
  breakdown jsonb NOT NULL,
  hotel_cost numeric NOT NULL,
  taxes numeric NOT NULL,
  total numeric NOT NULL,
  all_available boolean NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.smart_stay_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref text NOT NULL UNIQUE DEFAULT ('SSB-' || upper(substr(md5(random()::text),1,8))),
  smart_stay_id uuid NOT NULL REFERENCES public.smart_stays(id),
  revision_id uuid NOT NULL REFERENCES public.smart_stay_revisions(id),
  quote_id uuid NOT NULL UNIQUE REFERENCES public.smart_stay_quotes(id),
  customer_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  guest_name text, guest_phone text, guest_email text,
  snapshot jsonb NOT NULL,
  hotel_cost numeric NOT NULL, taxes numeric NOT NULL, total numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'PENDING_PAYMENT',
  payment_status text NOT NULL DEFAULT 'unpaid',
  razorpay_order_id text, razorpay_payment_id text, paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.smart_stay_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.smart_stay_bookings(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.partner_hotels(id),
  room_id uuid NOT NULL REFERENCES public.hotel_rooms(id),
  hotel_name text, room_name text, destination text,
  check_in date NOT NULL, check_out date NOT NULL,
  num_rooms int NOT NULL, adults int NOT NULL, children int NOT NULL DEFAULT 0,
  amount numeric NOT NULL, tax numeric NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  confirmation_ref text, attempts int NOT NULL DEFAULT 0, last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.smart_stay_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  smart_stay_id uuid REFERENCES public.smart_stays(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.smart_stay_bookings(id) ON DELETE CASCADE,
  actor_id uuid,
  event text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hotel_availability_blocks ADD COLUMN IF NOT EXISTS smart_stay_reservation_id uuid REFERENCES public.smart_stay_reservations(id) ON DELETE CASCADE;

GRANT SELECT, INSERT, DELETE ON public.smart_stays TO authenticated;
GRANT UPDATE (title, description, images, inclusions, cancellation_policy, currency, markup, valid_from, valid_to, itinerary, is_hidden) ON public.smart_stays TO authenticated;
GRANT SELECT ON public.smart_stays, public.smart_stay_revisions TO anon;
GRANT SELECT ON public.smart_stay_revisions, public.smart_stay_approvals, public.smart_stay_quotes, public.smart_stay_bookings, public.smart_stay_reservations, public.smart_stay_events TO authenticated;
GRANT ALL ON public.smart_stays, public.smart_stay_revisions, public.smart_stay_approvals, public.smart_stay_quotes, public.smart_stay_bookings, public.smart_stay_reservations, public.smart_stay_events TO service_role;

ALTER TABLE public.smart_stays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_stay_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_stay_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_stay_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_stay_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_stay_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_stay_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.smart_stay_is_approver(_stay uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM smart_stay_approvals a WHERE a.smart_stay_id = _stay AND public.is_hotel_member(a.hotel_id, _uid))
$$;

CREATE POLICY "ss read" ON public.smart_stays FOR SELECT USING (
  published_revision_id IS NOT NULL AND status <> 'archived'
  OR creator_id = auth.uid() OR public.is_admin(auth.uid()) OR public.smart_stay_is_approver(id, auth.uid()));
CREATE POLICY "ss insert" ON public.smart_stays FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid() AND status = 'draft' AND published_revision_id IS NULL AND current_revision = 0);
CREATE POLICY "ss update" ON public.smart_stays FOR UPDATE TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "ss delete" ON public.smart_stays FOR DELETE TO authenticated USING (creator_id = auth.uid() AND published_revision_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.smart_stay_bookings b WHERE b.smart_stay_id = id));

CREATE POLICY "rev read" ON public.smart_stay_revisions FOR SELECT USING (EXISTS (SELECT 1 FROM public.smart_stays s WHERE s.id = smart_stay_id));
CREATE POLICY "appr read" ON public.smart_stay_approvals FOR SELECT TO authenticated USING (
  public.is_hotel_member(hotel_id, auth.uid()) OR public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.smart_stays s WHERE s.id = smart_stay_id AND s.creator_id = auth.uid()));
CREATE POLICY "quote read" ON public.smart_stay_quotes FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "bk read" ON public.smart_stay_bookings FOR SELECT TO authenticated USING (
  customer_id = auth.uid() OR creator_id = auth.uid() OR public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.smart_stay_reservations r WHERE r.booking_id = id AND public.is_hotel_member(r.hotel_id, auth.uid())));
CREATE POLICY "res read" ON public.smart_stay_reservations FOR SELECT TO authenticated USING (
  public.is_hotel_member(hotel_id, auth.uid()) OR public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.smart_stay_bookings b WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR b.creator_id = auth.uid())));
CREATE POLICY "ev read" ON public.smart_stay_events FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid())
  OR (booking_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.smart_stay_bookings b WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR b.creator_id = auth.uid())))
  OR (smart_stay_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.smart_stays s WHERE s.id = smart_stay_id AND s.creator_id = auth.uid())));

-- Any content edit sends the package back to draft (published revision stays live).
CREATE OR REPLACE FUNCTION public.smart_stay_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF current_setting('smart_stay.internal', true) IS DISTINCT FROM '1'
     AND (NEW.itinerary, NEW.markup, NEW.title, NEW.description, NEW.images, NEW.inclusions, NEW.cancellation_policy, NEW.valid_from, NEW.valid_to)
       IS DISTINCT FROM (OLD.itinerary, OLD.markup, OLD.title, OLD.description, OLD.images, OLD.inclusions, OLD.cancellation_policy, OLD.valid_from, OLD.valid_to)
     AND OLD.status <> 'draft' THEN
    NEW.status := 'draft';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER smart_stay_touch BEFORE UPDATE ON public.smart_stays FOR EACH ROW EXECUTE FUNCTION public.smart_stay_touch();

CREATE OR REPLACE FUNCTION public.smart_stay_set_role() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM agents WHERE user_id = NEW.creator_id) THEN NEW.creator_role := 'agent';
  ELSIF EXISTS (SELECT 1 FROM partner_hotels h WHERE public.is_hotel_member(h.id, NEW.creator_id)) THEN NEW.creator_role := 'hotel_manager';
  ELSE RAISE EXCEPTION 'Only agents and hotel partners can create Smart Stays';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER smart_stay_set_role BEFORE INSERT ON public.smart_stays FOR EACH ROW EXECUTE FUNCTION public.smart_stay_set_role();

CREATE OR REPLACE FUNCTION public.smart_stay_notify(_uid uuid, _title text, _msg text, _link text, _meta jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO notifications (user_id, type, title, message, link, metadata) SELECT _uid, 'smart_stay', _title, _msg, _link, _meta WHERE _uid IS NOT NULL;
$$;
REVOKE EXECUTE ON FUNCTION public.smart_stay_notify(uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

-- Validates itinerary and computes server-side pricing. Returns {stays:[...], hotel_cost, taxes}
CREATE OR REPLACE FUNCTION public.smart_stay_price(_itinerary jsonb, _valid_from date, _valid_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE stop jsonb; st jsonb; i int := 0; prev_dep date; arr date; dep date; ci date; co date;
  rm hotel_rooms; h partner_hotels; nights int; nrooms int; ad int; ch int; amt numeric; tx numeric;
  out_stays jsonb := '[]'::jsonb; cost numeric := 0; taxes numeric := 0;
BEGIN
  IF jsonb_typeof(_itinerary) <> 'array' OR jsonb_array_length(_itinerary) = 0 THEN RAISE EXCEPTION 'Add at least one destination'; END IF;
  FOR stop IN SELECT * FROM jsonb_array_elements(_itinerary) LOOP
    i := i + 1;
    IF coalesce(trim(stop->>'destination'),'') = '' THEN RAISE EXCEPTION 'Stop %: destination is required', i; END IF;
    arr := (stop->>'arrival')::date; dep := (stop->>'departure')::date;
    IF arr IS NULL OR dep IS NULL OR dep <= arr THEN RAISE EXCEPTION 'Stop % (%): departure must be after arrival', i, stop->>'destination'; END IF;
    IF prev_dep IS NOT NULL AND arr < prev_dep THEN RAISE EXCEPTION 'Stop % (%) starts before the previous stop ends', i, stop->>'destination'; END IF;
    IF _valid_from IS NOT NULL AND arr < _valid_from OR _valid_to IS NOT NULL AND dep > _valid_to THEN RAISE EXCEPTION 'Stop % is outside the package validity dates', i; END IF;
    IF arr < current_date THEN RAISE EXCEPTION 'Stop % is in the past', i; END IF;
    prev_dep := dep;
    IF jsonb_array_length(coalesce(stop->'stays','[]'::jsonb)) = 0 THEN RAISE EXCEPTION 'Stop % (%): add a hotel stay', i, stop->>'destination'; END IF;
    FOR st IN SELECT * FROM jsonb_array_elements(stop->'stays') LOOP
      SELECT * INTO rm FROM hotel_rooms WHERE id = (st->>'room_id')::uuid AND hotel_id = (st->>'hotel_id')::uuid AND is_active;
      IF rm.id IS NULL THEN RAISE EXCEPTION 'Stop %: choose a valid room', i; END IF;
      SELECT * INTO h FROM partner_hotels WHERE id = rm.hotel_id;
      IF NOT coalesce(h.is_active,false) THEN RAISE EXCEPTION 'Stop %: % is not live on JAAGA X', i, h.name; END IF;
      ci := (st->>'check_in')::date; co := (st->>'check_out')::date;
      IF ci IS NULL OR co IS NULL OR co <= ci THEN RAISE EXCEPTION 'Stop %: check-out must be after check-in at %', i, h.name; END IF;
      IF ci < arr OR co > dep THEN RAISE EXCEPTION 'Stop %: % stay must be within the stop dates', i, h.name; END IF;
      nrooms := greatest(coalesce((st->>'num_rooms')::int,1),1);
      ad := greatest(coalesce((st->>'adults')::int,1),1); ch := greatest(coalesce((st->>'children')::int,0),0);
      IF ad + ch > nrooms * greatest(coalesce(rm.max_occupancy, rm.max_adults, 2),1) THEN
        RAISE EXCEPTION 'Stop %: % rooms of % fit % guests at most', i, nrooms, coalesce(rm.room_name, rm.room_type), nrooms * greatest(coalesce(rm.max_occupancy, rm.max_adults, 2),1);
      END IF;
      nights := co - ci;
      amt := round(coalesce(rm.base_price,0) * nights * nrooms, 2);
      IF amt <= 0 THEN RAISE EXCEPTION 'Stop %: % has no room rate set', i, h.name; END IF;
      tx := round(amt * coalesce(h.gst_rate, 12) / 100, 2);
      cost := cost + amt; taxes := taxes + tx;
      out_stays := out_stays || jsonb_build_object('stop', i, 'destination', stop->>'destination', 'hotel_id', h.id, 'hotel_name', h.name,
        'manager_id', h.manager_id, 'room_id', rm.id, 'room_name', coalesce(rm.room_name, rm.room_type), 'check_in', ci, 'check_out', co,
        'nights', nights, 'num_rooms', nrooms, 'adults', ad, 'children', ch, 'meal_plan', st->>'meal_plan',
        'rate', rm.base_price, 'amount', amt, 'tax', tx, 'cancellation_policy', rm.cancellation_policy);
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object('stays', out_stays, 'hotel_cost', cost, 'taxes', taxes);
END $$;

CREATE OR REPLACE FUNCTION public.smart_stay_submit(_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s smart_stays; p jsonb; rev smart_stay_revisions; prev_rev uuid; hid uuid; hstays jsonb; old smart_stay_approvals; pending int;
BEGIN
  SELECT * INTO s FROM smart_stays WHERE id = _id FOR UPDATE;
  IF s.id IS NULL OR s.creator_id <> auth.uid() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF trim(s.title) = '' THEN RAISE EXCEPTION 'Add a package title'; END IF;
  IF s.status NOT IN ('draft','changes_requested','rejected') THEN RAISE EXCEPTION 'This revision is already submitted'; END IF;
  p := public.smart_stay_price(s.itinerary, s.valid_from, s.valid_to);
  SELECT id INTO prev_rev FROM smart_stay_revisions WHERE smart_stay_id = _id ORDER BY revision DESC LIMIT 1;
  INSERT INTO smart_stay_revisions (smart_stay_id, revision, snapshot, hotel_cost, taxes, selling_price)
  VALUES (_id, s.current_revision + 1, jsonb_build_object('title', s.title, 'description', s.description, 'images', to_jsonb(s.images),
    'inclusions', to_jsonb(s.inclusions), 'cancellation_policy', s.cancellation_policy, 'markup', s.markup, 'itinerary', s.itinerary, 'stays', p->'stays'),
    (p->>'hotel_cost')::numeric, (p->>'taxes')::numeric, (p->>'hotel_cost')::numeric + (p->>'taxes')::numeric + s.markup)
  RETURNING * INTO rev;
  FOR hid IN SELECT DISTINCT (x->>'hotel_id')::uuid FROM jsonb_array_elements(p->'stays') x LOOP
    SELECT jsonb_agg(x - 'manager_id' ORDER BY x->>'check_in') INTO hstays FROM jsonb_array_elements(p->'stays') x WHERE (x->>'hotel_id')::uuid = hid;
    old := NULL;
    IF prev_rev IS NOT NULL THEN SELECT * INTO old FROM smart_stay_approvals WHERE revision_id = prev_rev AND hotel_id = hid; END IF;
    IF public.is_hotel_member(hid, s.creator_id) THEN
      INSERT INTO smart_stay_approvals (revision_id, smart_stay_id, hotel_id, stays, status, auto_approved, decided_by, decided_at)
      VALUES (rev.id, _id, hid, hstays, 'approved', true, s.creator_id, now());
    ELSIF old.id IS NOT NULL AND old.status = 'approved' AND old.stays = hstays THEN
      INSERT INTO smart_stay_approvals (revision_id, smart_stay_id, hotel_id, stays, status, reason, decided_by, decided_at)
      VALUES (rev.id, _id, hid, hstays, 'approved', 'Carried over: unchanged since previous approval', old.decided_by, old.decided_at);
    ELSE
      INSERT INTO smart_stay_approvals (revision_id, smart_stay_id, hotel_id, stays) VALUES (rev.id, _id, hid, hstays);
      PERFORM public.smart_stay_notify(h.manager_id, 'Smart Stay approval needed', format('"%s" includes a stay at %s. Please review.', s.title, h.name), '/partners/smart-stays', jsonb_build_object('smart_stay_id', _id))
        FROM partner_hotels h WHERE h.id = hid;
    END IF;
  END LOOP;
  SELECT count(*) INTO pending FROM smart_stay_approvals WHERE revision_id = rev.id AND status <> 'approved';
  PERFORM set_config('smart_stay.internal', '1', true);
  UPDATE smart_stays SET current_revision = rev.revision, status = CASE WHEN pending = 0 THEN 'ready' ELSE 'pending_approval' END WHERE id = _id;
  PERFORM set_config('smart_stay.internal', '', true);
  INSERT INTO smart_stay_events (smart_stay_id, actor_id, event, details) VALUES (_id, auth.uid(), 'submitted', jsonb_build_object('revision', rev.revision, 'pending', pending));
  RETURN jsonb_build_object('revision', rev.revision, 'pending', pending);
END $$;

CREATE OR REPLACE FUNCTION public.smart_stay_decide(_approval_id uuid, _decision text, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a smart_stay_approvals; s smart_stays; cur uuid; pending int; hn text;
BEGIN
  IF _decision NOT IN ('approved','rejected','changes_requested') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  IF _decision <> 'approved' AND coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'Please give a reason'; END IF;
  SELECT * INTO a FROM smart_stay_approvals WHERE id = _approval_id FOR UPDATE;
  IF a.id IS NULL OR NOT public.is_hotel_member(a.hotel_id, auth.uid()) THEN RAISE EXCEPTION 'You can only review stays at hotels you manage'; END IF;
  SELECT * INTO s FROM smart_stays WHERE id = a.smart_stay_id FOR UPDATE;
  SELECT id INTO cur FROM smart_stay_revisions WHERE smart_stay_id = s.id AND revision = s.current_revision;
  IF a.revision_id <> cur THEN RAISE EXCEPTION 'This request is out of date — the package was changed'; END IF;
  IF a.status = _decision THEN RETURN; END IF;
  IF a.status <> 'pending' THEN RAISE EXCEPTION 'Already decided'; END IF;
  UPDATE smart_stay_approvals SET status = _decision, reason = nullif(trim(_reason),''), decided_by = auth.uid(), decided_at = now() WHERE id = a.id;
  SELECT name INTO hn FROM partner_hotels WHERE id = a.hotel_id;
  SELECT count(*) INTO pending FROM smart_stay_approvals WHERE revision_id = cur AND status <> 'approved';
  PERFORM set_config('smart_stay.internal', '1', true);
  IF s.status = 'pending_approval' THEN
    UPDATE smart_stays SET status = CASE WHEN _decision = 'rejected' THEN 'rejected' WHEN _decision = 'changes_requested' THEN 'changes_requested' WHEN pending = 0 THEN 'ready' ELSE status END WHERE id = s.id;
  END IF;
  PERFORM set_config('smart_stay.internal', '', true);
  INSERT INTO smart_stay_events (smart_stay_id, actor_id, event, details) VALUES (s.id, auth.uid(), 'hotel_' || _decision, jsonb_build_object('hotel', hn, 'reason', _reason));
  PERFORM public.smart_stay_notify(s.creator_id,
    CASE _decision WHEN 'approved' THEN 'Hotel approved your Smart Stay' WHEN 'rejected' THEN 'Hotel rejected your Smart Stay' ELSE 'Hotel requested changes' END,
    format('%s on "%s"%s', hn, s.title, CASE WHEN _reason <> '' THEN ': ' || _reason ELSE '' END) || CASE WHEN pending = 0 AND _decision = 'approved' THEN ' All hotels approved — you can publish now.' ELSE '' END,
    CASE WHEN s.creator_role = 'agent' THEN '/dashboard/agent/smart-stays' ELSE '/partners/smart-stays' END, jsonb_build_object('smart_stay_id', s.id));
END $$;

CREATE OR REPLACE FUNCTION public.smart_stay_publish(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s smart_stays; cur uuid;
BEGIN
  SELECT * INTO s FROM smart_stays WHERE id = _id FOR UPDATE;
  IF s.id IS NULL OR s.creator_id <> auth.uid() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF s.status <> 'ready' THEN RAISE EXCEPTION 'All hotels must approve this revision before publishing'; END IF;
  SELECT id INTO cur FROM smart_stay_revisions WHERE smart_stay_id = _id AND revision = s.current_revision;
  IF EXISTS (SELECT 1 FROM smart_stay_approvals WHERE revision_id = cur AND status <> 'approved') THEN RAISE EXCEPTION 'Some hotel approvals are still pending'; END IF;
  PERFORM set_config('smart_stay.internal', '1', true);
  UPDATE smart_stays SET status = 'published', published_revision_id = cur WHERE id = _id;
  PERFORM set_config('smart_stay.internal', '', true);
  INSERT INTO smart_stay_events (smart_stay_id, actor_id, event, details) VALUES (_id, auth.uid(), 'published', jsonb_build_object('revision', s.current_revision));
END $$;

CREATE OR REPLACE FUNCTION public.smart_stay_unpublish(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM smart_stays WHERE id = _id AND creator_id = auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  PERFORM set_config('smart_stay.internal', '1', true);
  UPDATE smart_stays SET published_revision_id = NULL, status = CASE WHEN status = 'published' THEN 'ready' ELSE status END WHERE id = _id;
  PERFORM set_config('smart_stay.internal', '', true);
  INSERT INTO smart_stay_events (smart_stay_id, actor_id, event) VALUES (_id, auth.uid(), 'unpublished');
END $$;

CREATE OR REPLACE FUNCTION public.smart_stay_quote(_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s smart_stays; r smart_stay_revisions; p jsonb; st jsonb; free int; ok boolean := true; br jsonb := '[]'::jsonb; qid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
  SELECT * INTO s FROM smart_stays WHERE id = _id;
  IF s.published_revision_id IS NULL THEN RAISE EXCEPTION 'This package is not available'; END IF;
  SELECT * INTO r FROM smart_stay_revisions WHERE id = s.published_revision_id;
  p := public.smart_stay_price(r.snapshot->'itinerary', NULL, NULL);
  FOR st IN SELECT * FROM jsonb_array_elements(p->'stays') LOOP
    free := public.room_free_units((st->>'room_id')::uuid, (st->>'check_in')::date, (st->>'check_out')::date);
    IF free < (st->>'num_rooms')::int THEN ok := false; END IF;
    br := br || ((st - 'manager_id') || jsonb_build_object('available', free >= (st->>'num_rooms')::int));
  END LOOP;
  INSERT INTO smart_stay_quotes (smart_stay_id, revision_id, customer_id, breakdown, hotel_cost, taxes, total, all_available, expires_at)
  VALUES (_id, r.id, auth.uid(), jsonb_build_object('stays', br, 'markup', (r.snapshot->>'markup')::numeric,
     'price_changed', (p->>'hotel_cost')::numeric <> r.hotel_cost, 'cancellation_policy', r.snapshot->>'cancellation_policy'),
    (p->>'hotel_cost')::numeric, (p->>'taxes')::numeric, (p->>'hotel_cost')::numeric + (p->>'taxes')::numeric + (r.snapshot->>'markup')::numeric,
    ok, now() + interval '15 minutes')
  RETURNING id INTO qid;
  RETURN qid;
END $$;

CREATE OR REPLACE FUNCTION public.smart_stay_book(_quote_id uuid, _name text, _phone text, _email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q smart_stay_quotes; s smart_stays; r smart_stay_revisions; bid uuid; st jsonb;
BEGIN
  SELECT * INTO q FROM smart_stay_quotes WHERE id = _quote_id AND customer_id = auth.uid();
  IF q.id IS NULL THEN RAISE EXCEPTION 'Quote not found'; END IF;
  SELECT id INTO bid FROM smart_stay_bookings WHERE quote_id = q.id;
  IF bid IS NOT NULL THEN RETURN bid; END IF;
  IF q.expires_at < now() THEN RAISE EXCEPTION 'Your price quote expired — please refresh it'; END IF;
  IF NOT q.all_available THEN RAISE EXCEPTION 'Some hotels are no longer available for these dates'; END IF;
  IF coalesce(trim(_name),'') = '' OR coalesce(trim(_phone),'') = '' THEN RAISE EXCEPTION 'Name and phone are required'; END IF;
  SELECT * INTO s FROM smart_stays WHERE id = q.smart_stay_id;
  IF s.published_revision_id IS DISTINCT FROM q.revision_id THEN RAISE EXCEPTION 'The package was updated — please refresh your quote'; END IF;
  SELECT * INTO r FROM smart_stay_revisions WHERE id = q.revision_id;
  INSERT INTO smart_stay_bookings (smart_stay_id, revision_id, quote_id, customer_id, creator_id, guest_name, guest_phone, guest_email, snapshot, hotel_cost, taxes, total, currency)
  VALUES (s.id, r.id, q.id, auth.uid(), s.creator_id, trim(_name), trim(_phone), nullif(trim(_email),''), r.snapshot || jsonb_build_object('quote', q.breakdown), q.hotel_cost, q.taxes, q.total, s.currency)
  RETURNING id INTO bid;
  FOR st IN SELECT * FROM jsonb_array_elements(q.breakdown->'stays') LOOP
    INSERT INTO smart_stay_reservations (booking_id, hotel_id, room_id, hotel_name, room_name, destination, check_in, check_out, num_rooms, adults, children, amount, tax)
    VALUES (bid, (st->>'hotel_id')::uuid, (st->>'room_id')::uuid, st->>'hotel_name', st->>'room_name', st->>'destination', (st->>'check_in')::date, (st->>'check_out')::date,
      (st->>'num_rooms')::int, (st->>'adults')::int, (st->>'children')::int, (st->>'amount')::numeric, (st->>'tax')::numeric);
  END LOOP;
  INSERT INTO smart_stay_events (booking_id, smart_stay_id, actor_id, event, details) VALUES (bid, s.id, auth.uid(), 'PENDING_PAYMENT', jsonb_build_object('total', q.total));
  RETURN bid;
END $$;

-- Called by the payment function (service role) only after payment is verified.
CREATE OR REPLACE FUNCTION public.smart_stay_confirm(_booking_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b smart_stay_bookings; rs smart_stay_reservations; free int; failed int := 0; s smart_stays; mgr uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO b FROM smart_stay_bookings WHERE id = _booking_id FOR UPDATE;
  IF b.payment_status <> 'paid' THEN RAISE EXCEPTION 'Payment not verified'; END IF;
  IF b.status IN ('CONFIRMED','MANUAL_REVIEW') THEN RETURN jsonb_build_object('status', b.status, 'already', true); END IF;
  UPDATE smart_stay_bookings SET status = 'CONFIRMING_HOTELS', updated_at = now() WHERE id = b.id;
  INSERT INTO smart_stay_events (booking_id, smart_stay_id, event) VALUES (b.id, b.smart_stay_id, 'CONFIRMING_HOTELS');
  FOR rs IN SELECT * FROM smart_stay_reservations WHERE booking_id = b.id ORDER BY check_in FOR UPDATE LOOP
    IF rs.status = 'CONFIRMED' THEN CONTINUE; END IF;
    PERFORM 1 FROM hotel_rooms WHERE id = rs.room_id FOR UPDATE;
    free := public.room_free_units(rs.room_id, rs.check_in, rs.check_out);
    IF free >= rs.num_rooms THEN
      INSERT INTO hotel_availability_blocks (hotel_id, room_id, start_date, end_date, units, reason, smart_stay_reservation_id)
      VALUES (rs.hotel_id, rs.room_id, rs.check_in, rs.check_out, rs.num_rooms, 'booking', rs.id);
      UPDATE smart_stay_reservations SET status = 'CONFIRMED', attempts = attempts + 1, confirmation_ref = 'JX-' || upper(substr(md5(rs.id::text),1,8)), updated_at = now() WHERE id = rs.id;
      SELECT manager_id INTO mgr FROM partner_hotels WHERE id = rs.hotel_id;
      PERFORM public.smart_stay_notify(mgr, 'New Smart Stay reservation', format('%s room(s) of %s, %s → %s (%s).', rs.num_rooms, rs.room_name, rs.check_in, rs.check_out, b.booking_ref), '/partners/smart-stays', jsonb_build_object('booking_id', b.id));
    ELSE
      failed := failed + 1;
      UPDATE smart_stay_reservations SET status = 'FAILED', attempts = attempts + 1, last_error = 'No rooms left for these dates', updated_at = now() WHERE id = rs.id;
    END IF;
  END LOOP;
  SELECT * INTO s FROM smart_stays WHERE id = b.smart_stay_id;
  IF failed = 0 THEN
    UPDATE smart_stay_bookings SET status = 'CONFIRMED', updated_at = now() WHERE id = b.id;
    INSERT INTO smart_stay_events (booking_id, smart_stay_id, event) VALUES (b.id, b.smart_stay_id, 'CONFIRMED');
    PERFORM public.smart_stay_notify(b.customer_id, 'Smart Stay confirmed', format('All hotels confirmed for "%s" (%s).', s.title, b.booking_ref), '/my-smart-stays', jsonb_build_object('booking_id', b.id));
    PERFORM public.smart_stay_notify(b.creator_id, 'Smart Stay booked', format('"%s" was booked and confirmed (%s).', s.title, b.booking_ref), NULL, jsonb_build_object('booking_id', b.id));
  ELSE
    UPDATE smart_stay_bookings SET status = 'MANUAL_REVIEW', updated_at = now() WHERE id = b.id;
    INSERT INTO smart_stay_events (booking_id, smart_stay_id, event, details) VALUES (b.id, b.smart_stay_id, 'MANUAL_REVIEW', jsonb_build_object('failed', failed));
    PERFORM public.smart_stay_notify(b.customer_id, 'Smart Stay needs attention', format('Payment received, but %s hotel(s) could not be confirmed for %s. Our team will contact you about a fix or refund.', failed, b.booking_ref), '/my-smart-stays', jsonb_build_object('booking_id', b.id));
    PERFORM public.smart_stay_notify(b.creator_id, 'Smart Stay needs attention', format('%s hotel(s) failed for %s.', failed, b.booking_ref), NULL, jsonb_build_object('booking_id', b.id));
    PERFORM public.smart_stay_notify(ur.user_id, 'Smart Stay manual review', format('%s: %s hotel(s) failed after payment.', b.booking_ref, failed), NULL, jsonb_build_object('booking_id', b.id))
      FROM user_roles ur WHERE ur.role::text = 'admin';
  END IF;
  RETURN jsonb_build_object('failed', failed);
END $$;

REVOKE EXECUTE ON FUNCTION public.smart_stay_confirm(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.smart_stay_confirm(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.smart_stay_price(jsonb, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.smart_stay_price(jsonb, date, date) TO authenticated;
