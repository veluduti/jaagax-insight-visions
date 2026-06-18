import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Trophy, Clock, Target, ShieldCheck, Star, MapPin, Loader2, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  successScoreService,
  SuccessScore as SuccessScoreType,
  Grade,
} from "@/services/successScoreService";
import { toast } from "sonner";

const ICONS: Record<string, any> = {
  response_time: Clock,
  conversion_rate: Target,
  verified_listings: ShieldCheck,
  customer_rating: Star,
  visit_success_rate: MapPin,
};

const gradeClass = (g: Grade) => {
  if (g === "Excellent") return "bg-emerald-50 text-emerald-600 border-emerald-200";
  if (g === "Good") return "bg-indigo-50 text-indigo-600 border-indigo-200";
  if (g === "Average") return "bg-amber-50 text-amber-600 border-amber-200";
  return "bg-rose-50 text-rose-600 border-rose-200";
};

export default function SuccessScore() {
  const navigate = useNavigate();
  const [builderId, setBuilderId] = useState<string | null>(null);
  const [score, setScore] = useState<SuccessScoreType | null>(null);
  const [breakdown, setBreakdown] = useState<any[]>([]);
  const [history, setHistory] = useState<SuccessScoreType[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const [s, b, h] = await Promise.all([successScoreService.getSuccessScore(id), successScoreService.getScoreBreakdown(id), successScoreService.getScoreHistory(id)]);
      setScore(s);
      setBreakdown(b);
      setHistory(h);
    } catch (e: any) {
      toast.error(e.message || "Failed to load score");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: bp } = await supabase.from("builder_profiles").select("id").eq("user_id", user.id).maybeSingle();

        if (bp?.id) {
          setBuilderId(bp.id);
          load(bp.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading builder profile:", error);
        setLoading(false);
      }
    })();
  }, [load]);

  const handleRecalculate = async () => {
    if (!builderId) return;
    setRecalculating(true);
    try {
      await successScoreService.calculateScore(builderId);
      toast.success("Score recalculated");
      await load(builderId);
    } catch (e: any) {
      toast.error(e.message || "Recalculation failed");
    } finally {
      setRecalculating(false);
    }
  };

  const overall = score?.overall_score ?? 0;
  const maxHistory = Math.max(1, ...history.map((h) => h.overall_score));

  // ---- Loading State ----
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  // ---- No Builder Profile State ----
  if (!builderId) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto p-8 text-center shadow-sm border-border">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-2">Builder Profile Required</h2>
            <p className="text-muted-foreground mb-6">Create your builder profile first to view your success score.</p>
            <Button
              onClick={() => navigate("/add-builder-profile")}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Create Builder Profile
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Success Score</h1>
            <p className="text-muted-foreground">Your overall performance across key metrics</p>
          </div>
          <Button onClick={handleRecalculate} disabled={recalculating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${recalculating ? "animate-spin" : ""}`} />
            {recalculating ? "Calculating..." : "Recalculate"}
          </Button>
        </div>

        {/* Overall Score */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(overall / 100) * 282.74} 282.74`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Trophy className="h-6 w-6 text-primary mb-1" />
                <div className="text-3xl font-bold text-foreground">{overall}</div>
                <div className="text-xs text-muted-foreground">/ 100</div>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="text-sm text-muted-foreground">
                {score?.last_calculated
                  ? `Last calculated ${new Date(score.last_calculated).toLocaleString()}`
                  : "No score calculated yet. Click 'Recalculate' to generate your score."}
              </div>
              <Progress value={overall} className="h-2" />
              <p className="text-sm text-foreground">
                {overall >= 80
                  ? "🌟 Excellent performance! Keep up the great work!"
                  : overall >= 60
                    ? "👏 Good job! You're on the right track."
                    : overall >= 40
                      ? "📈 Keep improving! Focus on your weak areas."
                      : "🚀 Start building your presence to improve your score."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Breakdown Cards */}
        {breakdown.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {breakdown.map((m) => {
              const Icon = ICONS[m.key] || Target;
              return (
                <Card key={m.key} className="border-border shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                          <Icon className="h-4 w-4 text-foreground" />
                        </div>
                        <div className="font-medium text-foreground">{m.label}</div>
                      </div>
                      <Badge variant="outline" className={gradeClass(m.grade)}>
                        {m.grade}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {m.value}
                      {m.suffix}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-border shadow-sm">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No score data available. Click "Recalculate" to generate your first score.</p>
            </CardContent>
          </Card>
        )}

        {/* Score History */}
        {history.length > 1 && (
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Score History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-40">
                {history.slice(-12).map((h) => (
                  <div key={h.id} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-primary/80 rounded-t"
                      style={{ height: `${(h.overall_score / maxHistory) * 100}%` }}
                      title={`${h.overall_score}`}
                    />
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(h.last_calculated).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
