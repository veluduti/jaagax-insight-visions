import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Star,
  MessageSquare,
  Calendar,
  Search,
  Filter,
  TrendingUp,
  User,
  Award,
  Clock,
  CheckCircle2,
  Loader2,
  Shield,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useHiddenIds } from "@/hooks/useHiddenIds";

interface AgentRatingsProps {
  agentId: string;
  trustScore?: number;
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
  is_verified: boolean;
  agent_reply?: string | null;
  agent_replied_at?: string | null;
  created_at: string;
  buyer_name?: string;
}

interface RatingSummary {
  average: number;
  total: number;
  verified_count: number;
  response_time_avg: number;
  trust_score: number;
}

export default function AgentRatings({ agentId, trustScore = 0 }: AgentRatingsProps) {
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [filtered, setFiltered] = useState<RatingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStar, setFilterStar] = useState<number | null>(null);
  const [summary, setSummary] = useState<RatingSummary>({
    average: 0,
    total: 0,
    verified_count: 0,
    response_time_avg: 0,
    trust_score: 0,
  });
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedRating, setSelectedRating] = useState<RatingRow | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { hide, isHidden } = useHiddenIds("agent_ratings", agentId);

  const load = async () => {
    if (!agentId) return;
    setLoading(true);

    try {
      const sb: any = supabase;

      // Fetch ratings
      const { data, error } = await sb
        .from("agent_ratings")
        .select("*")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = (data || []) as RatingRow[];

      // Add buyer name if available (or use fallback)
      const processedRows = rows.map((r: any) => ({
        ...r,
        buyer_name: r.buyer_name || "Verified Buyer",
      }));

      setRatings(processedRows);
      setFiltered(processedRows);

      // Calculate summary
      const total = processedRows.length;
      const verifiedCount = processedRows.filter((r) => r.is_verified).length;
      const average = total > 0 ? processedRows.reduce((s, r) => s + r.rating, 0) / total : 0;

      // Calculate response time (mock - in production, fetch from analytics)
      const responseTimeAvg = 4.5; // hours

      setSummary({
        average,
        total,
        verified_count: verifiedCount,
        response_time_avg: responseTimeAvg,
        trust_score: trustScore || 0,
      });
    } catch (err: any) {
      console.error("Error loading ratings:", err);
      toast.error("Failed to load ratings");

      // Set fallback data
      setSummary({
        average: 0,
        total: 0,
        verified_count: 0,
        response_time_avg: 0,
        trust_score: trustScore || 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agentId) load();
  }, [agentId]);

  useEffect(() => {
    let rows = ratings.filter((r) => !isHidden(r.id));
    if (filterStar !== null) {
      rows = rows.filter((r) => Math.round(r.rating) === filterStar);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.comment && r.comment.toLowerCase().includes(q)) ||
          (r.review && r.review.toLowerCase().includes(q)) ||
          (r.buyer_name && r.buyer_name.toLowerCase().includes(q)),
      );
    }
    setFiltered(rows);
  }, [search, filterStar, ratings]);

  const handleReply = async () => {
    if (!selectedRating || !replyText.trim()) return;

    setSubmitting(true);
    const sb: any = supabase;

    try {
      const { error } = await sb
        .from("agent_ratings")
        .update({
          agent_reply: replyText.trim(),
          agent_replied_at: new Date().toISOString(),
        })
        .eq("id", selectedRating.id);

      if (error) throw error;

      toast.success("Reply sent successfully");
      setReplyText("");
      setShowReviewDialog(false);
      setSelectedRating(null);
      load();
    } catch (error: any) {
      console.error("Error sending reply:", error);
      toast.error(error.message || "Failed to send reply");
    } finally {
      setSubmitting(false);
    }
  };

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

  const getResponseTimeLabel = (hours: number) => {
    if (hours === 0) return "N/A";
    if (hours < 1) return "Under 1 hour";
    if (hours < 2) return "About 1 hour";
    if (hours < 4) return "Under 4 hours";
    if (hours < 8) return "Under 8 hours";
    if (hours < 24) return `${Math.round(hours)} hours`;
    const days = Math.round(hours / 24);
    return `${days} day${days > 1 ? "s" : ""}`;
  };

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
                <Award className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Agent Ratings</h3>
                <p className="text-xs text-muted-foreground">Based on buyer feedback across visits & bookings</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-3xl font-bold">{summary.average.toFixed(1)}</p>
                <div className="flex justify-center">{renderStars(summary.average, "h-3.5 w-3.5")}</div>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-bold">{summary.total}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reviews</p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-bold">{summary.verified_count}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Verified</p>
              </div>
            </div>
          </div>

          {/* Trust Score & Response Time */}
          <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Trust Score</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={summary.trust_score} className="w-24 h-2" />
                <span className="text-sm font-bold">{summary.trust_score}%</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Response Time</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {getResponseTimeLabel(summary.response_time_avg)}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium">Verified Reviews</span>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                {summary.verified_count} verified
              </Badge>
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
                className={`w-full flex items-center gap-2 text-xs group transition-opacity ${
                  filterStar !== null && filterStar !== b.stars ? "opacity-40" : "opacity-100"
                }`}
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
                <Badge variant="secondary" className="text-[10px]">
                  {filtered.length}
                </Badge>
              </CardTitle>
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search reviews..."
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
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {ratings.length === 0 ? (
                  <div className="space-y-2">
                    <Award className="h-10 w-10 mx-auto text-muted-foreground/30" />
                    <p>No ratings yet</p>
                    <p className="text-xs">Ratings appear after buyers review your service</p>
                  </div>
                ) : (
                  "No reviews match your filter."
                )}
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
                            {r.is_verified && (
                              <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[10px] px-1.5 py-0 h-4">
                                ✓ Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            {new Date(r.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                            {r.buyer_name && (
                              <>
                                <span className="text-muted-foreground/50">·</span>
                                <span>{r.buyer_name}</span>
                              </>
                            )}
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
                      <p className="text-xs text-foreground/80 mt-2 pl-10 leading-relaxed">{r.review || r.comment}</p>
                    )}
                    {r.agent_reply && (
                      <div className="mt-2 pl-10 border-l-2 border-primary/30 ml-2 p-2 bg-primary/5 rounded-lg">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MessageSquare className="h-3 w-3 text-primary" />
                          Your reply:
                        </p>
                        <p className="text-xs">{r.agent_reply}</p>
                      </div>
                    )}
                    {!r.agent_reply && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 ml-10 text-xs h-7"
                        onClick={() => {
                          setSelectedRating(r);
                          setReplyText("");
                          setShowReviewDialog(true);
                        }}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Reply
                      </Button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reply Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reply to Review</DialogTitle>
            <DialogDescription>Respond to {selectedRating?.buyer_name || "buyer"}'s review</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {selectedRating && (
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  {renderStars(selectedRating.rating, "h-3.5 w-3.5")}
                  <span className="text-xs text-muted-foreground">{selectedRating.rating.toFixed(1)} / 5</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedRating.review || selectedRating.comment || "No comment provided"}
                </p>
              </div>
            )}
            <Textarea
              placeholder="Write your reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReply} disabled={submitting || !replyText.trim()}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reply"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
