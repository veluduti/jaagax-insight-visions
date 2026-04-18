import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Calendar, Clock, MapPin, Phone, Eye, X, Star, RotateCcw, Heart,
  GitCompare, Navigation as NavIcon, CheckCircle2, CalendarClock, Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface Visit {
  id: string;
  property_id: string | null;
  visit_date: string;
  visit_time: string | null;
  status: string;
  notes: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  city: string | null;
  locality: string | null;
  agent_id: string | null;
  created_at: string;
  updated_at: string;
  properties?: { id: string; title: string; city: string | null; locality: string | null; images: any; price: number | null } | null;
  agents?: { id?: string; name: string; phone: string | null; photo_url: string | null } | null;
  my_rating?: { rating: number; review: string | null } | null;
}

const FALLBACK_IMG = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80";

type TabKey = "all" | "scheduled" | "completed" | "cancelled";

const SCHEDULED_STATUSES = ["pending", "pending_approval", "confirmed", "in_progress"];

const MyVisits = () => {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("all");

  // Reschedule modal
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleVisit, setRescheduleVisit] = useState<Visit | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  // Rating modal
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingVisit, setRatingVisit] = useState<Visit | null>(null);
  const [stars, setStars] = useState(0);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    fetchVisits();
    const channel = supabase
      .channel("my-visits-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "visit_bookings" }, () => fetchVisits())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchVisits = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("visit_bookings")
      .select(`*, properties(id, title, city, locality, images, price), agents(id, name, phone, photo_url)`)
      .eq("buyer_id", user.id)
      .order("visit_date", { ascending: false });
    const list: any[] = (data as any) || [];

    if (list.length > 0) {
      const ids = list.map((v) => v.id);
      const { data: ratings } = await supabase
        .from("agent_ratings" as any)
        .select("booking_id, rating, review")
        .in("booking_id", ids);
      const map = new Map((ratings || []).map((r: any) => [r.booking_id, r]));
      list.forEach((v) => { v.my_rating = map.get(v.id) || null; });
    }

    setVisits(list);
    setLoading(false);
  };

  const summary = useMemo(() => {
    const total = visits.length;
    const upcoming = visits.filter(v => SCHEDULED_STATUSES.includes(v.status) && new Date(v.visit_date) >= new Date(new Date().toDateString())).length;
    const completed = visits.filter(v => v.status === "completed").length;
    const cancelled = visits.filter(v => v.status === "cancelled").length;
    return { total, upcoming, completed, cancelled };
  }, [visits]);

  const filtered = useMemo(() => {
    if (tab === "all") return visits;
    if (tab === "scheduled") return visits.filter(v => SCHEDULED_STATUSES.includes(v.status));
    if (tab === "completed") return visits.filter(v => v.status === "completed");
    if (tab === "cancelled") return visits.filter(v => v.status === "cancelled");
    return visits;
  }, [visits, tab]);

  const statusBadge = (status: string) => {
    if (SCHEDULED_STATUSES.includes(status))
      return <Badge className="bg-blue-500/15 text-blue-600 border border-blue-500/30">Scheduled</Badge>;
    if (status === "completed")
      return <Badge className="bg-green-500/15 text-green-600 border border-green-500/30">Completed</Badge>;
    if (status === "cancelled")
      return <Badge className="bg-red-500/15 text-red-600 border border-red-500/30">Cancelled</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const handleCancel = async (id: string) => {
    const { error } = await supabase.functions.invoke("buyer-update-visit", {
      body: { bookingId: id, action: "cancel" },
    });
    if (error) toast.error("Failed to cancel");
    else { toast.success("Visit cancelled — agent and admins notified"); fetchVisits(); }
  };

  const openReschedule = (v: Visit) => {
    setRescheduleVisit(v); setNewDate(v.visit_date); setNewTime(v.visit_time || ""); setRescheduleOpen(true);
  };

  const submitReschedule = async () => {
    if (!rescheduleVisit) return;
    const { error } = await supabase.functions.invoke("buyer-update-visit", {
      body: { bookingId: rescheduleVisit.id, action: "reschedule", newDate, newTime },
    });
    if (error) toast.error("Reschedule failed");
    else { toast.success("Rescheduled — agent will reconfirm"); setRescheduleOpen(false); fetchVisits(); }
  };

  const openRating = (v: Visit) => {
    setRatingVisit(v);
    setStars(v.my_rating?.rating || 0);
    setFeedback(v.my_rating?.review || "");
    setRatingOpen(true);
  };

  const submitRating = async () => {
    if (!ratingVisit || stars === 0) { toast.error("Please select a rating"); return; }
    if (!ratingVisit.agent_id) { toast.error("No agent on this booking to rate"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Login required"); return; }

    const { error } = await supabase.from("agent_ratings" as any).upsert({
      booking_id: ratingVisit.id,
      agent_id: ratingVisit.agent_id,
      buyer_id: user.id,
      property_id: ratingVisit.property_id,
      rating: stars,
      review: feedback || null,
    }, { onConflict: "booking_id" });

    if (error) { toast.error("Failed to save rating"); return; }
    toast.success("Thanks! Your rating helps other buyers find great agents.");
    setRatingOpen(false);
    fetchVisits();
  };

  const addToFavorites = async (propertyId: string | null) => {
    if (!propertyId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Login required"); return; }
    const { error } = await supabase.from("favorites").insert({ user_id: user.id, property_id: propertyId });
    if (error && !String(error.message).includes("duplicate")) toast.error("Failed to save");
    else toast.success("Added to favorites");
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  if (loading) return <div className="space-y-3"><Skeleton className="h-32 w-full" /><Skeleton className="h-48 w-full" /></div>;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryStat label="Total Visits" value={summary.total} icon={<Calendar className="h-5 w-5" />} />
        <SummaryStat label="Upcoming" value={summary.upcoming} icon={<CalendarClock className="h-5 w-5" />} accent="text-blue-500" />
        <SummaryStat label="Completed" value={summary.completed} icon={<CheckCircle2 className="h-5 w-5" />} accent="text-green-500" />
        <SummaryStat label="Cancelled" value={summary.cancelled} icon={<X className="h-5 w-5" />} accent="text-red-500" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="all">All ({summary.total})</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled ({summary.upcoming})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({summary.completed})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({summary.cancelled})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {filtered.length === 0 ? (
            <Card className="p-10 text-center">
              <Calendar className="w-14 h-14 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold mb-1">No visits in this view</h3>
              <p className="text-sm text-muted-foreground mb-4">Schedule a visit from any property page to start.</p>
              <Button onClick={() => navigate("/search")}>Browse Properties</Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filtered.map((v) => (
                <VisitCard
                  key={v.id} v={v}
                  formatDate={formatDate}
                  statusBadge={statusBadge}
                  onView={() => v.property_id && navigate(`/property/${v.property_id}`)}
                  onCancel={() => handleCancel(v.id)}
                  onReschedule={() => openReschedule(v)}
                  onRate={() => openRating(v)}
                  onFav={() => addToFavorites(v.property_id)}
                  onCompare={() => v.property_id && navigate(`/compare?ids=${v.property_id}`)}
                  onDirections={() => {
                    const q = encodeURIComponent(`${v.properties?.title || ""} ${v.locality || ""} ${v.city || ""}`);
                    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
                  }}
                  onContactAgent={() => v.agents?.phone && window.open(`tel:${v.agents.phone}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reschedule Modal */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reschedule Visit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>New Date</Label><Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} /></div>
            <div><Label>New Time</Label><Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
            <Button onClick={submitReschedule}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Modal */}
      <Dialog open={ratingOpen} onOpenChange={setRatingOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rate Your Visit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setStars(n)} aria-label={`${n} star`}>
                  <Star className={`h-9 w-9 transition-colors ${n <= stars ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <div><Label>Notes (optional)</Label>
              <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Share your experience..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingOpen(false)}>Cancel</Button>
            <Button onClick={submitRating}>Submit Rating</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SummaryStat = ({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent?: string }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className={accent || "text-primary"}>{icon}</div>
      </div>
    </CardContent>
  </Card>
);

interface CardProps {
  v: Visit;
  formatDate: (d: string) => string;
  statusBadge: (s: string) => React.ReactNode;
  onView: () => void;
  onCancel: () => void;
  onReschedule: () => void;
  onRate: () => void;
  onFav: () => void;
  onCompare: () => void;
  onDirections: () => void;
  onContactAgent: () => void;
}

const VisitCard = ({ v, formatDate, statusBadge, onView, onCancel, onReschedule, onRate, onFav, onCompare, onDirections, onContactAgent }: CardProps) => {
  const img = v.properties?.images?.[0] || FALLBACK_IMG;
  const isScheduled = SCHEDULED_STATUSES.includes(v.status);
  const isCompleted = v.status === "completed";
  const isCancelled = v.status === "cancelled";
  const rating = v.my_rating?.rating ?? null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          <img src={img} alt={v.properties?.title || "Property"} className="w-full md:w-48 h-40 md:h-auto object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }} />
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="font-semibold leading-tight">{v.properties?.title || "Property Visit"}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {v.locality || v.properties?.locality || "—"}, {v.city || v.properties?.city || "—"}
                </p>
              </div>
              {statusBadge(v.status)}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />{formatDate(v.visit_date)}</div>
              <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-muted-foreground" />{v.visit_time || "TBD"}</div>
              {v.agents?.name && <div className="flex items-center gap-1.5 col-span-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" />Agent: {v.agents.name}</div>}
              {rating && (
                <div className="flex items-center gap-1 col-span-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">Your rating</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={onView}><Eye className="h-3.5 w-3.5 mr-1.5" />View</Button>

              {isScheduled && (
                <>
                  <Button size="sm" variant="outline" onClick={onReschedule}><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Reschedule</Button>
                  <Button size="sm" variant="outline" onClick={onDirections}><NavIcon className="h-3.5 w-3.5 mr-1.5" />Directions</Button>
                  {v.agents?.phone && <Button size="sm" variant="outline" onClick={onContactAgent}><Phone className="h-3.5 w-3.5 mr-1.5" />Contact</Button>}
                  <Button size="sm" variant="outline" onClick={onCancel}><X className="h-3.5 w-3.5 mr-1.5" />Cancel</Button>
                </>
              )}

              {isCompleted && (
                <>
                  {!rating && <Button size="sm" onClick={onRate}><Star className="h-3.5 w-3.5 mr-1.5" />Rate</Button>}
                  <Button size="sm" variant="outline" onClick={onFav}><Heart className="h-3.5 w-3.5 mr-1.5" />Favorite</Button>
                  <Button size="sm" variant="outline" onClick={onCompare}><GitCompare className="h-3.5 w-3.5 mr-1.5" />Compare</Button>
                </>
              )}

              {isCancelled && (
                <>
                  <Button size="sm" variant="outline" onClick={onReschedule}><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Reschedule</Button>
                  <Button size="sm" variant="ghost" onClick={onCancel}><Trash2 className="h-3.5 w-3.5 mr-1.5" />Remove</Button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MyVisits;
