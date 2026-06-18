import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { hotelService, type HotelBooking } from "@/services/hotelService";
import BookingDetail from "./BookingDetail";
import { Hotel, Plus, Calendar, Users, FileText, XCircle, Eye, Loader2 } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-green-500/15 text-green-700 dark:text-green-400",
  modified: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-red-500/15 text-red-700 dark:text-red-400",
};

export default function HotelBookings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [builderProfileId, setBuilderProfileId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<HotelBooking[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, cancelled: 0 });
  const [activeTab, setActiveTab] = useState("all");
  const [selected, setSelected] = useState<HotelBooking | null>(null);
  const [showNew, setShowNew] = useState(false);

  const [form, setForm] = useState({
    hotel_name: "",
    hotel_address: "",
    room_type: "Standard",
    check_in: "",
    check_out: "",
    num_guests: 1,
    num_rooms: 1,
    total_amount: 0,
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    special_requests: "",
  });
  const [creating, setCreating] = useState(false);

  const load = async (bpId: string) => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([hotelService.getBookings(bpId), hotelService.getBookingStats(bpId)]);
      setBookings(list);
      setStats(s);
    } catch (e: any) {
      toast({ title: "Failed to load bookings", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    hotelService.getBuilderProfileId(user.id).then((bp) => {
      setBuilderProfileId(bp);
      if (bp) load(bp);
      else setLoading(false);
    });
  }, [user?.id]);

  const filtered = bookings.filter((b) => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return b.status === "confirmed" || b.status === "modified";
    if (activeTab === "completed") return b.status === "completed";
    if (activeTab === "cancelled") return b.status === "cancelled";
    return true;
  });

  const handleCreate = async () => {
    if (!builderProfileId) return;
    if (!form.hotel_name || !form.check_in || !form.check_out || !form.guest_name || !form.total_amount) {
      toast({ title: "Missing fields", description: "Fill all required fields", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await hotelService.createBooking({ ...form, builder_profile_id: builderProfileId });
      toast({ title: "Booking created" });
      setShowNew(false);
      setForm({ hotel_name: "", hotel_address: "", room_type: "Standard", check_in: "", check_out: "", num_guests: 1, num_rooms: 1, total_amount: 0, guest_name: "", guest_email: "", guest_phone: "", special_requests: "" });
      load(builderProfileId);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Hotel className="h-7 w-7 text-primary" /> Hotel Bookings
            </h1>
            <p className="text-muted-foreground">Manage site-visit stays, client meetings and project tours.</p>
          </div>
          <Button onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Booking
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Bookings", value: stats.total, color: "text-primary" },
            { label: "Active", value: stats.active, color: "text-green-600" },
            { label: "Completed", value: stats.completed, color: "text-emerald-600" },
            { label: "Cancelled", value: stats.cancelled, color: "text-red-600" },
          ].map((s) => (
            <Card key={s.label} className="border-border shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {!builderProfileId && !loading && (
          <Card className="border-border shadow-sm">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Create your builder profile first to manage hotel bookings.</p>
            </CardContent>
          </Card>
        )}

        {builderProfileId && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 max-w-md">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4 space-y-3">
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : filtered.length === 0 ? (
                <Card className="border-border shadow-sm">
                  <CardContent className="p-8 text-center text-muted-foreground">No bookings here yet.</CardContent>
                </Card>
              ) : (
                filtered.map((b) => (
                  <Card key={b.id} className="border-border shadow-sm hover:shadow-md transition">
                    <CardContent className="p-4 flex flex-wrap items-start gap-4">
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{b.hotel_name}</h3>
                          <Badge className={STATUS_STYLES[b.status] ?? ""}>{b.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{b.hotel_address}</p>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{b.check_in} → {b.check_out}</span>
                          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{b.num_guests} · {b.room_type}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₹{Number(b.total_amount).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground uppercase">{b.payment_status}</p>
                      </div>
                      <div className="w-full flex flex-wrap gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => setSelected(b)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Button>
                        {b.status !== "cancelled" && b.status !== "completed" && (
                          <Button size="sm" variant="outline" onClick={async () => {
                            await hotelService.cancelBooking(b.id, "Cancelled from list");
                            load(builderProfileId);
                          }}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={async () => {
                          const url = await hotelService.generateInvoice(b.id);
                          toast({ title: "Invoice ready", description: url });
                        }}>
                          <FileText className="h-3.5 w-3.5 mr-1" /> Invoice
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {selected && (
        <BookingDetail
          booking={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => builderProfileId && load(builderProfileId)}
        />
      )}

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Hotel Booking</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Hotel name *</Label><Input value={form.hotel_name} onChange={(e) => setForm({ ...form, hotel_name: e.target.value })} /></div>
              <div className="col-span-2"><Label>Hotel address</Label><Input value={form.hotel_address} onChange={(e) => setForm({ ...form, hotel_address: e.target.value })} /></div>
              <div><Label>Check-in *</Label><Input type="date" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} /></div>
              <div><Label>Check-out *</Label><Input type="date" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} /></div>
              <div><Label>Room type</Label><Input value={form.room_type} onChange={(e) => setForm({ ...form, room_type: e.target.value })} /></div>
              <div><Label>Guests</Label><Input type="number" min={1} value={form.num_guests} onChange={(e) => setForm({ ...form, num_guests: Number(e.target.value) })} /></div>
              <div><Label>Rooms</Label><Input type="number" min={1} value={form.num_rooms} onChange={(e) => setForm({ ...form, num_rooms: Number(e.target.value) })} /></div>
              <div><Label>Total (₹) *</Label><Input type="number" min={0} value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: Number(e.target.value) })} /></div>
              <div className="col-span-2"><Label>Guest name *</Label><Input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} /></div>
              <div><Label>Guest email</Label><Input type="email" value={form.guest_email} onChange={(e) => setForm({ ...form, guest_email: e.target.value })} /></div>
              <div><Label>Guest phone</Label><Input value={form.guest_phone} onChange={(e) => setForm({ ...form, guest_phone: e.target.value })} /></div>
              <div className="col-span-2"><Label>Special requests</Label><Textarea value={form.special_requests} onChange={(e) => setForm({ ...form, special_requests: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>{creating ? "Creating…" : "Create booking"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
