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

export default function AgentSuccessScore() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("agent_success_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("calculated_at", { ascending: false })
        .limit(12);
      setLogs((data || []) as Log[]);
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
