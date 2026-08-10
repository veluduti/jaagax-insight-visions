import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Compact market snapshot shown in the right rail of the Customer dashboard. */
export default function MarketInsightsCard() {
  const navigate = useNavigate();
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { count } = await (supabase as any)
          .from("properties")
          .select("id", { count: "exact", head: true })
          .in("status", ["live", "live_verified"]);
        if (!cancelled) setLiveCount(count ?? 0);
      } catch {
        /* non-blocking */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    { value: "+12%", label: "Price Growth (%)" },
    { value: String(liveCount), label: "Market Liquidity" },
    { value: "45 Days", label: "Avg. Days to Market" },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-primary" />
          Market Insights
        </CardTitle>
        <Button variant="link" size="sm" className="h-auto p-0" onClick={() => navigate("/market-insights")}>
          Details
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-muted/40 p-3 text-center">
            <div className="text-lg font-bold leading-tight">{s.value}</div>
            <div className="mt-1 text-[11px] leading-tight text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
