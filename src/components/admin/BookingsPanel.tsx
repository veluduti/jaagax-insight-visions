import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Hotel, Loader2, Bell, RefreshCw, MapPin, User } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Booking {
  id: string;
  hotel_id: string;
  user_id: string | null;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  check_in: string;
  check_out: string;
  num_guests: number;
  num_rooms: number;
  room_type: string;
  total_amount: number;
  status: string;
  booking_type: string;
  special_requests: string | null;
  created_at: string;
  hotel?: { name: string; city: string; locality: string };
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  related_id: string | null;
  metadata?: any;
}

interface VisitBooking {
  id: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  visit_date: string;
  visit_time: string | null;
  status: string;
  city: string | null;
  locality: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  agent_id: string | null;
  property_id: string | null;
  properties?: { title: string } | null;
  agents?: { name: string; phone: string | null } | null;
}

const VISIT_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  pending_agent: "Awaiting agent",
  pending_builder: "Agent confirmed → Builder",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const visitStatusVariant = (s: string): "default" | "destructive" | "secondary" | "outline" => {
  if (s === "confirmed" || s === "in_progress") return "default";
  if (s === "cancelled") return "destructive";
  if (s === "completed") return "secondary";
  return "outline";
};

const BookingsPanel = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [visits, setVisits] = useState<VisitBooking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: rows }, { data: visitRows }, { data: notifs }] = await Promise.all([
      supabase.from("hotel_bookings").select("*").order("created_at", { ascending: false }).limit(100),
      supabase
        .from("visit_bookings")
        .select(`*, properties(title), agents(name, phone)`)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("notifications")
        .select("*")
        .or("type.like.hotel_booking_%,type.eq.admin_visit_event,type.eq.visit_request")
        .order("created_at", { ascending: false })
        .limit(80),
    ]);

    if (rows && rows.length > 0) {
      const ids = [...new Set(rows.map((b: any) => b.hotel_id).filter(Boolean))];
      const { data: hotels } = await supabase.from("partner_hotels").select("id, name, city, locality").in("id", ids);
      const map = new Map((hotels || []).map((h: any) => [h.id, h]));
      setBookings(rows.map((b: any) => ({ ...b, hotel: map.get(b.hotel_id) })));
    } else {
      setBookings([]);
    }
    setVisits((visitRows as any) || []);
    setNotifications((notifs as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel("admin-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "hotel_bookings" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "visit_bookings" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (p: any) => {
        const t = p.new?.type;
        if (t?.startsWith("hotel_booking_") || t === "admin_visit_event" || t === "visit_request") {
          toast.info(p.new.title, { description: p.new.message });
          fetchAll();
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read).map((n) => n.id);
    if (!unread.length) return;
    await supabase.from("notifications").update({ read: true }).in("id", unread);
    fetchAll();
  };

  const statusColor = (s: string) =>
    s === "confirmed" ? "default" : s === "cancelled" ? "destructive" : s === "completed" ? "secondary" : "outline";

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      {/* Notifications panel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Booking Notifications {unreadCount > 0 && <Badge variant="destructive">{unreadCount} new</Badge>}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll}>
              <RefreshCw className="h-3 w-3 mr-1" /> Refresh
            </Button>
            {unreadCount > 0 && (
              <Button size="sm" onClick={markAllRead}>
                Mark all read
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No notifications yet</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {notifications.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-lg border ${!n.read ? "bg-primary/5 border-primary/30" : "bg-muted/30"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(n.created_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visit Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            All Site Visit Bookings ({visits.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {visits.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No visit bookings yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Visit</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last update</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{v.buyer_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{v.buyer_phone || v.buyer_email || "—"}</div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{v.properties?.title || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {v.locality || "—"}{v.city ? `, ${v.city}` : ""}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(v.visit_date), "dd MMM yy")}
                        <div className="text-muted-foreground">{v.visit_time || "TBD"}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {v.agents?.name ? (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-primary" />
                            <div>
                              <div className="font-medium">{v.agents.name}</div>
                              {v.agents.phone && <div className="text-muted-foreground">{v.agents.phone}</div>}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={visitStatusVariant(v.status)} className="text-xs">
                          {VISIT_STATUS_LABEL[v.status] || v.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(v.updated_at), "dd MMM, HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bookings table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5 text-primary" />
            All Hotel Bookings ({bookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No bookings yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Hotel</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Booked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{b.guest_name}</div>
                        <div className="text-xs text-muted-foreground">{b.guest_phone || b.guest_email || "—"}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{b.hotel?.name || "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {b.hotel?.locality}, {b.hotel?.city}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(b.check_in), "dd MMM")} → {format(new Date(b.check_out), "dd MMM yy")}
                        <div className="text-muted-foreground">
                          {b.num_guests}G / {b.num_rooms}R • {b.room_type}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {b.booking_type === "visit_stay" ? "Visit + Stay" : "Hotel Only"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">₹{b.total_amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={statusColor(b.status) as any}>{b.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(b.created_at), "dd MMM, HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingsPanel;
