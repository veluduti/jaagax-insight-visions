
CREATE OR REPLACE FUNCTION public.platform_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  legacy_app_role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles readable" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles admin write" ON public.roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_roles_touch BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.platform_touch_updated_at();

CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  resource text NOT NULL,
  action text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT permissions_action_check CHECK (action IN
    ('view','create','update','delete','approve','reject','export','download','manage'))
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissions readable" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "permissions admin write" ON public.permissions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.role_permissions (
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rp readable" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "rp admin write" ON public.role_permissions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.user_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  scope jsonb NOT NULL DEFAULT '{"level":"global"}'::jsonb,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ura_uniq ON public.user_role_assignments (user_id, role_id, (scope::text))
  WHERE revoked_at IS NULL;
CREATE INDEX ura_user_idx ON public.user_role_assignments (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_role_assignments TO authenticated;
GRANT ALL ON public.user_role_assignments TO service_role;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ura read own or admin" ON public.user_role_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "ura admin write" ON public.user_role_assignments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_ura_touch BEFORE UPDATE ON public.user_role_assignments
  FOR EACH ROW EXECUTE FUNCTION public.platform_touch_updated_at();

CREATE TABLE public.notification_channels (
  key text PRIMARY KEY,
  label text NOT NULL,
  enabled_globally boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notification_channels TO authenticated;
GRANT ALL ON public.notification_channels TO service_role;
ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "channels readable" ON public.notification_channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "channels admin write" ON public.notification_channels FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.notification_preferences (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_key text NOT NULL REFERENCES public.notification_channels(key) ON DELETE CASCADE,
  category text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel_key, category)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs own crud" ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_notif_prefs_touch BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.platform_touch_updated_at();

CREATE TABLE public.platform_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  actor_user_id uuid,
  subject_type text,
  subject_id text,
  module_key text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pe_topic_idx ON public.platform_events (topic, occurred_at DESC);
CREATE INDEX pe_actor_idx ON public.platform_events (actor_user_id, occurred_at DESC);
CREATE INDEX pe_subject_idx ON public.platform_events (subject_type, subject_id);
GRANT SELECT, INSERT ON public.platform_events TO authenticated;
GRANT ALL ON public.platform_events TO service_role;
ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events read own or admin" ON public.platform_events FOR SELECT TO authenticated
  USING (actor_user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "events insert own" ON public.platform_events FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid() OR actor_user_id IS NULL);

CREATE TABLE public.platform_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  subject_type text,
  subject_id text,
  action text NOT NULL,
  module_key text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pt_actor_idx ON public.platform_timeline (actor_user_id, created_at DESC);
CREATE INDEX pt_subject_idx ON public.platform_timeline (subject_type, subject_id, created_at DESC);
GRANT SELECT, INSERT ON public.platform_timeline TO authenticated;
GRANT ALL ON public.platform_timeline TO service_role;
ALTER TABLE public.platform_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "timeline read own or admin" ON public.platform_timeline FOR SELECT TO authenticated
  USING (actor_user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "timeline insert own" ON public.platform_timeline FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid() OR actor_user_id IS NULL);

CREATE TABLE public.platform_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key text,
  kind text NOT NULL,
  bucket text NOT NULL,
  path text NOT NULL,
  mime text,
  size_bytes bigint,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_media_kind_check CHECK (kind IN
    ('image','document','drone','ai_asset','video','audio','other'))
);
CREATE INDEX pm_owner_idx ON public.platform_media (owner_user_id, created_at DESC);
CREATE INDEX pm_module_idx ON public.platform_media (module_key, kind);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_media TO authenticated;
GRANT ALL ON public.platform_media TO service_role;
ALTER TABLE public.platform_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media read own or admin" ON public.platform_media FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "media write own" ON public.platform_media FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

CREATE TABLE public.ai_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL,
  agent_key text,
  module_key text,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_memory_scope_check CHECK (scope IN ('session','user','agent','module'))
);
CREATE UNIQUE INDEX ai_memory_uniq
  ON public.ai_memory (user_id, scope, COALESCE(agent_key,''), COALESCE(module_key,''), key);
CREATE INDEX ai_memory_recent_idx ON public.ai_memory (user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_memory TO authenticated;
GRANT ALL ON public.ai_memory TO service_role;
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_memory own crud" ON public.ai_memory FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_ai_memory_touch BEFORE UPDATE ON public.ai_memory
  FOR EACH ROW EXECUTE FUNCTION public.platform_touch_updated_at();

CREATE OR REPLACE FUNCTION public.resolve_roles(_user_id uuid)
RETURNS SETOF text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT role::text FROM public.user_roles WHERE user_id = _user_id
  UNION
  SELECT DISTINCT r.key FROM public.user_role_assignments ura
  JOIN public.roles r ON r.id = ura.role_id
  WHERE ura.user_id = _user_id AND ura.revoked_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _resource text, _action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.role_permissions rp ON rp.role_id = ura.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ura.user_id = _user_id AND ura.revoked_at IS NULL
      AND p.resource = _resource AND (p.action = _action OR p.action = 'manage')
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.legacy_app_role = ur.role::text
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id
      AND p.resource = _resource AND (p.action = _action OR p.action = 'manage')
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_scope(_user_id uuid, _level text, _location_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    WHERE ura.user_id = _user_id AND ura.revoked_at IS NULL
      AND (ura.scope->>'level' = 'global'
        OR (ura.scope->>'level' = _level AND (ura.scope->>(_level || '_id'))::uuid = _location_id))
  );
$$;

INSERT INTO public.roles (key, label, description, is_system, legacy_app_role) VALUES
  ('guest','Guest','Unauthenticated visitor',true,NULL),
  ('registered_user','Registered User','Signed-in user with no specialized role',true,NULL),
  ('buyer','Buyer','Property buyer',true,'buyer'),
  ('seller','Seller','Property seller',true,'seller'),
  ('customer','Customer','General customer',true,'customer'),
  ('agent','Agent','Real estate agent',true,'agent'),
  ('builder','Builder','Property builder',true,'builder'),
  ('financial','Financial Partner','Loan / financial provider',true,'financial'),
  ('hotel_manager','Hotel Manager','Manages hotel partner account',true,'hotel_manager'),
  ('driver','Driver','Visit / transport driver',true,'driver'),
  ('farmer','Farmer','Runs one or more farms',true,NULL),
  ('land_owner','Land Owner','Owns land available for farming or lease',true,NULL),
  ('investor','Investor','Invests in land or farms',true,NULL),
  ('farm_manager','Farm Manager','Manages a farm operationally',true,NULL),
  ('worker','Worker','Farm or field worker',true,NULL),
  ('school','School','Educational institution partner',true,NULL),
  ('hotel','Hotel','Hotel partner entity',true,NULL),
  ('district_admin','District Admin','Administrator scoped to a district',true,'district_admin'),
  ('state_admin','State Admin','Administrator scoped to a state',true,'state_admin'),
  ('country_admin','Country Admin','Administrator scoped to a country',true,'country_admin'),
  ('admin','Admin','Platform administrator',true,'admin'),
  ('global_admin','Global Admin','Top-level administrator',true,NULL)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.permissions (key, resource, action, description) VALUES
  ('property:view','property','view','View properties'),
  ('property:create','property','create','Create properties'),
  ('property:update','property','update','Update properties'),
  ('property:delete','property','delete','Delete properties'),
  ('property:approve','property','approve','Approve property listings'),
  ('project:view','project','view','View projects'),
  ('project:create','project','create','Create projects'),
  ('project:update','project','update','Update projects'),
  ('agent:view','agent','view','View agents'),
  ('agent:manage','agent','manage','Manage agents'),
  ('hotel:view','hotel','view','View hotels'),
  ('hotel:manage','hotel','manage','Manage hotel data'),
  ('booking:view','booking','view','View bookings'),
  ('booking:create','booking','create','Create bookings'),
  ('booking:manage','booking','manage','Manage bookings'),
  ('land_registration:view','land_registration','view','View land registrations'),
  ('land_registration:create','land_registration','create','Create land registrations'),
  ('land_registration:update','land_registration','update','Update own land registrations'),
  ('land_registration:approve','land_registration','approve','Approve land registrations'),
  ('land_registration:reject','land_registration','reject','Reject land registrations'),
  ('kyc:view','kyc','view','View KYC submissions'),
  ('kyc:approve','kyc','approve','Approve KYC submissions'),
  ('notification:view','notification','view','View notifications'),
  ('notification:manage','notification','manage','Manage notification preferences'),
  ('user:view','user','view','View users'),
  ('user:manage','user','manage','Manage users'),
  ('role:manage','role','manage','Manage roles and permissions'),
  ('analytics:view','analytics','view','View analytics'),
  ('analytics:export','analytics','export','Export analytics'),
  ('ai_agent:invoke','ai_agent','view','Invoke AI agents'),
  ('media:upload','media','create','Upload media'),
  ('media:delete','media','delete','Delete own media'),
  ('settings:manage','settings','manage','Manage own settings'),
  ('nl_dashboard:view','nl_dashboard','view','View natural living dashboard'),
  ('nl_marketplace:view','nl_marketplace','view','View NL marketplace'),
  ('nl_farm:manage','nl_farm','manage','Manage own farms'),
  ('nl_land:manage','nl_land','manage','Manage own land parcels')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.key = 'registered_user' AND p.key IN (
  'property:view','project:view','agent:view','hotel:view','booking:view',
  'notification:view','notification:manage','media:upload','media:delete',
  'settings:manage','ai_agent:invoke')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.key = 'buyer' AND p.key IN (
  'property:view','project:view','agent:view','hotel:view',
  'booking:view','booking:create','notification:view','notification:manage',
  'media:upload','media:delete','settings:manage','ai_agent:invoke',
  'nl_dashboard:view','nl_marketplace:view')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.key = 'seller' AND p.key IN (
  'property:view','property:create','property:update',
  'booking:view','notification:view','notification:manage',
  'media:upload','media:delete','settings:manage','ai_agent:invoke')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.key = 'agent' AND p.key IN (
  'property:view','property:update','project:view','agent:view',
  'booking:view','booking:manage','notification:view','notification:manage',
  'media:upload','media:delete','settings:manage','ai_agent:invoke','analytics:view')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.key = 'builder' AND p.key IN (
  'property:view','property:create','property:update',
  'project:view','project:create','project:update',
  'notification:view','notification:manage','media:upload','media:delete',
  'settings:manage','ai_agent:invoke','analytics:view')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.key IN ('farmer','land_owner','investor','farm_manager','worker','school') AND p.key IN (
  'nl_dashboard:view','nl_marketplace:view','nl_farm:manage','nl_land:manage',
  'land_registration:view','land_registration:create','land_registration:update',
  'notification:view','notification:manage','media:upload','media:delete',
  'settings:manage','ai_agent:invoke')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.key = 'hotel_manager' AND p.key IN (
  'hotel:view','hotel:manage','booking:view','booking:manage',
  'notification:view','notification:manage','media:upload','media:delete',
  'settings:manage','analytics:view','ai_agent:invoke')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.key IN ('district_admin','state_admin','country_admin','admin','global_admin')
ON CONFLICT DO NOTHING;

INSERT INTO public.notification_channels (key, label, enabled_globally) VALUES
  ('inApp','In-app',true),
  ('email','Email',true),
  ('push','Push',false),
  ('sms','SMS',false),
  ('whatsapp','WhatsApp',false)
ON CONFLICT (key) DO NOTHING;
