
-- Fix ad_interactions: remove wildcard insert, allow authenticated or anon with limitation
DROP POLICY IF EXISTS "Anyone can track ad interactions" ON public.ad_interactions;

CREATE POLICY "Users can track ad interactions" ON public.ad_interactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Allow anon to track interactions without user_id
CREATE POLICY "Anon can track anonymous interactions" ON public.ad_interactions FOR INSERT TO anon WITH CHECK (user_id IS NULL);
