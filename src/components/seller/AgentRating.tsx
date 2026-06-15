import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";

interface Props {
  agentId: string;
  compact?: boolean;
}

interface RatingRow {
  rating: number;
  comment: string | null;
  created_at: string;
}

export default function AgentRating({ agentId, compact = false }: Props) {
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [avg, setAvg] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const sb: any = supabase;
      const { data } = await sb
        .from("agent_ratings")
        .select("rating,comment,created_at")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(10);
      const rows = (data || []) as RatingRow[];
      setRatings(rows);
      setAvg(rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0);
      setLoading(false);
    };
    if (agentId) load();
  }, [agentId]);

  const breakdown = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: ratings.filter((r) => Math.round(r.rating) === stars).length,
  }));

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${i <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
          />
        ))}
        <span className="text-xs font-semibold ml-1">{avg.toFixed(1)}</span>
        <span className="text-xs text-muted-foreground">({ratings.length})</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Agent Performance Rating</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="text-4xl font-bold">{avg.toFixed(1)}</div>
              <div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${i <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{ratings.length} ratings</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {breakdown.map((b) => (
                <div key={b.stars} className="flex items-center gap-2 text-xs">
                  <span className="w-3">{b.stars}</span>
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: ratings.length ? `${(b.count / ratings.length) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className="w-6 text-right text-muted-foreground">{b.count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
