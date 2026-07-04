import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, Check, MessageSquare, Sparkles, LogIn, MapPin, Phone,
  CalendarDays, Users, BedDouble, ShieldCheck, XCircle, Star, Info,
} from "lucide-react";
import { toast } from "sonner";
import HotelReviewDialog from "@/components/hotels/HotelReviewDialog";

export default function GuestPortal() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [hotel, setHotel] = useState<any>(null);
  const [addons, setAddons] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [checkin, setCheckin] = useState<any>({ id_number: "", eta: "", requests: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [hasReview, setHasReview] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: b } = await supabase.from("hotel_bookings").select("*")
        .eq("guest_portal_token", token).maybeSingle();
      if (!b) { setLoading(false); return; }
      setBooking(b);
      setCheckin(b.checkin_info || { id_number: "", eta: "", requests: "" });
      const [h, a, m, r] = await Promise.all([
        supabase.from("partner_hotels").select("*").eq("id", b.hotel_id).maybeSingle(),
        supabase.from("hotel_addons").select("*").eq("hotel_id", b.hotel_id).eq("is_active", true),
        supabase.from("hotel_guest_messages").select("*").eq("booking_id", b.id).order("created_at"),
        supabase.from("hotel_reviews").select("id").eq("booking_id", b.id).maybeSingle(),
      ]);
      setHotel(h.data); setAddons(a.data || []); setMessages(m.data || []);
      setHasReview(!!r.data);
      setLoading(false);
    })();
  }, [token]);

  // Realtime messages
  useEffect(() => {
    if (!booking?.id) return;
    const ch = supabase.channel(`guest-msgs-${booking.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "hotel_guest_messages", filter: `booking_id=eq.${booking.id}` },
        (payload) => setMessages(m => [...m, payload.new]),
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [booking?.id]);

  const submitCheckin = async () => {
    setBusy(true);
    await supabase.from("hotel_bookings").update({ checkin_info: checkin }).eq("id", booking.id);
    await supabase.from("guest_portal_requests").insert({
      booking_id: booking.id, hotel_id: booking.hotel_id, request_type: "checkin", payload: checkin,
    });
    setBusy(false); toast.success("Check-in info sent to hotel");
  };

  const requestAddon = async (addon: any) => {
    await supabase.from("guest_portal_requests").insert({
      booking_id: booking.id, hotel_id: booking.hotel_id, request_type: "addon",
      payload: { addon_id: addon.id, title: addon.title, price: addon.price },
    });
    toast.success(`Requested: ${addon.title}`);
  };

  const sendMessage = async () => {
    if (!msg.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("hotel_guest_messages").insert({
      hotel_id: booking.hotel_id, booking_id: booking.id,
      guest_user_id: user?.id || booking.user_id || null,
      guest_name: booking.guest_name, guest_phone: booking.guest_phone,
      sender: "guest", body: msg.trim(),
    });
    setMsg("");
  };

  const cancelBooking = async () => {
    if (!confirm("Cancel this booking? Refund amount will depend on the cancellation window.")) return;
    setCancelBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.functions.invoke("hotel-booking-cancel", {
      body: { booking_id: booking.id, reason: "guest_cancel", cancelled_by: user?.id || null },
    });
    setCancelBusy(false);
    if (error || !data?.success) return toast.error(data?.error || error?.message || "Cancellation failed");
    toast.success(
      data.refund?.amount > 0
        ? `Booking cancelled. Refund of ₹${data.refund.amount.toLocaleString()} initiated.`
        : "Booking cancelled. This slot was outside the free-cancellation window.",
    );
    setBooking({ ...booking, ...data.booking });
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-6 w-6" /></div>;
  if (!booking) return <div className="p-8 text-center text-sm text-muted-foreground">This portal link is invalid or expired.</div>;

  const isCancelled = booking.status === "cancelled";
  const isCheckedOut = booking.status === "checked_out";
  const isCheckedIn = booking.status === "checked_in";
  const canCancel = !isCancelled && !isCheckedOut && !isCheckedIn;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/60 bg-gradient-to-b from-emerald-500/5">
        <div className="container mx-auto max-w-3xl px-4 py-6">
          <div className="text-xs uppercase tracking-wider text-emerald-400 mb-1">Your stay</div>
          <h1 className="text-2xl font-semibold">{hotel?.name}</h1>
          {hotel?.address && (
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {hotel.address}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">
              <CalendarDays className="w-3 h-3 mr-1" />
              {new Date(booking.check_in).toDateString()} → {new Date(booking.check_out).toDateString()}
            </Badge>
            <Badge><Users className="w-3 h-3 mr-1" />{booking.num_guests || 1} guest(s)</Badge>
            <Badge variant="outline"><BedDouble className="w-3 h-3 mr-1" />{booking.room_type} × {booking.num_rooms}</Badge>
            <Badge variant="outline">Ref {booking.booking_reference || booking.id.slice(0, 8)}</Badge>
            <StatusBadge status={booking.status} />
          </div>
          {isCancelled && (
            <div className="mt-3 text-sm text-red-400 flex items-center gap-2">
              <XCircle className="w-4 h-4" /> Cancelled
              {Number(booking.refunded_amount) > 0 && ` · ₹${Number(booking.refunded_amount).toLocaleString()} refund`}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* Action bar */}
        <Card><CardContent className="p-4 flex flex-wrap gap-2 items-center justify-between">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Total paid: <b className="text-foreground">₹{Number(booking.total_amount).toLocaleString()}</b>
          </div>
          <div className="flex gap-2">
            {isCheckedOut && !hasReview && (
              <Button size="sm" onClick={() => setReviewOpen(true)}>
                <Star className="w-4 h-4 mr-1" /> Leave a review
              </Button>
            )}
            {canCancel && (
              <Button size="sm" variant="destructive" onClick={cancelBooking} disabled={cancelBusy}>
                {cancelBusy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                Cancel booking
              </Button>
            )}
            {hotel?.contact_phone && (
              <Button size="sm" variant="outline" asChild>
                <a href={`tel:${hotel.contact_phone}`}><Phone className="w-4 h-4 mr-1" /> Call hotel</a>
              </Button>
            )}
          </div>
        </CardContent></Card>

        {!isCancelled && (
          <Tabs defaultValue={isCheckedIn || isCheckedOut ? "message" : "checkin"}>
            <TabsList>
              <TabsTrigger value="checkin"><LogIn className="h-4 w-4 mr-1.5" /> Check-in</TabsTrigger>
              <TabsTrigger value="addons"><Sparkles className="h-4 w-4 mr-1.5" /> Add-ons</TabsTrigger>
              <TabsTrigger value="message"><MessageSquare className="h-4 w-4 mr-1.5" /> Messages</TabsTrigger>
            </TabsList>

            <TabsContent value="checkin">
              <Card>
                <CardHeader><CardTitle className="text-base">Digital check-in</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><Label>ID number (Aadhaar / passport)</Label>
                    <Input value={checkin.id_number} onChange={e => setCheckin({ ...checkin, id_number: e.target.value })} /></div>
                  <div><Label>Estimated time of arrival</Label>
                    <Input type="time" value={checkin.eta} onChange={e => setCheckin({ ...checkin, eta: e.target.value })} /></div>
                  <div><Label>Special requests</Label>
                    <Textarea rows={3} value={checkin.requests} onChange={e => setCheckin({ ...checkin, requests: e.target.value })} /></div>
                  <Button onClick={submitCheckin} disabled={busy}>
                    {busy && <Loader2 className="animate-spin h-4 w-4 mr-2" />}<Check className="h-4 w-4 mr-2" /> Submit
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="addons">
              <Card>
                <CardHeader><CardTitle className="text-base">Enhance your stay</CardTitle></CardHeader>
                <CardContent className="grid gap-2">
                  {addons.map(a => (
                    <div key={a.id} className="flex items-center justify-between border-b border-border/40 py-2 last:border-b-0">
                      <div>
                        <div className="text-sm font-medium">{a.title}</div>
                        <div className="text-xs text-muted-foreground">{a.description}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">₹{a.price}</span>
                        <Button size="sm" onClick={() => requestAddon(a)}>Request</Button>
                      </div>
                    </div>
                  ))}
                  {addons.length === 0 && <p className="text-sm text-muted-foreground">No add-ons available.</p>}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="message">
              <Card>
                <CardHeader><CardTitle className="text-base">Message the hotel</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="max-h-72 overflow-y-auto space-y-2 rounded-md border border-border/40 p-3 bg-muted/30">
                    {messages.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No messages yet. Say hi to your host!</p>}
                    {messages.map(m => (
                      <div key={m.id} className={`flex ${m.sender === "guest" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          m.sender === "guest" ? "bg-primary text-primary-foreground" : "bg-background border border-border/50"
                        }`}>
                          {m.body}
                          <div className={`text-[10px] mt-1 opacity-70`}>
                            {new Date(m.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input value={msg} onChange={e => setMsg(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Type a message…" />
                    <Button onClick={sendMessage}>Send</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {isCheckedOut && (
          <Card><CardContent className="p-4 text-center space-y-2">
            <Info className="w-5 h-5 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Your stay is complete. Thanks for choosing us!</p>
            {!hasReview && (
              <Button onClick={() => setReviewOpen(true)}>
                <Star className="w-4 h-4 mr-2" /> Rate your stay
              </Button>
            )}
          </CardContent></Card>
        )}
      </div>

      <HotelReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        hotelId={booking.hotel_id}
        bookingId={booking.id}
        guestName={booking.guest_name}
        onSubmitted={() => setHasReview(true)}
      />
    </div>
  );
}

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-yellow-500/15 text-yellow-400" },
    confirmed: { label: "Confirmed", cls: "bg-emerald-500/15 text-emerald-400" },
    checked_in: { label: "Checked in", cls: "bg-blue-500/15 text-blue-400" },
    checked_out: { label: "Completed", cls: "bg-muted text-muted-foreground" },
    cancelled: { label: "Cancelled", cls: "bg-red-500/15 text-red-400" },
  };
  const s = map[status] || { label: status, cls: "bg-muted" };
  return <Badge className={s.cls}>{s.label}</Badge>;
};
