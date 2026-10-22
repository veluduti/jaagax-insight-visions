import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import AssistantPanel from "@/components/hospitality/AssistantPanel";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { loadGrowth, applyPrice, type GrowthData } from "@/services/hospitality/growthService";

const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
export default function PartnerGrowth() {
  const { loading, hotelId, hotelName } = usePartnerHotel();
  const [d, setD] = useState<GrowthData | null>(null);

  const load = useCallback(() => { if (hotelId) loadGrowth(hotelId).then(setD).catch((e) => toast.error(e.message)); }, [hotelId]);
  useEffect(() => { load(); }, [load]);
  const run = async (fn: () => Promise<unknown>, msg: string) => { try { await fn(); toast.success(msg); load(); } catch (e: any) { toast.error(e.message); } };

  const context = d ? `Property: ${hotelName}. Listing score ${d.score}%. Missing: ${d.checks.filter((c) => !c.done).map((c) => c.label).join("; ") || "none"}. Next 30 days booked: ${Math.round(d.occupancy30 * 100)}%. Rating: ${d.avgRating?.toFixed(1) ?? "no reviews"} (${d.reviewCount} reviews, ${d.unanswered} unanswered). Active offers: ${d.offers.filter((o) => o.is_active).length}.` : undefined;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PartnerNav /><PartnerSubNav />
      <main className="container mx-auto max-w-3xl px-3 py-4">
        <h1 className="text-xl font-bold">Grow your bookings</h1>
        <p className="mb-3 text-sm text-muted-foreground">Simple tips to fill more rooms: better listing, right prices and offers.</p>

        {loading || !d ? <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-primary" /> : (
          <>
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[["Listing score", `${d.score}%`], ["Booked (30 days)", `${Math.round(d.occupancy30 * 100)}%`], ["Rating", d.avgRating ? `${d.avgRating.toFixed(1)} ★` : "—"], ["Reviews to answer", d.unanswered]].map(([l, v]) => (
                <Card key={l as string}><CardContent className="p-3"><div className="text-xs text-muted-foreground">{l}</div><div className="text-xl font-bold">{v}</div></CardContent></Card>
              ))}
            </div>

            <Tabs defaultValue="listing">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="listing">Listing</TabsTrigger>
                <TabsTrigger value="prices">Prices</TabsTrigger>
                <TabsTrigger value="helper">Helper</TabsTrigger>
              </TabsList>

              <TabsContent value="listing" className="space-y-2">
                <Progress value={d.score} className="h-2" />
                {d.checks.map((c) => (
                  <Card key={c.key}><CardContent className="flex items-start gap-3 p-3">
                    {c.done ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" /> : <Circle className="mt-0.5 h-5 w-5 text-muted-foreground" />}
                    <div className="flex-1"><div className="font-medium">{c.label}</div>{!c.done && <div className="text-xs text-muted-foreground">{c.hint}</div>}</div>
                    {!c.done && <Button asChild size="sm" variant="outline"><Link to={c.link}>Fix</Link></Button>}
                  </CardContent></Card>
                ))}
                {d.unanswered > 0 && <Button asChild variant="outline" className="w-full"><Link to="/partners/inbox">Reply to {d.unanswered} review(s)</Link></Button>}
              </TabsContent>

              <TabsContent value="prices" className="space-y-2">
                {d.tips.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Your prices look right for the next 30 days. Check again next week.</p>}
                {d.tips.map((t) => (
                  <Card key={t.roomId}><CardContent className="space-y-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{t.name}</div>
                      <Badge variant="secondary">{Math.round(t.occupancy * 100)}% booked</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {t.suggested > t.current ? <TrendingUp className="h-4 w-4 text-primary" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
                      {inr(t.current)} → <b>{inr(t.suggested)}</b> / night
                    </div>
                    <p className="text-xs text-muted-foreground">{t.reason}</p>
                    <Button size="sm" onClick={() => run(() => applyPrice(t.roomId, t.suggested), "Price updated")}>Use {inr(t.suggested)}</Button>
                  </CardContent></Card>
                ))}
              </TabsContent>

              <TabsContent value="helper"><AssistantPanel role="owner" context={context} /></TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
