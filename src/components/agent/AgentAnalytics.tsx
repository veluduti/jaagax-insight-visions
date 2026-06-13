import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function AgentAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [correlation, setCorrelation] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Properties owned by agent
      const { data: props } = await (supabase as any)
        .from("properties").select("id, views_count, created_at, price").eq("submitted_by", user.id);

      // Visits for those properties
      const propIds = (props || []).map((p: any) => p.id);
      let visits: any[] = [];
      if (propIds.length) {
        const { data: v } = await (supabase as any)
          .from("visit_bookings").select("id, status, created_at, property_id").in("property_id", propIds);
        visits = v || [];
      }

      // Funnel: Views → Visits Scheduled → Visits Completed → Closed
      const totalViews = (props || []).reduce((s: number, p: any) => s + (p.views_count || 0), 0);
      const scheduled = visits.length;
      const completed = visits.filter((v) => v.status === "completed").length;
      const closed = visits.filter((v) => v.status === "closed").length;
      setFunnel([
        { stage: "Views", value: totalViews },
        { stage: "Scheduled", value: scheduled },
        { stage: "Completed", value: completed },
        { stage: "Closed", value: closed },
      ]);

      // Monthly trends (last 6 months)
      const months: Record<string, { month: string; visits: number; views: number }> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleDateString("en-IN", { month: "short" });
        months[key] = { month: key, visits: 0, views: 0 };
      }
      visits.forEach((v) => {
        const k = new Date(v.created_at).toLocaleDateString("en-IN", { month: "short" });
        if (months[k]) months[k].visits += 1;
      });
      (props || []).forEach((p: any) => {
        const k = new Date(p.created_at).toLocaleDateString("en-IN", { month: "short" });
        if (months[k]) months[k].views += p.views_count || 0;
      });
      setMonthly(Object.values(months));

      // Revenue breakdown (by listing type)
      const { data: txs } = await (supabase as any)
        .from("wallet_transactions").select("amount, type, description")
        .eq("user_id", user.id).eq("type", "credit");
      const buckets: Record<string, number> = {};
      (txs || []).forEach((t: any) => {
        const k = (t.description || "Other").split(" ")[0];
        buckets[k] = (buckets[k] || 0) + Number(t.amount || 0);
      });
      setRevenue(Object.entries(buckets).map(([name, value]) => ({ name, value })).slice(0, 5));

      // Views vs Visits correlation per property (top 5)
      const corr = (props || []).slice(0, 5).map((p: any) => ({
        name: p.id.slice(0, 6),
        views: p.views_count || 0,
        visits: visits.filter((v) => v.property_id === p.id).length,
      }));
      setCorrelation(corr);

      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Advanced Analytics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold mb-2">Lead Conversion Funnel</h4>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={funnel}>
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Monthly Trends</h4>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={monthly}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip /><Legend />
                <Line dataKey="views" stroke="hsl(var(--primary))" />
                <Line dataKey="visits" stroke="#10b981" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">Revenue Breakdown</h4>
            <div className="h-48">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={revenue} dataKey="value" nameKey="name" outerRadius={60} label>
                    {revenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2">Views vs Visits</h4>
            <div className="h-48">
              <ResponsiveContainer>
                <BarChart data={correlation}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend />
                  <Bar dataKey="views" fill="hsl(var(--primary))" />
                  <Bar dataKey="visits" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
