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
import {
  Sparkles, Calendar, MapPin, Building2, ArrowRight, Loader2,
  User, IndianRupee, ClipboardList,
} from "lucide-react";

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

  const filtered = filter === "all" ? items : items.filter(i => i.status === filter);

  const counts = items.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-md">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold leading-tight">Weekend Property Explorer</h3>
            <p className="text-xs text-muted-foreground">2-day visit + stay bookings · {items.length} total</p>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>All ({items.length})</Chip>
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
            return (
              <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group" onClick={() => setSelectedId(b.id)}>
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
                        <p className="font-medium flex items-center gap-1"><Building2 className="h-3 w-3" />{b.selected_property_ids?.length || 0} selected</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t pt-2">
                      <span className="text-sm font-semibold text-primary flex items-center gap-0.5"><IndianRupee className="h-3 w-3" />{formatINR(b.estimated_total).replace("₹", "")}</span>
                      <Button size="sm" variant="ghost" className="h-7 text-xs group-hover:translate-x-0.5 transition-transform">
                        Open <ArrowRight className="h-3 w-3 ml-0.5" />
                      </Button>
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
