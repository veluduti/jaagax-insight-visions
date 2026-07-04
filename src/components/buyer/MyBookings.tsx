import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Hotel,
  CalendarDays,
  Users,
  Clock,
  MapPin,
  Loader2,
  Pencil,
  Trash2,
  CalendarIcon,
  Star,
  ExternalLink,
} from "lucide-react";
import HotelReviewDialog from "@/components/hotels/HotelReviewDialog";
import { Link } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  hotel_id: string;
  check_in: string;
  check_out: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  num_guests: number;
  num_rooms: number;
  room_type: string;
  total_amount: number;
  status: string;
  booking_type: string;
  special_requests: string | null;
  created_at: string;
  guest_portal_token?: string | null;
  refunded_amount?: number | null;
  hotel?: { name: string; city: string; locality: string; price_per_night: number; discount_percentage: number | null };
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "outline" },
  confirmed: { label: "Confirmed", variant: "default" },
  checked_in: { label: "Checked in", variant: "default" },
  checked_out: { label: "Completed", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  completed: { label: "Completed", variant: "secondary" },
};

const MyBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState<Booking | null>(null);
  const [reviewFor, setReviewFor] = useState<Booking | null>(null);
  const [saving, setSaving] = useState(false);

  // edit form
  const [eCheckIn, setECheckIn] = useState<Date>();
  const [eCheckOut, setECheckOut] = useState<Date>();
  const [eGuests, setEGuests] = useState("1");
  const [eRooms, setERooms] = useState("1");
  const [eRoomType, setERoomType] = useState("Standard");
  const [ePhone, setEPhone] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: rows, error } = await supabase
      .from("hotel_bookings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Bookings fetch error:", error);
      setLoading(false);
      return;
    }

    if (rows && rows.length > 0) {
      const hotelIds = [...new Set(rows.map((b: any) => b.hotel_id).filter(Boolean))];
      const { data: hotels } = await supabase
        .from("partner_hotels")
        .select("id, name, city, locality, price_per_night, discount_percentage")
        .in("id", hotelIds);

      const hotelMap = new Map((hotels || []).map((h: any) => [h.id, h]));
      setBookings(rows.map((b: any) => ({ ...b, hotel: hotelMap.get(b.hotel_id) })));
    } else {
      setBookings([]);
    }
    setLoading(false);
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(price);

  const openEdit = (b: Booking) => {
    setEditing(b);
    setECheckIn(new Date(b.check_in));
    setECheckOut(new Date(b.check_out));
    setEGuests(String(b.num_guests));
    setERooms(String(b.num_rooms));
    setERoomType(b.room_type);
    setEPhone(b.guest_phone || "");
  };

  const saveEdit = async () => {
    if (!editing || !eCheckIn || !eCheckOut) return;
    if (eCheckOut <= eCheckIn) {
      toast.error("Check-out must be after check-in");
      return;
    }
    setSaving(true);
    try {
      const nights = Math.max(differenceInDays(eCheckOut, eCheckIn), 1);
      const pricePerNight = editing.hotel?.price_per_night || 0;
      const discountPct = Number(editing.hotel?.discount_percentage) || 0;
      const discounted = discountPct > 0 ? pricePerNight * (1 - discountPct / 100) : pricePerNight;
      const newTotal = Math.round(discounted * nights * parseInt(eRooms));

      const { error } = await supabase
        .from("hotel_bookings")
        .update({
          check_in: format(eCheckIn, "yyyy-MM-dd"),
          check_out: format(eCheckOut, "yyyy-MM-dd"),
          num_guests: parseInt(eGuests),
          num_rooms: parseInt(eRooms),
          room_type: eRoomType,
          guest_phone: ePhone.trim() || null,
          total_amount: newTotal,
        })
        .eq("id", editing.id);

      if (error) throw error;

      // Notify admin/agent
      supabase.functions.invoke("send-booking-confirmation", {
        body: {
          bookingId: editing.id,
          hotelName: editing.hotel?.name || "Hotel",
          guestName: editing.guest_name,
          guestPhone: ePhone.trim() || editing.guest_phone || undefined,
          guestEmail: editing.guest_email || undefined,
          checkIn: format(eCheckIn, "dd MMM yyyy"),
          checkOut: format(eCheckOut, "dd MMM yyyy"),
          totalAmount: newTotal,
          bookingType: editing.booking_type,
          action: "updated",
        },
      }).catch((e) => console.warn("Notify failed:", e));

      toast.success("Booking updated");
      setEditing(null);
      fetchBookings();
    } catch (err: any) {
      toast.error("Update failed", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke("hotel-booking-cancel", {
        body: { booking_id: deleting.id, reason: "guest_cancel", cancelled_by: user?.id || null },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Cancellation failed");
      }
      const refund = data.refund?.amount || 0;
      toast.success(
        refund > 0
          ? `Booking cancelled. Refund of ₹${refund.toLocaleString()} initiated (${data.refund.percent}%).`
          : "Booking cancelled. This slot was outside the free-cancellation window.",
      );
      setDeleting(null);
      fetchBookings();
    } catch (err: any) {
      toast.error(err.message || "Cancellation failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5 text-primary" />
            My Hotel Bookings
          </CardTitle>
          <CardDescription>Track your hotel stays and visit packages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Hotel className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No bookings yet</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-4">
              Browse our partner hotels and book your stay for property visits.
            </p>
            <Button onClick={() => navigate("/hotels")}>Browse Hotels</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5 text-primary" />
            My Hotel Bookings
          </CardTitle>
          <CardDescription>{bookings.length} booking{bookings.length !== 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bookings.map((booking) => {
            const status = statusConfig[booking.status] || statusConfig.pending;
            const isCancelled = booking.status === "cancelled";
            return (
              <Card key={booking.id} className="overflow-hidden">
                <div className="flex flex-col">
                  <div className="flex-1 p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-lg">{booking.hotel?.name || "Hotel"}</h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {booking.hotel?.locality}, {booking.hotel?.city}
                        </p>
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        <div>
                          <p className="text-xs">Check-in</p>
                          <p className="font-medium text-foreground">{format(new Date(booking.check_in), "dd MMM yyyy")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        <div>
                          <p className="text-xs">Check-out</p>
                          <p className="font-medium text-foreground">{format(new Date(booking.check_out), "dd MMM yyyy")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <div>
                          <p className="text-xs">Guests / Rooms</p>
                          <p className="font-medium text-foreground">{booking.num_guests} / {booking.num_rooms}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <div>
                          <p className="text-xs">Room Type</p>
                          <p className="font-medium text-foreground">{booking.room_type}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">
                          {booking.booking_type === "site_visit" || booking.booking_type === "visit_stay"
                            ? "Visit + Stay"
                            : "Hotel Only"}
                        </Badge>
                        {booking.special_requests && (
                          <span className="text-xs text-muted-foreground">Has special requests</span>
                        )}
                      </div>
                      <p className="text-lg font-bold text-primary">{formatPrice(booking.total_amount)}</p>
                    </div>

                    {!isCancelled && (
                      <div className="flex gap-2 pt-2 border-t">
                        <Button size="sm" variant="outline" onClick={() => openEdit(booking)} className="flex-1">
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleting(booking)}
                          className="flex-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
            <DialogDescription>{editing?.hotel?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Check-in</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start font-normal", !eCheckIn && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {eCheckIn ? format(eCheckIn, "MMM dd, yyyy") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={eCheckIn} onSelect={setECheckIn} disabled={(d) => d < new Date()} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label>Check-out</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start font-normal", !eCheckOut && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {eCheckOut ? format(eCheckOut, "MMM dd, yyyy") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={eCheckOut} onSelect={setECheckOut} disabled={(d) => d <= (eCheckIn || new Date())} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Guests</Label>
                <Select value={eGuests} onValueChange={setEGuests}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5,6].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rooms</Label>
                <Select value={eRooms} onValueChange={setERooms}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Room Type</Label>
                <Select value={eRoomType} onValueChange={setERoomType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Deluxe">Deluxe</SelectItem>
                    <SelectItem value="Suite">Suite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={ePhone} onChange={(e) => setEPhone(e.target.value)} placeholder="+91..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently cancel your booking at {deleting?.hotel?.name}. The admin and any assigned agent will be notified. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep booking</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MyBookings;
