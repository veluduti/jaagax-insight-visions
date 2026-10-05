import { useEffect, useMemo, useState } from "react";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { listMatchesForHotel, type MatchReason } from "@/services/hospitality/matchingService";

export default function PartnerDemand() {
  const ctx = usePartnerHotel();
  const [rows, setRows] = useState<Array<{ id: string; score: number; reasons: MatchReason[]; price_quote: number | null; created_at: string }> | null>(null);

  useEffect(() => {
    if (ctx.hotelId) listMatchesForHotel(ctx.hotelId, 100).then(setRows).catch(() => setRows([]));
  }, [ctx.hotelId]);

  const topReasons = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) for (const x of r.reasons ?? []) {
      const key = x.label.replace(/[\d.,₹]+/g, "#").replace(/\(.*\)/, "").trim();
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [rows]);

  return (
    <div className="min-h-screen bg-background">
      <PartnerNav />
      <PartnerSubNav />
      <main className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <h1 className="text-2xl font-bold">Demand & Matches</h1>
        {!rows ? <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="Times shown to customers" value={rows.length} />
              <Stat label="Average match score" value={rows.length ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length) : 0} />
              <Stat label="Average quoted price" value={rows.length ? `₹${Math.round(rows.reduce((s, r) => s + (r.price_quote ?? 0), 0) / rows.length).toLocaleString("en-IN")}` : "—"} />
            </div>
            <Card>
              <CardHeader><CardTitle className="text-lg">Why customers were matched to you</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {topReasons.length ? topReasons.map(([k, n]) => <Badge key={k} variant="secondary">{k} · {n}</Badge>) : <p className="text-sm text-muted-foreground">No matches yet. Complete your listing to appear in more searches.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Recent matches</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {rows.slice(0, 30).map((r) => (
                  <div key={r.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="mb-1 flex justify-between"><span className="font-medium">Score {r.score}</span><span className="text-muted-foreground">{new Date(r.created_at).toLocaleString("en-IN")}</span></div>
                    <ul className="list-inside list-disc text-muted-foreground">{(r.reasons ?? []).map((x, i) => <li key={i}>{x.label}</li>)}</ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></CardContent></Card>;
}
