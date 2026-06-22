import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Log = {
  response_time_avg: number | null;
  conversion_rate: number | null;
  verified_listings: number | null;
  avg_customer_rating: number | null;
  visit_success_rate: number | null;
  success_score: number | null;
  calculated_at: string;
};

const Ring = ({ label, value, max = 100, suffix = "" }: { label: string; value: number; max?: number; suffix?: string }) => {
  const pct = Math.min(100, (value / max) * 100);
  const r = 36;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <circle
          cx="45" cy="45" r={r} fill="none"
          stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
          transform="rotate(-90 45 45)"
        />
        <text x="45" y="50" textAnchor="middle" className="fill-foreground text-sm font-bold">{value}{suffix}</text>
      </svg>
      <p className="text-xs text-muted-foreground text-center">{label}</p>
    </div>
  );
};

/**
 * Compute live metrics from the agent's actual activity and upsert a log row,
 * so the success score reflects real work (ratings, verified listings, visits).
 */
async function computeAndPersistMetrics(userId: string): Promise<Log> {
  // 1) Resolve the agent row for this user
  const { data: agent } = await supabase
    .from("agents")
    .select("id, avg_rating, total_ratings")
    .eq("user_id", userId)
    .maybeSingle();

  const agentId = (agent as any)?.id as string | undefined;

  // 2) Properties submitted / verified by this user
  const { data: props } = await supabase
    .from("properties")
    .select("id, verification_status, assigned_agent_id")
    .or(`submitted_by.eq.${userId}${agentId ? `,assigned_agent_id.eq.${agentId}` : ""}`);
  const propsList = (props as any[]) || [];
  const verified_listings = propsList.filter(
    (p) => p.verification_status === "verified" || p.verification_status === "approved",
  ).length;

  // 3) Visits handled by this agent
  let visit_success_rate = 0;
  let conversion_rate = 0;
  let response_time_avg = 0;
  if (agentId) {
    const { data: visits } = await supabase
      .from("visit_bookings")
      .select("status, created_at, scheduled_at")
      .eq("agent_id", agentId);
    const vs = (visits as any[]) || [];
    if (vs.length) {
      const completed = vs.filter((v) => v.status === "completed" || v.status === "verified").length;
      visit_success_rate = Math.round((completed / vs.length) * 100);
      conversion_rate = propsList.length
        ? Math.round((completed / propsList.length) * 100)
        : 0;
      const diffs = vs
        .filter((v) => v.scheduled_at && v.created_at)
        .map((v) => (new Date(v.scheduled_at).getTime() - new Date(v.created_at).getTime()) / 60000)
        .filter((d) => d > 0 && d < 60 * 24 * 7);
      if (diffs.length) {
        response_time_avg = Math.round(diffs.reduce((s, d) => s + d, 0) / diffs.length);
      }
    }
  }

  // 4) Customer rating — prefer agents.avg_rating (kept fresh by trigger),
  //    fallback to live aggregate from agent_ratings
  let avg_customer_rating = Number((agent as any)?.avg_rating || 0);
  if (!avg_customer_rating && agentId) {
    const { data: ratings } = await supabase
      .from("agent_ratings")
      .select("rating")
      .eq("agent_id", agentId);
    const list = (ratings as any[]) || [];
    if (list.length) {
      avg_customer_rating = Number(
        (list.reduce((s, r) => s + Number(r.rating || 0), 0) / list.length).toFixed(2),
      );
    }
  }

  // 5) Overall score (weighted 0-100)
  const responsePct = Math.max(0, Math.min(100, 100 - response_time_avg / 6)); // 0min=100, 600min=0
  const verifiedPct = propsList.length
    ? Math.min(100, (verified_listings / propsList.length) * 100)
    : 0;
  const ratingPct = (avg_customer_rating / 5) * 100;
  const success_score = Math.round(
    responsePct * 0.2 + conversion_rate * 0.25 + verifiedPct * 0.2 + ratingPct * 0.2 + visit_success_rate * 0.15,
  );

  const payload = {
    user_id: userId,
    agent_id: agentId ?? null,
    response_time_avg,
    conversion_rate,
    verified_listings,
    avg_customer_rating,
    visit_success_rate,
    success_score,
    calculated_at: new Date().toISOString(),
  };

  // Best-effort insert — failure shouldn't break the UI
  try {
    await (supabase as any).from("agent_success_logs").insert(payload);
  } catch (e) {
    console.warn("agent_success_logs insert failed:", e);
  }

  return payload as Log;
}

export default function AgentSuccessScore() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Always recompute on mount so the dashboard reflects fresh activity
      const live = await computeAndPersistMetrics(user.id);
      const { data } = await (supabase as any)
        .from("agent_success_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("calculated_at", { ascending: false })
        .limit(12);
      const history = ((data || []) as Log[]);
      setLogs(history.length ? history : [live]);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  const latest = logs[0] || {
    response_time_avg: 0, conversion_rate: 0, verified_listings: 0,
    avg_customer_rating: 0, visit_success_rate: 0, success_score: 0, calculated_at: "",
  };

  const chartData = [...logs].reverse().map((l) => ({
    date: new Date(l.calculated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    score: l.success_score || 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Agent Success Score</CardTitle>
        <p className="text-sm text-muted-foreground">Overall: <span className="text-2xl font-bold text-primary">{latest.success_score || 0}/100</span></p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Ring label="Response (min)" value={Number(latest.response_time_avg || 0)} max={60} />
          <Ring label="Conversion %" value={Number(latest.conversion_rate || 0)} suffix="%" />
          <Ring label="Verified Listings" value={Number(latest.verified_listings || 0)} max={50} />
          <Ring label="Rating" value={Number(latest.avg_customer_rating || 0)} max={5} />
          <Ring label="Visit Success %" value={Number(latest.visit_success_rate || 0)} suffix="%" />
        </div>

        {chartData.length > 1 && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
