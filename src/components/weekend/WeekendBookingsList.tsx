import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { WEEKEND_STATUSES, formatINR, WeekendStatus } from "@/lib/weekendBookingHelpers";
import { WeekendBookingDetailDrawer } from "./WeekendBookingDetailDrawer";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Sparkles, Calendar, MapPin, Building2, ArrowRight, Loader2,
  User, IndianRupee, ClipboardList, Trash2, ThumbsUp, History as HistoryIcon, Handshake,
} from "lucide-react";

const HISTORY_STATUSES = new Set(["deal_closed", "rated", "cancelled"]);

interface Props {
  scope: "buyer" | "agent" | "admin";
  agentId?: string | null; // for agent scope
  userId?: string | null; // current user id
}

export const WeekendBookingsList = ({ scope, agentId, userId }: Props) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | WeekendStatus>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [view, setView] = useState<"active" | "history">("active");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("weekend_bookings").select("*").order("created_at", { ascending: false });
    if (scope === "buyer" && userId) q = q.eq("buyer_id", userId);
    if (scope === "agent" && agentId) q = q.eq("agent_id", agentId);
    const { data } = await q;
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [scope, agentId, userId]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel(`weekend-list-${scope}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "weekend_bookings" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [scope, agentId, userId]);

  const deleteBooking = async (id: string) => {
    const { error } = await supabase.from("weekend_bookings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Booking deleted");
    load();
  };

  const viewItems = items.filter(i => view === "history" ? HISTORY_STATUSES.has(i.status) : !HISTORY_STATUSES.has(i.status));
  const filtered = filter === "all" ? viewItems : viewItems.filter(i => i.status === filter);
  const counts = viewItems.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {} as Record<string, number>);
  const historyCount = items.filter(i => HISTORY_STATUSES.has(i.status)).length;
  const activeCount = items.length - historyCount;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-md">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold leading-tight">Weekend Property Explorer</h3>
            <p className="text-xs text-muted-foreground">2-day visit + stay bookings · {items.length} total</p>
          </div>
        </div>
        <Tabs value={view} onValueChange={(v) => { setView(v as any); setFilter("all"); }}>
          <TabsList className="h-8">
            <TabsTrigger value="active" className="text-xs gap-1"><Sparkles className="h-3 w-3" />Active ({activeCount})</TabsTrigger>
            <TabsTrigger value="history" className="text-xs gap-1"><HistoryIcon className="h-3 w-3" />History ({historyCount})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>All ({viewItems.length})</Chip>
        {(Object.entries(WEEKEND_STATUSES) as [WeekendStatus, any][]).map(([k, v]) => (
          counts[k] ? <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>{v.label} ({counts[k]})</Chip> : null
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading…</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-10 text-center text-sm text-muted-foreground">
          <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No bookings here yet
        </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((b, i) => {
            const status = WEEKEND_STATUSES[b.status as WeekendStatus] || WEEKEND_STATUSES.pending_confirmation;
            const interestedCount = b.interested_property_ids?.length || 0;
            const hasInterest = interestedCount > 0;
            const dealClosed = b.status === "deal_closed" || b.status === "rated";
            const remainingDue = dealClosed && b.deal_amount && b.final_payment_status !== "paid";
            const canDelete = scope === "buyer" || scope === "admin";
            return (
              <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className={`cursor-pointer hover:shadow-md transition-all group relative ${hasInterest && !dealClosed ? "border-emerald-500/50 ring-1 ring-emerald-500/20 shadow-[0_0_0_1px_hsl(var(--primary)/0.05)]" : "hover:border-primary/30"}`} onClick={() => setSelectedId(b.id)}>
                  {hasInterest && !dealClosed && (
                    <div className="absolute -top-2 left-3 z-10">
                      <Badge className="bg-emerald-500 text-primary-foreground text-[10px] gap-1 shadow-md">
                        <ThumbsUp className="h-2.5 w-2.5" />Buyer interested in {interestedCount}
                      </Badge>
                    </div>
                  )}
                  {remainingDue && (
                    <div className="absolute -top-2 right-3 z-10">
                      <Badge className="bg-amber-500 text-primary-foreground text-[10px] gap-1 shadow-md animate-pulse">
                        <IndianRupee className="h-2.5 w-2.5" />Final payment due
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />{b.buyer_name}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />{b.city || "—"} · {b.bhk_preference} BHK {b.property_type}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${status.color}`}>{status.label}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md bg-muted/40 p-1.5">
                        <p className="text-muted-foreground text-[10px] uppercase">Dates</p>
                        <p className="font-medium flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(b.start_date), "MMM d")} – {format(new Date(b.end_date), "MMM d")}</p>
                      </div>
                      <div className="rounded-md bg-muted/40 p-1.5">
                        <p className="text-muted-foreground text-[10px] uppercase">Properties</p>
                        <p className="font-medium flex items-center gap-1"><Building2 className="h-3 w-3" />{b.selected_property_ids?.length || 0} selected{hasInterest ? ` · ${interestedCount}❤` : ""}</p>
                      </div>
                    </div>

                    {dealClosed && (
                      <div className="rounded-md bg-emerald-500/10 border border-emerald-500/30 p-2 text-xs flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                        <Handshake className="h-3 w-3" />
                        Deal closed · {formatINR(b.deal_amount)}
                        {b.agent_rating && <span className="ml-auto">★ {b.agent_rating}/5</span>}
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t pt-2">
                      <span className="text-sm font-semibold text-primary flex items-center gap-0.5"><IndianRupee className="h-3 w-3" />{formatINR(b.estimated_total).replace("₹", "")}</span>
                      <div className="flex items-center gap-1">
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={(e) => e.stopPropagation()}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this booking?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove the booking, its itinerary and activity log. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteBooking(b.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 text-xs group-hover:translate-x-0.5 transition-transform">
                          Open <ArrowRight className="h-3 w-3 ml-0.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <WeekendBookingDetailDrawer
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        bookingId={selectedId}
        viewerRole={scope}
        currentUserId={userId}
        onChanged={load}
      />
    </div>
  );
};

const Chip = ({ active, onClick, children }: any) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent border-border"}`}
  >
    {children}
  </button>
);

export default WeekendBookingsList;
