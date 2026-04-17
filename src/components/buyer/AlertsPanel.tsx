import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Bell, Home, Calendar, Heart, Hotel, TrendingDown,
  CheckCheck, Trash2, Sparkles, ExternalLink,
} from "lucide-react";

type AlertRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  metadata: any;
  read: boolean;
  created_at: string;
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "property", label: "Property" },
  { value: "visit", label: "Visits" },
  { value: "favorite", label: "Favorites" },
  { value: "booking", label: "Bookings" },
  { value: "price", label: "Price" },
] as const;

const iconFor = (type: string) => {
  switch (type) {
    case "property": return Home;
    case "visit": return Calendar;
    case "favorite": return Heart;
    case "booking": return Hotel;
    case "price": return TrendingDown;
    case "insight": return Sparkles;
    default: return Bell;
  }
};

const colorFor = (type: string) => {
  switch (type) {
    case "property": return "text-blue-500 bg-blue-500/10";
    case "visit": return "text-emerald-500 bg-emerald-500/10";
    case "favorite": return "text-rose-500 bg-rose-500/10";
    case "booking": return "text-amber-500 bg-amber-500/10";
    case "price": return "text-green-500 bg-green-500/10";
    case "insight": return "text-purple-500 bg-purple-500/10";
    default: return "text-primary bg-primary/10";
  }
};

const AlertsPanel = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [userId, setUserId] = useState<string | null>(null);
  const seedingRef = useRef(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);
    await fetchAlerts(user.id);
    await maybeSeedAlerts(user.id);

    const channel = supabase
      .channel(`alerts-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as AlertRow;
          setAlerts((prev) => [row, ...prev]);
          toast(row.title, { description: row.message ?? undefined });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const fetchAlerts = async (uid: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications" as any)
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error && data) setAlerts(data as any);
    setLoading(false);
  };

  // Auto-generate alerts from existing favorites / visits / bookings
  // so the user immediately sees relevant updates the first time they open the tab.
  const maybeSeedAlerts = async (uid: string) => {
    if (seedingRef.current) return;
    seedingRef.current = true;
    try {
      const { count } = await supabase
        .from("notifications" as any)
        .select("*", { count: "exact", head: true })
        .eq("user_id", uid);
      if ((count ?? 0) > 0) return;

      const seeds: Array<Partial<AlertRow>> = [];

      // 1) New listings in the user's favorite localities
      const { data: favs } = await supabase
        .from("favorites")
        .select("property_id")
        .eq("user_id", uid)
        .limit(20);
      const favIds = (favs ?? []).map((f: any) => f.property_id).filter(Boolean);
      if (favIds.length) {
        const { data: favProps } = await supabase
          .from("properties")
          .select("id, title, locality, city, price")
          .in("id", favIds)
          .limit(5);
        (favProps ?? []).forEach((p: any) => {
          seeds.push({
            user_id: uid,
            type: "price",
            title: "Price update on your saved property",
            message: `${p.title} in ${p.locality ?? p.city ?? "your area"} now at ₹${(p.price/100000).toFixed(1)}L. Check the latest details.`,
            link: `/property/${p.id}`,
            metadata: { property_id: p.id },
          });
        });

        const localities = Array.from(new Set((favProps ?? []).map((p: any) => p.locality).filter(Boolean)));
        if (localities.length) {
          const { data: matches } = await supabase
            .from("properties")
            .select("id, title, locality, city, bhk, price")
            .in("locality", localities)
            .not("id", "in", `(${favIds.join(",")})`)
            .order("created_at", { ascending: false })
            .limit(3);
          (matches ?? []).forEach((p: any) => {
            seeds.push({
              user_id: uid,
              type: "property",
              title: `New ${p.bhk ? p.bhk + "BHK " : ""}listing in ${p.locality}`,
              message: `Just added: ${p.title} • ₹${(p.price/100000).toFixed(1)}L`,
              link: `/property/${p.id}`,
              metadata: { property_id: p.id },
            });
          });
        }
      }

      // 2) Upcoming visits
      const today = new Date().toISOString().slice(0, 10);
      const { data: visits } = await supabase
        .from("visit_bookings")
        .select("id, visit_date, visit_time, locality, city, status")
        .eq("buyer_id", uid)
        .gte("visit_date", today)
        .order("visit_date", { ascending: true })
        .limit(3);
      (visits ?? []).forEach((v: any) => {
        seeds.push({
          user_id: uid,
          type: "visit",
          title: v.status === "confirmed" ? "Agent confirmed your visit" : "Visit reminder",
          message: `Visit on ${v.visit_date}${v.visit_time ? " at " + v.visit_time : ""} • ${v.locality ?? v.city ?? ""}`,
          link: `/dashboard/buyer?tab=visits`,
          metadata: { visit_id: v.id },
        });
      });

      // 3) Recent bookings
      const { data: bookings } = await supabase
        .from("hotel_bookings")
        .select("id, check_in, check_out, status, hotel_id")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(3);
      (bookings ?? []).forEach((b: any) => {
        seeds.push({
          user_id: uid,
          type: "booking",
          title: b.status === "cancelled" ? "Booking cancelled" : "Booking update",
          message: `Stay ${b.check_in} → ${b.check_out} • status: ${b.status}`,
          link: `/dashboard/buyer?tab=bookings`,
          metadata: { booking_id: b.id },
        });
      });

      // 4) Smart insight (always)
      seeds.push({
        user_id: uid,
        type: "insight",
        title: "Prices trending up in your area",
        message: "Properties in your saved locality have grown ~3% this month. Consider acting soon.",
        link: `/transactions`,
      });

      if (seeds.length) {
        await supabase.from("notifications" as any).insert(seeds as any);
        await fetchAlerts(uid);
      }
    } catch (err) {
      console.error("Seed alerts failed", err);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications" as any).update({ read: true }).eq("id", id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    await supabase.from("notifications" as any).update({ read: true }).eq("user_id", userId).eq("read", false);
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    toast.success("All alerts marked as read");
  };

  const deleteAlert = async (id: string) => {
    await supabase.from("notifications" as any).delete().eq("id", id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleClick = (a: AlertRow) => {
    if (!a.read) markAsRead(a.id);
    if (a.link) navigate(a.link);
  };

  const filtered = useMemo(() => {
    if (filter === "all") return alerts;
    return alerts.filter((a) => a.type === filter);
  }, [alerts, filter]);

  const unreadCount = alerts.filter((a) => !a.read).length;

  if (!userId && !loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Please sign in to view your alerts.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              Alerts & Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">{unreadCount} new</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Stay updated with new listings, price changes, visits & bookings
            </CardDescription>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value} className="text-xs">
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading alerts…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-semibold mb-1">No alerts in this category</h3>
            <p className="text-sm text-muted-foreground">
              We'll notify you here as soon as something relevant happens.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[520px] pr-3">
            <div className="space-y-2">
              {filtered.map((a) => {
                const Icon = iconFor(a.type);
                return (
                  <div
                    key={a.id}
                    className={`group relative flex gap-3 p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/40 ${
                      !a.read ? "bg-primary/5 border-primary/20" : "bg-card"
                    }`}
                    onClick={() => handleClick(a)}
                  >
                    <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${colorFor(a.type)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          {a.title}
                          {!a.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                        </h4>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {a.message && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.message}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px] capitalize">{a.type}</Badge>
                        {a.link && (
                          <span className="text-xs text-primary inline-flex items-center gap-1">
                            View <ExternalLink className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); deleteAlert(a.id); }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsPanel;
