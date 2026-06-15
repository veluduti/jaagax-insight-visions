import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Hotel, Search, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import HotelBookingDetails from "./HotelBookingDetails";
import HotelBookingDialog from "./HotelBookingDialog";

interface Booking {
  id: string;
  hotel_name?: string | null;
  hotel_city?: string | null;
  check_in_date: string;
  check_out_date: string;
  room_type?: string | null;
  guests?: number | null;
  total_price: number;
  booking_status: string;
  hotel_id?: string | null;
  user_id?: string | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  created_at?: string;
}

export default function HotelBookingsManager({ agentId }: { agentId: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "confirmed" | "pending" | "cancelled">("all");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const sb: any = supabase;
    const { data, error } = await sb
      .from("hotel_bookings")
      .select("*")
      .eq("booked_by_agent_id", agentId)
      .order("created_at", { ascending: false });
    if (error) {
      // Fallback: agent may not have direct rows; show empty
      setBookings([]);
    } else {
      setBookings((data || []) as Booking[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (agentId) load();
  }, [agentId]);

  const filtered = bookings.filter((b) => {
    if (filter !== "all" && b.booking_status !== filter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (b.hotel_name || "").toLowerCase().includes(q) ||
      (b.guest_name || "").toLowerCase().includes(q) ||
      (b.guest_phone || "").toLowerCase().includes(q) ||
      (b.hotel_city || "").toLowerCase().includes(q)
    );
  });

  const badgeColor = (s: string) =>
    s === "confirmed"
      ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
      : s === "cancelled"
        ? "bg-rose-500/15 text-rose-600 border-rose-500/30"
        : "bg-amber-500/15 text-amber-600 border-amber-500/30";

  const counts = {
    all: bookings.length,
    confirmed: bookings.filter((b) => b.booking_status === "confirmed").length,
    pending: bookings.filter((b) => b.booking_status === "pending").length,
    cancelled: bookings.filter((b) => b.booking_status === "cancelled").length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Hotel className="h-5 w-5 text-primary" /> Client Hotel Bookings
            </CardTitle>
            <CardDescription>Stays you've booked on behalf of your clients</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-1" /> New booking
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search guest, phone, hotel or city…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {(["all", "confirmed", "pending", "cancelled"] as const).map((k) => (
              <Button
                key={k}
                size="sm"
                variant={filter === k ? "default" : "outline"}
                onClick={() => setFilter(k)}
                className="capitalize"
              >
                {k} <span className="ml-1 text-xs opacity-70">({counts[k]})</span>
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading bookings…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <Hotel className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No bookings found</p>
            <Button size="sm" className="mt-3" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create your first booking
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelected(b)}
                className="w-full text-left p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition space-y-2"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-semibold">{b.hotel_name || "Partner Hotel"}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.guest_name || "Guest"} {b.hotel_city ? `• ${b.hotel_city}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className={badgeColor(b.booking_status)}>
                    {b.booking_status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Check-in</p>
                    <p className="font-medium">{b.check_in_date?.slice(0, 10)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Check-out</p>
                    <p className="font-medium">{b.check_out_date?.slice(0, 10)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Guests</p>
                    <p className="font-medium">{b.guests || 1}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-medium">₹{Number(b.total_price || 0).toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>

      <HotelBookingDetails
        booking={selected}
        onClose={() => setSelected(null)}
        onChanged={() => {
          setSelected(null);
          load();
        }}
      />

      <HotelBookingDialog
        open={creating}
        agentId={agentId}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          load();
          toast.success("Booking created");
        }}
      />
    </Card>
  );
}
