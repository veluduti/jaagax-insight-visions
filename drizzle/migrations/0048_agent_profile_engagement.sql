-- Meeting requests booked from the public agent profile
CREATE TABLE public.agent_meeting_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  requester_user_id UUID NOT NULL,
  requester_name TEXT NOT NULL,
  requester_contact TEXT,
  preferred_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.agent_meeting_requests TO authenticated;
GRANT ALL ON public.agent_meeting_requests TO service_role;
ALTER TABLE public.agent_meeting_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Requesters can create meeting requests"
  ON public.agent_meeting_requests FOR INSERT TO authenticated
  WITH CHECK (requester_user_id = auth.uid());
CREATE POLICY "Requesters can view own meeting requests"
  ON public.agent_meeting_requests FOR SELECT TO authenticated
  USING (requester_user_id = auth.uid());
CREATE POLICY "Agents can view their meeting requests"
  ON public.agent_meeting_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.user_id = auth.uid()));
CREATE POLICY "Agents can update their meeting requests"
  ON public.agent_meeting_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.user_id = auth.uid()));

-- Enquiries sent from the public agent profile contact form
CREATE TABLE public.agent_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.agent_inquiries TO authenticated;
GRANT ALL ON public.agent_inquiries TO service_role;
ALTER TABLE public.agent_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Senders can create inquiries"
  ON public.agent_inquiries FOR INSERT TO authenticated
  WITH CHECK (sender_user_id = auth.uid());
CREATE POLICY "Senders can view own inquiries"
  ON public.agent_inquiries FOR SELECT TO authenticated
  USING (sender_user_id = auth.uid());
CREATE POLICY "Agents can view their inquiries"
  ON public.agent_inquiries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.user_id = auth.uid()));

-- Agent-managed FAQs shown on the public profile
CREATE TABLE public.agent_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agent_faqs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_faqs TO authenticated;
GRANT ALL ON public.agent_faqs TO service_role;
ALTER TABLE public.agent_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read agent FAQs"
  ON public.agent_faqs FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "Agents can manage their FAQs"
  ON public.agent_faqs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.user_id = auth.uid()));
CREATE POLICY "Agents can update their FAQs"
  ON public.agent_faqs FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.user_id = auth.uid()));
CREATE POLICY "Agents can delete their FAQs"
  ON public.agent_faqs FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.user_id = auth.uid()));