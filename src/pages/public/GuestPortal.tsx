import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Check, MessageSquare, Sparkles, LogIn } from "lucide-react";
import { toast } from "sonner";

export default function GuestPortal() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [hotel, setHotel] = useState<any>(null);
  const [addons, setAddons] = useState<any[]>([]);
  const [checkin, setCheckin] = useState<any>({ id_number: "", eta: "", requests: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) return;
      const { data: b } = await (supabase as any).from("hotel_bookings").select("*").eq("guest_portal_token", token).maybeSingle();
      if (!b) { setLoading(false); return; }
      setBooking(b);
      setCheckin(b.checkin_info || { id_number: "", eta: "", requests: "" });
      const [h, a] = await Promise.all([
        (supabase as any).from("partner_hotels").select("*").eq("id", b.hotel_id).maybeSingle(),
        (supabase as any).from("hotel_addons").select("*").eq("hotel_id", b.hotel_id).eq("is_active", true),
      ]);
      setHotel(h.data); setAddons(a.data || []);
      setLoading(false);
    })();
  }, [token]);

  const submitCheckin = async () => {
    setBusy(true);
    await (supabase as any).from("hotel_bookings").update({ checkin_info: checkin }).eq("id", booking.id);
    await (supabase as any).from("guest_portal_requests").insert({
      booking_id: booking.id, hotel_id: booking.hotel_id, request_type: "checkin", payload: checkin,
    });
    setBusy(false); toast.success("Check-in submitted");
  };

  const requestAddon = async (addon: any) => {
    await (supabase as any).from("guest_portal_requests").insert({
      booking_id: booking.id, hotel_id: booking.hotel_id, request_type: "addon",
      payload: { addon_id: addon.id, title: addon.title, price: addon.price },
    });
    toast.success(`Requested: ${addon.title}`);
  };

  const sendMessage = async () => {
    if (!msg.trim()) return;
    await (supabase as any).from("guest_portal_requests").insert({
      booking_id: booking.id, hotel_id: booking.hotel_id, request_type: "message", payload: { message: msg },
    });
    setMsg(""); toast.success("Message sent to the hotel");
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-6 w-6" /></div>;
  if (!booking) return <div className="p-8 text-center text-sm text-muted-foreground">This portal link is invalid or expired.</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/60 bg-gradient-to-b from-emerald-500/5">
        <div className="container mx-auto max-w-3xl px-4 py-6">
          <div className="text-xs uppercase tracking-wider text-emerald-400 mb-1">Your stay</div>
          <h1 className="text-2xl font-semibold">{hotel?.name}</h1>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">{new Date(booking.check_in_date).toDateString()} → {new Date(booking.check_out_date).toDateString()}</Badge>
            <Badge>{booking.number_of_guests || 1} guest(s)</Badge>
            <Badge variant="outline">Ref {booking.id.slice(0, 8)}</Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6">
        <Tabs defaultValue="checkin">
          <TabsList>
            <TabsTrigger value="checkin"><LogIn className="h-4 w-4 mr-1.5" /> Check-in</TabsTrigger>
            <TabsTrigger value="addons"><Sparkles className="h-4 w-4 mr-1.5" /> Add-ons</TabsTrigger>
            <TabsTrigger value="message"><MessageSquare className="h-4 w-4 mr-1.5" /> Message</TabsTrigger>
          </TabsList>

          <TabsContent value="checkin">
            <Card>
              <CardHeader><CardTitle className="text-base">Digital check-in</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>ID number (Aadhaar / passport)</Label><Input value={checkin.id_number} onChange={e => setCheckin({ ...checkin, id_number: e.target.value })} /></div>
                <div><Label>Estimated time of arrival</Label><Input type="time" value={checkin.eta} onChange={e => setCheckin({ ...checkin, eta: e.target.value })} /></div>
                <div><Label>Special requests</Label><Textarea rows={3} value={checkin.requests} onChange={e => setCheckin({ ...checkin, requests: e.target.value })} /></div>
                <Button onClick={submitCheckin} disabled={busy}>{busy && <Loader2 className="animate-spin h-4 w-4 mr-2" />}<Check className="h-4 w-4 mr-2" /> Submit</Button>
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
                <Textarea rows={4} value={msg} onChange={e => setMsg(e.target.value)} placeholder="Hi! We'll be arriving late…" />
                <Button onClick={sendMessage}>Send</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
