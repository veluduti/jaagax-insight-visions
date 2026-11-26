CREATE TABLE public.partner_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text,
  monthly_price numeric,
  yearly_price numeric,
  property_limit integer,
  commission_min numeric,
  commission_max numeric,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  comparison jsonb NOT NULL DEFAULT '{}'::jsonb,
  support_level text,
  is_popular boolean NOT NULL DEFAULT false,
  property_types text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_plans TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.partner_plans TO authenticated;
GRANT ALL ON public.partner_plans TO service_role;
ALTER TABLE public.partner_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active plans are public" ON public.partner_plans FOR SELECT USING (is_active OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage plans" ON public.partner_plans FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.partner_newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (char_length(email) BETWEEN 5 AND 255 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.partner_newsletter_subscribers TO anon, authenticated;
GRANT SELECT ON public.partner_newsletter_subscribers TO authenticated;
GRANT ALL ON public.partner_newsletter_subscribers TO service_role;
ALTER TABLE public.partner_newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can subscribe" ON public.partner_newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view subscribers" ON public.partner_newsletter_subscribers FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE public.partner_webinar_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_key text NOT NULL CHECK (char_length(webinar_key) <= 80),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  email text NOT NULL CHECK (char_length(email) <= 255 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (webinar_key, email)
);
GRANT INSERT ON public.partner_webinar_registrations TO anon, authenticated;
GRANT SELECT ON public.partner_webinar_registrations TO authenticated;
GRANT ALL ON public.partner_webinar_registrations TO service_role;
ALTER TABLE public.partner_webinar_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can register" ON public.partner_webinar_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view registrations" ON public.partner_webinar_registrations FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

INSERT INTO public.partner_plans (plan_key,name,tagline,monthly_price,yearly_price,property_limit,features,comparison,support_level,is_popular,sort_order) VALUES
('starter','Starter','Get started on Jaaga with essential tools.',2999,29990,5,'["List up to 5 properties","Bookings & reservations","Inventory & rate management","Payments & settlements","Basic reports & analytics","Email, SMS & app notifications","Standard support"]','{"bookings":true,"inventory":true,"payments":true,"channel":false,"pms":false,"analytics":true,"crm":false,"api":false}','Standard',false,1),
('growth','Growth','For growing operators who want higher visibility and automation.',7999,79990,50,'["List up to 50 properties","All Starter features","Channel manager & OTA distribution","Guest & resident management (CRM)","Housekeeping & maintenance","Advanced analytics & revenue insights","Priority support"]','{"bookings":true,"inventory":true,"payments":true,"channel":true,"pms":true,"analytics":true,"crm":true,"api":false}','Priority',true,2),
('enterprise','Enterprise','For hotel groups, chains and large operators.',NULL,NULL,NULL,'["Unlimited properties","All Growth features","Multi-property & group management","Advanced revenue & pricing tools","API integrations (PMS, Channel Manager, etc.)","Dedicated account manager","SLA-based support & onboarding"]','{"bookings":true,"inventory":true,"payments":true,"channel":true,"pms":true,"analytics":true,"crm":true,"api":true}','Dedicated (SLA)',false,3),
('commission','Commission Plan (Marketplace)','Prefer a pay-per-booking model? List your property on Jaaga and pay a commission only on successful bookings.',NULL,NULL,NULL,'["No upfront subscription fee","Reach more guests & residents","Included in Jaaga marketplace & distribution","Payments & settlement through Jaaga","Optional upgrade to subscription later"]','{}',NULL,false,4);
UPDATE public.partner_plans SET commission_min=12, commission_max=18 WHERE plan_key='commission';