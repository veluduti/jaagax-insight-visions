import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Star, MessageSquare, Calendar, Search, Filter, TrendingUp, User } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface AgentRatingsProps {
  agentId: string;
}

interface RatingRow {
  id: string;
  agent_id: string;
  buyer_id: string;
  booking_id: string;
  property_id: string | null;
  rating: number;
  comment: string | null;
  review: string | null;
  created_at: string;
}

export default function AgentRatings({ agentId }: AgentRatingsProps) {
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [filtered, setFiltered] = useState<RatingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStar, setFilterStar] = useState<number | null>(null);
  const [avg, setAvg] = useState(0);
  const [total, setTotal] = useState(0);

  const load = async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const sb: any = supabase;
      const { data, error } = await sb
        .from("agent_ratings")
        .select("id,agent_id,buyer_id,booking_id,property_id,rating,comment,review,created_at")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = (data || []) as RatingRow[];
      setRatings(rows);
      setFiltered(rows);
      setTotal(rows.length);
      setAvg(rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0);
    } catch (err: any) {
      console.error("Error loading ratings:", err);
      toast.error("Failed to load ratings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agentId) load();
  }, [agentId]);

  useEffect(() => {
    let rows = [...ratings];
    if (filterStar !== null) {
      rows = rows.filter((r) => Math.round(r.rating) === filterStar);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.comment && r.comment.toLowerCase().includes(q)) ||
          (r.review && r.review.toLowerCase().includes(q))
      );
    }
    setFiltered(rows);
  }, [search, filterStar, ratings]);

  const breakdown = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: ratings.filter((r) => Math.round(r.rating) === stars).length,
  }));

  const maxCount = Math.max(...breakdown.map((b) => b.count), 1);

  const renderStars = (value: number, size = "h-4 w-4") =>
    [1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={`${size} ${i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
      />
    ));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-4"
    >
      {/* Summary Header */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-lg">
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
        <CardContent className="p-5 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <TrendingUp className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Your Ratings</h3>
                <p className="text-xs text-muted-foreground">Based on buyer feedback across visits & bookings</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-3xl font-bold">{avg.toFixed(1)}</p>
                <div className="flex justify-center">{renderStars(avg, "h-3.5 w-3.5")}</div>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reviews</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Breakdown */}
        <Card className="lg:col-span-1 border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              Rating Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {breakdown.map((b) => (
              <button
                key={b.stars}
                onClick={() => setFilterStar(filterStar === b.stars ? null : b.stars)}
                className={`w-full flex items-center gap-2 text-xs group transition-opacity ${filterStar !== null && filterStar !== b.stars ? "opacity-40" : "opacity-100"}`}
              >
                <span className="w-3 font-semibold">{b.stars}</span>
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${(b.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right text-muted-foreground">{b.count}</span>
              </button>
            ))}
            {filterStar !== null && (
              <Button variant="ghost" size="sm" className="w-full text-xs mt-2" onClick={() => setFilterStar(null)}>
                Clear Filter
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Reviews List */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Recent Reviews
              </CardTitle>
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search comments..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {ratings.length === 0 ? "No ratings yet. Ratings appear after buyers review your service." : "No reviews match your filter."}
              </div>
            ) : (
              <AnimatePresence>
                {filtered.map((r, idx) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ delay: idx * 0.04, duration: 0.25 }}
                    className="p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            {renderStars(r.rating, "h-3 w-3")}
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                              {r.rating.toFixed(1)}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            {new Date(r.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      {r.property_id && (
                        <Badge variant="outline" className="text-[10px]">
                          Property
                        </Badge>
                      )}
                    </div>
                    {(r.comment || r.review) && (
                      <p className="text-xs text-foreground/80 mt-2 pl-10 leading-relaxed">
                        {r.review || r.comment}
                      </p>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
