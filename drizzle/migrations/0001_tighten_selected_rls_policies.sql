DROP POLICY IF EXISTS "rp readable" ON public.role_permissions;
CREATE POLICY "rp admin read" ON public.role_permissions FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "roles readable" ON public.roles;
CREATE POLICY "roles admin read" ON public.roles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "permissions readable" ON public.permissions;
CREATE POLICY "permissions admin read" ON public.permissions FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "notifications_insert_system_v2" ON public.notifications;

DROP POLICY IF EXISTS "read assigned agents" ON public.assigned_agents;
CREATE POLICY "assigned agent stakeholders read" ON public.assigned_agents FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND (p.submitted_by = auth.uid() OR p.assigned_agent_id = auth.uid()))
  OR EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.user_id = auth.uid())
);

DROP POLICY IF EXISTS "System can manage tracking" ON public.referral_tracking;
CREATE POLICY "referral participants read" ON public.referral_tracking FOR SELECT TO authenticated USING (referrer_id = auth.uid() OR visitor_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "referral participants insert" ON public.referral_tracking FOR INSERT TO authenticated WITH CHECK (referrer_id = auth.uid() OR visitor_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "referral participants update" ON public.referral_tracking FOR UPDATE TO authenticated USING (referrer_id = auth.uid() OR visitor_id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (referrer_id = auth.uid() OR visitor_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "referral admin delete" ON public.referral_tracking FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "System can manage badges" ON public.user_badges;
CREATE POLICY "admin manages badges" ON public.user_badges FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "activity system insert" ON public.admin_activity_log;
CREATE POLICY "activity actor insert" ON public.admin_activity_log FOR INSERT TO authenticated WITH CHECK (actor_user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "audit_insert_authenticated" ON public.property_audit_log;
CREATE POLICY "audit stakeholder insert" ON public.property_audit_log FOR INSERT TO authenticated WITH CHECK (
  actor_id = auth.uid() AND (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.properties p WHERE p.id = property_id AND (p.submitted_by = auth.uid() OR p.assigned_agent_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Anyone can insert property events" ON public.property_events;
CREATE POLICY "stakeholders insert property events" ON public.property_events FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.properties p WHERE p.id = property_id AND (p.submitted_by = auth.uid() OR p.builder_id = auth.uid() OR p.assigned_agent_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Anyone can log promo events" ON public.promotion_events;
CREATE POLICY "users log own promo events" ON public.promotion_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "leads_insert_anyone" ON public.property_leads;
CREATE POLICY "guests and users create valid leads" ON public.property_leads FOR INSERT TO anon, authenticated WITH CHECK (
  property_id IS NOT NULL
  AND ((auth.uid() IS NULL AND lead_user_id IS NULL) OR (auth.uid() IS NOT NULL AND lead_user_id = auth.uid()))
  AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.submitted_by = owner_id)
);

DROP POLICY IF EXISTS "leads_read_all_auth" ON public.financial_leads;
CREATE POLICY "financial lead stakeholders read" ON public.financial_leads FOR SELECT TO authenticated USING (
  source_user_id = auth.uid()
  OR district_admin_id = auth.uid()
  OR purchased_by_provider_id IN (SELECT fp.id FROM public.financial_providers fp WHERE fp.user_id = auth.uid())
  OR public.is_admin(auth.uid())
);
DROP POLICY IF EXISTS "leads_insert_auth" ON public.financial_leads;
CREATE POLICY "users create own financial leads" ON public.financial_leads FOR INSERT TO authenticated WITH CHECK (source_user_id = auth.uid());

DROP POLICY IF EXISTS "fla_provider_update" ON public.financial_loan_applications;
CREATE POLICY "fla_provider_update" ON public.financial_loan_applications FOR UPDATE TO authenticated USING (
  buyer_id = auth.uid() OR provider_id IN (SELECT fp.id FROM public.financial_providers fp WHERE fp.user_id = auth.uid()) OR public.is_admin(auth.uid())
) WITH CHECK (
  buyer_id = auth.uid() OR provider_id IN (SELECT fp.id FROM public.financial_providers fp WHERE fp.user_id = auth.uid()) OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "fld_update" ON public.financial_loan_documents;
CREATE POLICY "fld_update" ON public.financial_loan_documents FOR UPDATE TO authenticated USING (
  public.is_financial_owner(application_id) OR public.is_financial_buyer(application_id) OR public.is_admin(auth.uid())
) WITH CHECK (
  public.is_financial_owner(application_id) OR public.is_financial_buyer(application_id) OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "fn_owner" ON public.financial_notifications;
CREATE POLICY "fn_owner" ON public.financial_notifications FOR ALL TO authenticated USING (
  provider_id IN (SELECT fp.id FROM public.financial_providers fp WHERE fp.user_id = auth.uid()) OR public.is_admin(auth.uid())
) WITH CHECK (
  provider_id IN (SELECT fp.id FROM public.financial_providers fp WHERE fp.user_id = auth.uid()) OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "fp_owner_update" ON public.financial_providers;
CREATE POLICY "fp_owner_update" ON public.financial_providers FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "fp_public_read" ON public.financial_providers;
CREATE POLICY "financial providers authenticated read" ON public.financial_providers FOR SELECT TO authenticated USING (is_active = true OR user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "enquiry create" ON public.hotel_extra_service_enquiries;
CREATE POLICY "enquiry create" ON public.hotel_extra_service_enquiries FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "hotel_remarks public read" ON public.hotel_remarks;
CREATE POLICY "hotel members read remarks" ON public.hotel_remarks FOR SELECT TO authenticated USING (public.is_hotel_member(hotel_id, auth.uid()) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "channels readable" ON public.notification_channels;
CREATE POLICY "channels admin read" ON public.notification_channels FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can read workflow settings" ON public.workflow_settings;
CREATE POLICY "admins read workflow settings" ON public.workflow_settings FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "anyone can log landing signal" ON public.nl_landing_signals;
CREATE POLICY "visitors log bound landing signals" ON public.nl_landing_signals FOR INSERT TO anon, authenticated WITH CHECK ((auth.uid() IS NULL AND user_id IS NULL) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated upload builder profile media" ON storage.objects;
CREATE POLICY "Authenticated upload builder profile media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'property-images' AND (storage.foldername(name))[1] = 'builder-profiles' AND owner_id = auth.uid()::text
);

DROP POLICY IF EXISTS "RERA docs are publicly readable" ON storage.objects;
CREATE POLICY "RERA owners and admins read documents" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'rera-documents' AND (owner_id = auth.uid()::text OR public.is_admin(auth.uid()))
);