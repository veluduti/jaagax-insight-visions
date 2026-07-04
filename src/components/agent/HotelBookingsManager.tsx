import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Hotel, Search, RefreshCw, Plus, Calendar, MapPin, Users } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import HotelBookingDetails from "./HotelBookingDetails";
import HotelBookingDialog from "./HotelBookingDialog";

interface Booking {
  id: string;
  hotel_name?: string | null;
  hotel_address?: string | null;
  check_in: string;
  check_out: string;
  room_type?: string | null;
  num_guests?: number | null;
  num_rooms?: number | null;
  total_amount: number;
  status: string;
  payment_status?: string | null;
  hotel_id?: string | null;
  user_id?: string | null;
  booked_by_agent_id?: string | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  guest_email?: string | null;
  booking_reference?: string | null;
  created_at?: string;
}

interface HotelBookingsManagerProps {
  userId?: string;
  agentId?: string;
}

export default function HotelBookingsManager({ userId, agentId }: HotelBookingsManagerProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "confirmed" | "pending" | "cancelled">("all");

  const load = async () => {
    setLoading(true);
    const sb: any = supabase;

    try {
      // Try to fetch by agentId first, fallback to userId
      let queryBuilder = sb.from("hotel_bookings").select("*");

      if (agentId) {
        queryBuilder = queryBuilder.eq("booked_by_agent_id", agentId);
      } else if (userId) {
        queryBuilder = queryBuilder.eq("user_id", userId);
      } else {
        setBookings([]);
        setLoading(false);
        return;
      }

      const { data, error } = await queryBuilder.order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading hotel bookings:", error);
        setBookings([]);
      } else {
        setBookings((data || []) as Booking[]);
      }
    } catch (error) {
      console.error("Error loading hotel bookings:", error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agentId || userId) load();
  }, [agentId, userId]);

  const filtered = bookings.filter((b) => {
    if (activeTab !== "all" && b.booking_status !== activeTab) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (b.hotel_name || "").toLowerCase().includes(q) ||
      (b.guest_name || "").toLowerCase().includes(q) ||
      (b.guest_phone || "").toLowerCase().includes(q) ||
      (b.hotel_city || "").toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-emerald-500 text-white">Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500 text-white">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const counts = {
    all: bookings.length,
    confirmed: bookings.filter((b) => b.booking_status === "confirmed").length,
    pending: bookings.filter((b) => b.booking_status === "pending").length,
    cancelled: bookings.filter((b) => b.booking_status === "cancelled").length,
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Hotel className="h-5 w-5 text-primary" />
                  Hotel Bookings
                </CardTitle>
                <CardDescription>Manage hotel stays booked for your clients</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={load} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button size="sm" onClick={() => setCreating(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  New Booking
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by guest, hotel, city or phone..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="all" value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-4">
                <TabsTrigger value="all" className="text-xs">
                  All ({counts.all})
                </TabsTrigger>
                <TabsTrigger value="confirmed" className="text-xs">
                  Confirmed ({counts.confirmed})
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs">
                  Pending ({counts.pending})
                </TabsTrigger>
                <TabsTrigger value="cancelled" className="text-xs">
                  Cancelled ({counts.cancelled})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Bookings List */}
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 rounded-lg bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed rounded-xl">
                <Hotel className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium">No hotel bookings found</p>
                <p className="text-xs text-muted-foreground mb-3">
                  {query ? "Try adjusting your search" : "Book a hotel for your client's site visit"}
                </p>
                <Button size="sm" onClick={() => setCreating(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create First Booking
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((b, index) => (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-lg border border-border/60 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setSelected(b)}
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{b.hotel_name || "Partner Hotel"}</p>
                          {getStatusBadge(b.booking_status)}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Users className="h-3 w-3" />
                          {b.guest_name || "Guest"}
                          {b.hotel_city && (
                            <>
                              <MapPin className="h-3 w-3 ml-2" />
                              {b.hotel_city}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{formatCurrency(b.total_price)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {b.room_type || "Standard"} · {b.guests || 1} guest{(b.guests || 1) > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {b.check_in_date?.slice(0, 10)} → {b.check_out_date?.slice(0, 10)}
                      </span>
                      {b.created_at && <span>Booked: {new Date(b.created_at).toLocaleDateString("en-IN")}</span>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Booking Details Dialog */}
      <HotelBookingDetails
        booking={selected}
        onClose={() => setSelected(null)}
        onChanged={() => {
          setSelected(null);
          load();
        }}
      />

      {/* Create Booking Dialog */}
      <HotelBookingDialog
        open={creating}
        agentId={agentId}
        userId={userId}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          load();
          toast.success("Hotel booking created successfully!");
        }}
      />
    </>
  );
}
