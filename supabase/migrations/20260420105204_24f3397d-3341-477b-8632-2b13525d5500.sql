-- Property-scoped chat between agent and seller/owner
CREATE TABLE public.property_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  agent_user_id UUID NOT NULL,
  seller_user_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pcm_property ON public.property_chat_messages(property_id, created_at);
CREATE INDEX idx_pcm_participants ON public.property_chat_messages(agent_user_id, seller_user_id);

ALTER TABLE public.property_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages"
ON public.property_chat_messages FOR SELECT
TO authenticated
USING (auth.uid() = agent_user_id OR auth.uid() = seller_user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Participants can send messages"
ON public.property_chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND (auth.uid() = agent_user_id OR auth.uid() = seller_user_id)
);

CREATE POLICY "Participants can mark read"
ON public.property_chat_messages FOR UPDATE
TO authenticated
USING (auth.uid() = agent_user_id OR auth.uid() = seller_user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.property_chat_messages;
ALTER TABLE public.property_chat_messages REPLICA IDENTITY FULL;