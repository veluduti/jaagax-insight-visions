import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Sparkles, Search, Wallet, MapPin, Calendar, Heart, TrendingUp, DollarSign, Eye, Loader2,
  Target, LineChart, PiggyBank, Compass,
} from "lucide-react";
import { useAI, type SmartSuggestionGroup } from "@/hooks/useAI";
import { openInNewTab, propertyPath } from "@/lib/openInNewTab";

const GROUP_ICONS: Record<string, any> = {
  search: Search, budget: Wallet, location: MapPin, visit: Calendar, interest: Heart,
};

export function AIRecommendations() {
  const { suggestions, isLoading, getMatchScore, getPricePrediction, getInvestmentInsights, getNearbyOpportunities } = useAI();
  const [active, setActive] = useState<SmartSuggestionGroup | null>(null);
  const [aiOpen, setAiOpen] = useState<null | "match" | "price" | "invest" | "nearby">(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState<any>(null);

  // Pick first property across groups for AI feature demos
  const sampleProperty = useMemo(() => {
    for (const g of suggestions) if (g.properties[0]) return g.properties[0];
    return null;
  }, [suggestions]);

  const runAiFeature = async (kind: "match" | "price" | "invest" | "nearby") => {
    if (!sampleProperty) return;
    setAiOpen(kind); setAiLoading(true); setAiData(null);
    try {
      if (kind === "match") setAiData(await getMatchScore(sampleProperty.id));
      if (kind === "price") setAiData(await getPricePrediction(sampleProperty.id));
      if (kind === "invest") setAiData(await getInvestmentInsights(sampleProperty.id));
      if (kind === "nearby") setAiData(await getNearbyOpportunities(sampleProperty.id));
    } finally { setAiLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> AI Recommendations
        </h2>
        <p className="text-sm text-muted-foreground">Personalized property suggestions powered by AI.</p>
      </div>

      {/* Smart Suggestions */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Smart Suggestions</h3>
        {isLoading ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto h-5 w-5 animate-spin mb-2" /> Personalizing for you…
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {suggestions.map((g) => {
              const Icon = GROUP_ICONS[g.key] || Sparkles;
              return (
                <Card key={g.key} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="p-2 rounded-md bg-primary/10 w-fit"><Icon className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="font-medium text-sm">{g.title}</p>
                      <p className="text-2xl font-semibold">{g.count}</p>
                      <p className="text-xs text-muted-foreground">matching properties</p>
                    </div>
                    <Button size="sm" variant="outline" className="w-full" disabled={g.count === 0} onClick={() => setActive(g)}>
                      View All
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Features */}
      <div>
        <h3 className="text-lg font-semibold mb-3">AI Features</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AiFeatureCard icon={<Target className="h-5 w-5 text-emerald-500" />} title="Smart Match Score" desc="See how well a property fits your preferences." onClick={() => runAiFeature("match")} disabled={!sampleProperty} />
          <AiFeatureCard icon={<LineChart className="h-5 w-5 text-blue-500" />} title="Price Prediction" desc="Estimated 12-month price trajectory." onClick={() => runAiFeature("price")} disabled={!sampleProperty} />
          <AiFeatureCard icon={<PiggyBank className="h-5 w-5 text-amber-500" />} title="Investment Insights" desc="ROI, rental yield, appreciation." onClick={() => runAiFeature("invest")} disabled={!sampleProperty} />
          <AiFeatureCard icon={<Compass className="h-5 w-5 text-violet-500" />} title="Nearby Opportunities" desc="Similar properties in the area." onClick={() => runAiFeature("nearby")} disabled={!sampleProperty} />
        </div>
        {!sampleProperty && (
          <p className="text-xs text-muted-foreground mt-2">AI features unlock once we have matching properties for you.</p>
        )}
      </div>

      {/* Suggestion list modal */}
      <Dialog open={!!active} onOpenChange={() => setActive(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{active?.title}</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3">
            {active?.properties.map((p: any) => (
              <Card key={p.id} className="cursor-pointer hover:shadow-md" onClick={() => openInNewTab(propertyPath(p))}>
                <CardContent className="p-3 flex gap-3">
                  <img
                    src={(Array.isArray(p.images) ? p.images[0] : null) || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=300"}
                    alt={p.title}
                    onError={(e) => ((e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=300")}
                    className="h-20 w-20 rounded object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {[p.locality, p.city].filter(Boolean).join(", ")}
                    </p>
                    <p className="text-sm font-semibold mt-1">₹{Number(p.price).toLocaleString("en-IN")}</p>
                    <div className="flex gap-1 mt-1">
                      {p.bhk && <Badge variant="secondary" className="text-xs">{p.bhk} BHK</Badge>}
                      {p.type && <Badge variant="outline" className="text-xs">{p.type}</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI feature modal */}
      <Dialog open={!!aiOpen} onOpenChange={() => setAiOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {aiOpen === "match" && "Smart Match Score"}
              {aiOpen === "price" && "Price Prediction"}
              {aiOpen === "invest" && "Investment Insights"}
              {aiOpen === "nearby" && "Nearby Opportunities"}
            </DialogTitle>
          </DialogHeader>
          {sampleProperty && <p className="text-sm text-muted-foreground">For: {sampleProperty.title}</p>}
          {aiLoading ? (
            <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
          ) : (
            <div className="space-y-3 pt-2">
              {aiOpen === "match" && aiData && (
                <>
                  <div className="text-center">
                    <div className="text-5xl font-bold text-primary">{aiData.score}%</div>
                    <p className="text-sm text-muted-foreground">match with your preferences</p>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {aiData.reasons.map((r: string, i: number) => (
                      <li key={i} className="flex gap-2"><Sparkles className="h-4 w-4 text-primary shrink-0" /> {r}</li>
                    ))}
                  </ul>
                </>
              )}
              {aiOpen === "price" && aiData && (
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Current" value={`₹${Number(aiData.current).toLocaleString("en-IN")}`} />
                  <Stat label={`Predicted (${aiData.period})`} value={`₹${Number(aiData.predicted).toLocaleString("en-IN")}`} accent />
                  <Stat label="Expected change" value={`+${aiData.change}%`} accent />
                </div>
              )}
              {aiOpen === "invest" && aiData && (
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="Total ROI" value={`${aiData.roi}%`} accent />
                  <Stat label="Rental Yield" value={`${aiData.rentalYield}%`} />
                  <Stat label="Appreciation" value={`${aiData.appreciation}%`} />
                </div>
              )}
              {aiOpen === "nearby" && Array.isArray(aiData) && (
                aiData.length === 0 ? <p className="text-sm text-muted-foreground">No similar properties nearby.</p> :
                <div className="space-y-2">
                  {aiData.map((p: any) => (
                    <Card key={p.id} className="cursor-pointer hover:shadow-sm" onClick={() => openInNewTab(propertyPath(p))}>
                      <CardContent className="p-3 flex justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{[p.locality, p.city].filter(Boolean).join(", ")}</p>
                        </div>
                        <span className="text-sm font-semibold shrink-0">₹{Number(p.price).toLocaleString("en-IN")}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AiFeatureCard({ icon, title, desc, onClick, disabled }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="p-2 rounded-md bg-muted w-fit">{icon}</div>
        <div>
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        <Button size="sm" variant="outline" className="w-full" onClick={onClick} disabled={disabled}>
          <Eye className="h-3.5 w-3.5 mr-1" /> Preview
        </Button>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-md border p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={"text-lg font-semibold " + (accent ? "text-primary" : "")}>{value}</p>
    </div>
  );
}

export default AIRecommendations;
