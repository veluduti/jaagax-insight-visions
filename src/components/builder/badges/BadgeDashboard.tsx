import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock, CheckCircle2 } from "lucide-react";
import * as Icons from "lucide-react";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import badgeService, { BadgeDefinition, BuilderMetrics } from "@/services/badgeService";
import BadgeDisplay from "./BadgeDisplay";

const sb = supabase as any;
const getIcon = (name?: string | null) => (Icons as any)[name || "Shield"] ?? Icons.Shield;

export default function BadgeDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [builderProfileId, setBuilderProfileId] = useState<string | null>(null);
  const [allBadges, setAllBadges] = useState<BadgeDefinition[]>([]);
  const [current, setCurrent] = useState<BadgeDefinition | null>(null);
  const [next, setNext] = useState<BadgeDefinition | null>(null);
  const [progress, setProgress] = useState(0);
  const [metrics, setMetrics] = useState<BuilderMetrics>({ properties: 0, reviews: 0, avg_rating: 0 });

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: bp } = await sb
          .from("builder_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!bp) {
          const all = await badgeService.getAllBadges();
          setAllBadges(all);
          setCurrent(all[0] ?? null);
          setLoading(false);
          return;
        }
        setBuilderProfileId(bp.id);
        const p = await badgeService.getBadgeProgress(bp.id);
        setAllBadges(p.allBadges);
        setCurrent(p.current);
        setNext(p.next);
        setProgress(p.progress);
        setMetrics(p.metrics);
      } catch (e: any) {
        toast({ title: "Failed to load badges", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const refresh = async () => {
    if (!builderProfileId) return;
    const updated = await badgeService.checkAndUpdateBadge(builderProfileId);
    const p = await badgeService.getBadgeProgress(builderProfileId);
    setCurrent(updated || p.current);
    setNext(p.next);
    setProgress(p.progress);
    toast({ title: "Badge updated", description: updated?.name ?? "No badge earned yet" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Badges</h1>
            <p className="text-muted-foreground text-sm">Build trust with buyers as you grow.</p>
          </div>
          {builderProfileId && (
            <Button variant="outline" onClick={refresh}>
              Recalculate
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <BadgeDisplay current={current} next={next} progress={progress} metrics={metrics} />
            </motion.div>

            <div className="mt-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">Badge Roadmap</h2>
              <div className="space-y-3">
                {allBadges.map((b) => {
                  const Icon = getIcon(b.icon);
                  const unlocked =
                    metrics.properties >= b.min_properties &&
                    metrics.reviews >= b.min_reviews &&
                    metrics.avg_rating >= b.min_rating;
                  const isCurrent = current?.id === b.id;
                  return (
                    <Card
                      key={b.id}
                      className={`border-border shadow-sm transition ${isCurrent ? "ring-2 ring-primary" : ""}`}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${b.color}20`, color: b.color || undefined }}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground">{b.name}</span>
                            <Badge variant="outline">Tier {b.tier}</Badge>
                            {isCurrent && <Badge className="bg-primary text-primary-foreground">Current</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {b.min_properties}+ properties · {b.min_reviews}+ reviews · {b.min_rating}+ rating
                          </p>
                        </div>
                        {unlocked ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <Lock className="h-5 w-5 text-muted-foreground" />
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <Card className="mt-8 border-border shadow-sm">
              <CardContent className="p-6 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-foreground">{metrics.properties}</p>
                  <p className="text-xs text-muted-foreground">Properties</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{metrics.reviews}</p>
                  <p className="text-xs text-muted-foreground">Reviews</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{metrics.avg_rating.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Avg Rating</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
