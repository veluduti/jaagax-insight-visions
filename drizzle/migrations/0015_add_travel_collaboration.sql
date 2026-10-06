CREATE TABLE public.travel_plan_collaborators (
 plan_id UUID NOT NULL REFERENCES public.travel_plans(id) ON DELETE CASCADE,
 user_id UUID NOT NULL,
 role TEXT NOT NULL DEFAULT 'member' CHECK(role IN('owner','editor','member','viewer')),
 invite_status TEXT NOT NULL DEFAULT 'pending' CHECK(invite_status IN('pending','accepted','declined')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(plan_id,user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_plan_collaborators TO authenticated;
GRANT ALL ON public.travel_plan_collaborators TO service_role;
ALTER TABLE public.travel_plan_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Collaborators view memberships" ON public.travel_plan_collaborators FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_admin(auth.uid()) OR EXISTS(SELECT 1 FROM public.travel_plans p WHERE p.id=plan_id AND p.user_id=auth.uid()));
CREATE POLICY "Plan owners manage collaborators" ON public.travel_plan_collaborators FOR ALL TO authenticated USING(public.is_admin(auth.uid()) OR user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.travel_plans p WHERE p.id=plan_id AND p.user_id=auth.uid())) WITH CHECK(public.is_admin(auth.uid()) OR user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.travel_plans p WHERE p.id=plan_id AND p.user_id=auth.uid()));

CREATE TABLE public.travel_plan_comments (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 plan_id UUID NOT NULL REFERENCES public.travel_plans(id) ON DELETE CASCADE,
 user_id UUID NOT NULL,
 body TEXT NOT NULL,
 plan_item_id UUID REFERENCES public.travel_plan_items(id) ON DELETE SET NULL,
 vote_value SMALLINT CHECK(vote_value IN(-1,1)),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_plan_comments TO authenticated;
GRANT ALL ON public.travel_plan_comments TO service_role;
ALTER TABLE public.travel_plan_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plan members view comments" ON public.travel_plan_comments FOR SELECT TO authenticated USING(public.is_admin(auth.uid()) OR user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.travel_plans p WHERE p.id=plan_id AND p.user_id=auth.uid()) OR EXISTS(SELECT 1 FROM public.travel_plan_collaborators c WHERE c.plan_id=travel_plan_comments.plan_id AND c.user_id=auth.uid() AND c.invite_status='accepted'));
CREATE POLICY "Plan members add comments" ON public.travel_plan_comments FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND (EXISTS(SELECT 1 FROM public.travel_plans p WHERE p.id=plan_id AND p.user_id=auth.uid()) OR EXISTS(SELECT 1 FROM public.travel_plan_collaborators c WHERE c.plan_id=travel_plan_comments.plan_id AND c.user_id=auth.uid() AND c.invite_status='accepted')));
CREATE POLICY "Users edit own comments" ON public.travel_plan_comments FOR UPDATE TO authenticated USING(user_id=auth.uid() OR public.is_admin(auth.uid())) WITH CHECK(user_id=auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users delete own comments" ON public.travel_plan_comments FOR DELETE TO authenticated USING(user_id=auth.uid() OR public.is_admin(auth.uid()));

CREATE INDEX travel_collaborators_user_idx ON public.travel_plan_collaborators(user_id,invite_status);
CREATE INDEX travel_comments_plan_idx ON public.travel_plan_comments(plan_id,created_at);