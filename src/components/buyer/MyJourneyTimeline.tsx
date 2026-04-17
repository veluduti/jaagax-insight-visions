import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Eye, Heart, Phone, Calendar, CheckCircle2, KeyRound,
  MoreVertical, ExternalLink, GitCompare, Trash2, Lightbulb, MapPin, Bed, Maximize2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Stage = "viewed" | "shortlisted" | "contacted" | "visit_scheduled" | "visited" | "booked";

interface JourneyEntry {
  id: string;
  property_id: string;
  stage: Stage;
  notes: string | null;
  viewed_at: string | null;
  shortlisted_at: string | null;
  contacted_at: string | null;
  visit_scheduled_at: string | null;
  visited_at: string | null;
  booked_at: string | null;
  property?: {
    id: string;
    title: string;
    city: string;
    locality: string;
    price: number;
    bhk: number | null;
    area_sqft: number | null;
    images: string[] | null;
  } | null;
}

const STAGES: { key: Stage; label: string; icon: any; color: string }[] = [
  { key: "viewed", label: "Viewed", icon: Eye, color: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
  { key: "shortlisted", label: "Shortlisted", icon: Heart, color: "bg-pink-500/10 text-pink-500 border-pink-500/30" },
  { key: "contacted", label: "Contacted", icon: Phone, color: "bg-amber-500/10 text-amber-500 border-amber-500/30" },
  { key: "visit_scheduled", label: "Visits Scheduled", icon: Calendar, color: "bg-purple-500/10 text-purple-500 border-purple-500/30" },
  { key: "visited", label: "Visited", icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" },
  { key: "booked", label: "Booked", icon: KeyRound, color: "bg-primary/10 text-primary border-primary/30" },
];

const STAGE_ORDER: Stage[] = STAGES.map((s) => s.key);
const FALLBACK_IMG = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400";

const formatPrice = (price: number) => {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(1)} L`;
  return `₹${price.toLocaleString()}`;
};

const MyJourneyTimeline = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<JourneyEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJourney = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // 1. Existing journey events
    const { data: events } = await (supabase as any)
      .from("buyer_journey_events")
      .select("*")
      .eq("user_id", user.id);

    const journeyMap = new Map<string, JourneyEntry>();
    (events || []).forEach((e: JourneyEntry) => journeyMap.set(e.property_id, e));

    // 2. Auto-feed from visit_bookings
    const { data: visits } = await supabase
      .from("visit_bookings")
      .select("property_id, status, visit_date, created_at")
      .eq("buyer_id", user.id);

    for (const v of visits || []) {
      if (!v.property_id) continue;
      const existing = journeyMap.get(v.property_id);
      const isVisited = v.status === "completed";
      const isScheduled = ["pending", "confirmed", "scheduled"].includes(v.status);
      const isBooked = v.status === "booked";

      let derivedStage: Stage = "visit_scheduled";
      if (isBooked) derivedStage = "booked";
      else if (isVisited) derivedStage = "visited";
      else if (isScheduled) derivedStage = "visit_scheduled";

      if (!existing) {
        // upsert into journey table
        const insertRow: any = {
          user_id: user.id,
          property_id: v.property_id,
          stage: derivedStage,
          visit_scheduled_at: v.created_at,
          visited_at: isVisited ? new Date().toISOString() : null,
          booked_at: isBooked ? new Date().toISOString() : null,
        };
        await (supabase as any).from("buyer_journey_events").upsert(insertRow, {
          onConflict: "user_id,property_id",
        });
        journeyMap.set(v.property_id, insertRow);
      } else {
        const curIdx = STAGE_ORDER.indexOf(existing.stage);
        const newIdx = STAGE_ORDER.indexOf(derivedStage);
        if (newIdx > curIdx) {
          await (supabase as any)
            .from("buyer_journey_events")
            .update({
              stage: derivedStage,
              visit_scheduled_at: existing.visit_scheduled_at || v.created_at,
              visited_at: isVisited ? new Date().toISOString() : existing.visited_at,
              booked_at: isBooked ? new Date().toISOString() : existing.booked_at,
            })
            .eq("id", existing.id);
          existing.stage = derivedStage;
        }
      }
    }

    // 3. Hydrate property data
    const propIds = Array.from(journeyMap.keys());
    if (propIds.length > 0) {
      const { data: props } = await supabase
        .from("properties")
        .select("id, title, city, locality, price, bhk, area_sqft, images")
        .in("id", propIds);
      const propMap = new Map((props || []).map((p) => [p.id, p]));
      journeyMap.forEach((entry, pid) => {
        entry.property = (propMap.get(pid) as any) || null;
      });
    }

    setEntries(Array.from(journeyMap.values()).filter((e) => e.property));
    setLoading(false);
  };

  useEffect(() => {
    loadJourney();
    if (!user) return;
    const channel = supabase
      .channel("journey-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "visit_bookings", filter: `buyer_id=eq.${user.id}` }, loadJourney)
      .on("postgres_changes", { event: "*", schema: "public", table: "buyer_journey_events", filter: `user_id=eq.${user.id}` }, loadJourney)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const moveStage = async (entry: JourneyEntry, newStage: Stage) => {
    const stamp: any = { stage: newStage };
    const tsField: Record<Stage, string> = {
      viewed: "viewed_at",
      shortlisted: "shortlisted_at",
      contacted: "contacted_at",
      visit_scheduled: "visit_scheduled_at",
      visited: "visited_at",
      booked: "booked_at",
    };
    stamp[tsField[newStage]] = new Date().toISOString();
    const { error } = await (supabase as any)
      .from("buyer_journey_events")
      .update(stamp)
      .eq("id", entry.id);
    if (error) {
      toast.error("Couldn't update stage");
      return;
    }
    toast.success(`Moved to ${STAGES.find((s) => s.key === newStage)?.label}`);
    loadJourney();
  };

  const removeEntry = async (entry: JourneyEntry) => {
    const { error } = await (supabase as any)
      .from("buyer_journey_events")
      .delete()
      .eq("id", entry.id);
    if (error) return toast.error("Couldn't remove");
    toast.success("Removed from journey");
    loadJourney();
  };

  const addToCompare = (propId: string) => {
    try {
      const stored = JSON.parse(localStorage.getItem("compareList") || "[]");
      if (stored.includes(propId)) return toast.info("Already in compare list");
      if (stored.length >= 4) return toast.error("Max 4 properties to compare");
      stored.push(propId);
      localStorage.setItem("compareList", JSON.stringify(stored));
      toast.success("Added to compare");
    } catch {
      toast.error("Couldn't add to compare");
    }
  };

  // Insights
  const counts: Record<Stage, number> = {
    viewed: 0, shortlisted: 0, contacted: 0, visit_scheduled: 0, visited: 0, booked: 0,
  };
  entries.forEach((e) => { counts[e.stage] = (counts[e.stage] || 0) + 1; });

  const totalStages = STAGES.length;
  const reachedStage = entries.length === 0 ? 0 :
    Math.max(...entries.map((e) => STAGE_ORDER.indexOf(e.stage))) + 1;
  const progressPct = Math.round((reachedStage / totalStages) * 100);

  const insights: { text: string; cta?: { label: string; action: () => void } }[] = [];
  if (counts.shortlisted >= 2) {
    insights.push({ text: `You've shortlisted ${counts.shortlisted} properties — compare them now`, cta: { label: "Compare", action: () => navigate("/compare") } });
  }
  if (counts.visited >= 1 && counts.booked === 0) {
    insights.push({ text: `You've visited ${counts.visited} ${counts.visited === 1 ? "property" : "properties"} — ready to book?` });
  }
  if (counts.visit_scheduled === 0 && counts.shortlisted >= 1) {
    insights.push({ text: "No visits scheduled yet — schedule your first visit", cta: { label: "Browse", action: () => navigate("/search") } });
  }
  if (entries.length === 0) {
    insights.push({ text: "Your journey starts here — explore properties to begin", cta: { label: "Explore", action: () => navigate("/search") } });
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">Loading your journey…</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                My Buying Journey
              </CardTitle>
              <CardDescription>Track your path from browsing to booking</CardDescription>
            </div>
            <div className="text-right min-w-[200px]">
              <div className="text-sm text-muted-foreground mb-1">
                You're <span className="font-semibold text-foreground">{progressPct}%</span> through your journey
              </div>
              <Progress value={progressPct} className="h-2" />
            </div>
          </div>
        </CardHeader>
        {insights.length > 0 && (
          <CardContent className="pt-0 space-y-2">
            {insights.map((ins, i) => (
              <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Lightbulb className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm flex-1">{ins.text}</p>
                {ins.cta && (
                  <Button size="sm" variant="outline" onClick={ins.cta.action}>
                    {ins.cta.label}
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-max">
          {STAGES.map((stage) => {
            const Icon = stage.icon;
            const stageEntries = entries.filter((e) => e.stage === stage.key);
            return (
              <div key={stage.key} className="w-72 shrink-0">
                <div className={`flex items-center justify-between p-3 rounded-t-xl border ${stage.color}`}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="font-semibold text-sm">{stage.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{stageEntries.length}</Badge>
                </div>
                <div className="bg-muted/30 rounded-b-xl border border-t-0 p-2 space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto">
                  {stageEntries.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center p-6">
                      No properties yet
                    </p>
                  ) : (
                    stageEntries.map((entry) => {
                      const p = entry.property!;
                      const curIdx = STAGE_ORDER.indexOf(entry.stage);
                      const nextStage = STAGE_ORDER[curIdx + 1];
                      return (
                        <Card key={entry.id} className="overflow-hidden hover:shadow-md transition-shadow">
                          <div className="relative aspect-video">
                            <img
                              src={p.images?.[0] || FALLBACK_IMG}
                              alt={p.title}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                            />
                            <div className="absolute top-2 right-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="secondary" className="h-7 w-7">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-background z-50">
                                  <DropdownMenuItem onClick={() => window.open(`/property/${p.id}`, "_blank")}>
                                    <ExternalLink className="h-3.5 w-3.5 mr-2" /> View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => addToCompare(p.id)}>
                                    <GitCompare className="h-3.5 w-3.5 mr-2" /> Add to Compare
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => navigate(`/visit/schedule?propertyId=${p.id}`)}>
                                    <Calendar className="h-3.5 w-3.5 mr-2" /> Schedule Visit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {STAGES.map((s) => (
                                    s.key !== entry.stage && (
                                      <DropdownMenuItem key={s.key} onClick={() => moveStage(entry, s.key)}>
                                        Move → {s.label}
                                      </DropdownMenuItem>
                                    )
                                  ))}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => removeEntry(entry)} className="text-destructive">
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          <CardContent className="p-3 space-y-2">
                            <div>
                              <h4 className="font-semibold text-sm line-clamp-1">{p.title}</h4>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />{p.locality}, {p.city}
                              </p>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-primary">{formatPrice(Number(p.price))}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {p.bhk && <span className="flex items-center gap-0.5"><Bed className="h-3 w-3" />{p.bhk}</span>}
                                {p.area_sqft && <span className="flex items-center gap-0.5"><Maximize2 className="h-3 w-3" />{p.area_sqft}</span>}
                              </div>
                            </div>
                            {nextStage && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-xs h-7"
                                onClick={() => moveStage(entry, nextStage)}
                              >
                                Move to {STAGES.find((s) => s.key === nextStage)?.label} →
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MyJourneyTimeline;
