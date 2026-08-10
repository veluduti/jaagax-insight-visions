import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles, CalendarClock, FileStack } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePostingEntitlement } from "@/hooks/usePostingEntitlement";

export default function AgentTrialStatusCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { entitlement, loading } = usePostingEntitlement();
  const [settings, setSettings] = useState<any>(null);
  const [drafts, setDrafts] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ data: cfg }, { count }] = await Promise.all([
        (supabase as any).from("platform_pricing_settings").select("*").limit(1).maybeSingle(),
        user
          ? (supabase as any)
              .from("properties")
              .select("id", { count: "exact", head: true })
              .eq("submitted_by", user.id)
              .eq("is_draft", true)
          : Promise.resolve({ count: 0 }),
      ]);
      setSettings(cfg);
      setDrafts(count || 0);
    })();
  }, [user]);

  if (loading)
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="animate-spin" />
      </div>
    );

  if (!entitlement?.is_agent) return null;

  const trialDays = Number(settings?.agent_trial_days || 0);
  const trialPosts = Number(settings?.agent_trial_free_posts || 0);
  const daysLeft = Number(entitlement.trial_days_remaining || 0);
  const postsLeft = Number(entitlement.trial_posts_remaining || 0);
  const active = !!entitlement.trial_active;

  return (
    <Card className="border-emerald-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" /> Free Trial
          </CardTitle>
          {active ? (
            <Badge className="bg-emerald-600">Active</Badge>
          ) : entitlement.has_agent_subscription ? (
            <Badge className="bg-yellow-600">Subscribed</Badge>
          ) : (
            <Badge variant="outline">Expired</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarClock className="h-4 w-4" /> Days remaining
              </span>
              <span className="font-semibold">
                {daysLeft} / {trialDays}
              </span>
            </div>
            <Progress value={trialDays ? (daysLeft / trialDays) * 100 : 0} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <FileStack className="h-4 w-4" /> Free posts left
              </span>
              <span className="font-semibold">
                {postsLeft} / {trialPosts}
              </span>
            </div>
            <Progress value={trialPosts ? (postsLeft / trialPosts) * 100 : 0} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t text-sm">
          <span className="text-muted-foreground">
            {drafts > 0 ? `${drafts} draft listing${drafts > 1 ? "s" : ""} ready to publish` : "No draft listings"}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate("/sell-property")}>
              Post property
            </Button>
          </div>
        </div>

        {!active && !entitlement.has_agent_subscription && (
          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm">
            Your free trial has ended. Subscribe below to continue posting properties.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
