import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Send, MessageCircle, Star, Search, Phone, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

type Booking = {
  id: string; guest_name: string; guest_phone: string | null;
  guest_email: string | null; check_in: string; check_out: string;
  user_id: string | null; status: string;
};

type Msg = {
  id: string; booking_id: string | null; guest_name: string | null;
  guest_phone: string | null; guest_user_id: string | null;
  sender: string; body: string; sent_via_whatsapp: boolean;
  read_by_partner: boolean; created_at: string;
};

type Review = {
  id: string; booking_id: string | null; guest_name: string;
  rating: number; title: string | null; body: string | null;
  response: string | null; responded_at: string | null; created_at: string;
};

export default function PartnerInbox() {
  const ctx = usePartnerHotel();
  const [tab, setTab] = useState("messages");
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [useWa, setUseWa] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!ctx.hotelId) return;
    setLoading(true);
    const [{ data: b }, { data: m }, { data: r }] = await Promise.all([
      (supabase as any).from("hotel_bookings")
        .select("id,guest_name,guest_phone,guest_email,check_in,check_out,user_id,status")
        .eq("hotel_id", ctx.hotelId).order("check_in", { ascending: false }).limit(200),
      (supabase as any).from("hotel_guest_messages")
        .select("*").eq("hotel_id", ctx.hotelId).order("created_at", { ascending: true }),
      (supabase as any).from("hotel_reviews")
        .select("*").eq("hotel_id", ctx.hotelId).order("created_at", { ascending: false }),
    ]);
    setBookings(b || []);
    setMessages(m || []);
    setReviews(r || []);
    setLoading(false);
  };

  useEffect(() => { if (!ctx.loading) load(); }, [ctx.loading, ctx.hotelId]);

  // realtime updates on messages
  useEffect(() => {
    if (!ctx.hotelId) return;
    const ch = supabase.channel(`inbox-${ctx.hotelId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "hotel_guest_messages", filter: `hotel_id=eq.${ctx.hotelId}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ctx.hotelId]);

  const threads = useMemo(() => {
    const map = new Map<string, { booking: Booking; last: Msg | null; unread: number }>();
    for (const b of bookings) {
      map.set(b.id, { booking: b, last: null, unread: 0 });
    }
    for (const m of messages) {
      if (!m.booking_id) continue;
      const t = map.get(m.booking_id);
      if (!t) continue;
      if (!t.last || t.last.created_at < m.created_at) t.last = m;
      if (m.sender === "guest" && !m.read_by_partner) t.unread += 1;
    }
    let arr = Array.from(map.values());
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((t) => t.booking.guest_name?.toLowerCase().includes(q));
    }
    arr.sort((a, b) => {
      const ax = a.last?.created_at || a.booking.check_in;
      const bx = b.last?.created_at || b.booking.check_in;
      return ax < bx ? 1 : -1;
    });
    return arr;
  }, [bookings, messages, search]);

  const activeThread = useMemo(
    () => threads.find((t) => t.booking.id === activeBookingId) || null,
    [threads, activeBookingId]
  );
  const activeMessages = useMemo(
    () => messages.filter((m) => m.booking_id === activeBookingId),
    [messages, activeBookingId]
  );

  // mark as read when a thread opens
  useEffect(() => {
    if (!activeBookingId) return;
    const unreadIds = messages
      .filter((m) => m.booking_id === activeBookingId && m.sender === "guest" && !m.read_by_partner)
      .map((m) => m.id);
    if (unreadIds.length) {
      (supabase as any).from("hotel_guest_messages")
        .update({ read_by_partner: true }).in("id", unreadIds).then(() => {});
    }
  }, [activeBookingId, messages]);

  const send = async () => {
    if (!body.trim() || !activeThread || !ctx.hotelId) return;
    setSending(true);
    const b = activeThread.booking;
    const payload = {
      hotel_id: ctx.hotelId,
      booking_id: b.id,
      guest_user_id: b.user_id,
      guest_name: b.guest_name,
      guest_phone: b.guest_phone,
      sender: "partner",
      body: body.trim(),
      sent_via_whatsapp: false,
    };
    const { data: inserted, error } = await (supabase as any)
      .from("hotel_guest_messages").insert(payload).select("id").single();
    if (error) { setSending(false); toast.error(error.message); return; }

    if (useWa && b.guest_phone) {
      try {
        const { error: fnErr } = await supabase.functions.invoke("send-whatsapp-message", {
          body: {
            message_id: inserted.id,
            hotel_name: ctx.hotelName,
            to_phone: b.guest_phone,
            body: body.trim(),
          },
        });
        if (fnErr) toast.warning("Sent in-app, WhatsApp failed: " + fnErr.message);
        else toast.success("Sent (in-app + WhatsApp)");
      } catch (e: any) {
        toast.warning("Sent in-app, WhatsApp failed");
      }
    } else {
      toast.success("Message sent");
    }
    setBody(""); setSending(false); load();
  };

  const respondToReview = async (id: string, response: string) => {
    if (!response.trim()) return;
    const { error } = await (supabase as any).from("hotel_reviews")
      .update({ response, responded_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Response saved");
    load();
  };

  if (ctx.loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <PartnerNav /><PartnerSubNav />
        <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </div>
    );
  }

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PartnerNav /><PartnerSubNav />
      <main className="container mx-auto max-w-7xl px-4 py-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-muted-foreground">Messages & reviews · {ctx.hotelName}</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="messages">
              <MessageCircle className="h-4 w-4 mr-1" /> Messages
            </TabsTrigger>
            <TabsTrigger value="reviews">
              <Star className="h-4 w-4 mr-1" /> Reviews {reviews.length > 0 && (
                <span className="ml-1 text-xs text-amber-400">({avgRating.toFixed(1)}★)</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="mt-4">
            <div className="grid gap-4 md:grid-cols-[320px_1fr]">
              <Card>
                <CardContent className="p-3">
                  <div className="relative mb-2">
                    <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-8" placeholder="Search guests" value={search}
                      onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <div className="max-h-[70vh] overflow-y-auto space-y-1">
                    {loading ? (
                      <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                    ) : threads.length === 0 ? (
                      <div className="py-6 text-center text-xs text-muted-foreground">No bookings yet</div>
                    ) : threads.map((t) => (
                      <button key={t.booking.id}
                        onClick={() => setActiveBookingId(t.booking.id)}
                        className={`w-full rounded-md p-2 text-left transition ${
                          activeBookingId === t.booking.id ? "bg-emerald-500/15" : "hover:bg-muted/40"
                        }`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                              <User className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{t.booking.guest_name}</div>
                              <div className="truncate text-xs text-muted-foreground">
                                {t.last?.body || `Check-in ${format(parseISO(t.booking.check_in), "MMM d")}`}
                              </div>
                            </div>
                          </div>
                          {t.unread > 0 && (
                            <Badge className="bg-emerald-500 text-white">{t.unread}</Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  {!activeThread ? (
                    <div className="flex h-[70vh] items-center justify-center text-sm text-muted-foreground">
                      Select a conversation
                    </div>
                  ) : (
                    <div className="flex h-[70vh] flex-col">
                      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                        <div>
                          <div className="font-medium">{activeThread.booking.guest_name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            {activeThread.booking.guest_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />{activeThread.booking.guest_phone}
                              </span>
                            )}
                            <span>
                              · {format(parseISO(activeThread.booking.check_in), "MMM d")} → {format(parseISO(activeThread.booking.check_out), "MMM d")}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline">{activeThread.booking.status}</Badge>
                      </div>
                      <div className="flex-1 space-y-2 overflow-y-auto p-4">
                        {activeMessages.length === 0 && (
                          <div className="py-6 text-center text-xs text-muted-foreground">
                            No messages yet — say hello to your guest.
                          </div>
                        )}
                        {activeMessages.map((m) => (
                          <div key={m.id}
                            className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                              m.sender === "partner"
                                ? "ml-auto bg-emerald-500/15 text-emerald-50"
                                : "bg-muted/50"
                            }`}>
                            <div className="whitespace-pre-wrap">{m.body}</div>
                            <div className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1">
                              {format(parseISO(m.created_at), "MMM d, p")}
                              {m.sent_via_whatsapp && <span className="text-emerald-400">· WhatsApp</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-border/60 p-3 space-y-2">
                        <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)}
                          placeholder="Type a message…" />
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            <input type="checkbox" checked={useWa} onChange={(e) => setUseWa(e.target.checked)}
                              disabled={!activeThread.booking.guest_phone} />
                            Also send via WhatsApp{!activeThread.booking.guest_phone && " (no phone on file)"}
                          </label>
                          <Button size="sm" onClick={send} disabled={sending || !body.trim()}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white">
                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1" />Send</>}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="mt-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : reviews.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
                No reviews yet. Reviews from guests will appear here.
              </CardContent></Card>
            ) : reviews.map((r) => (
              <ReviewCard key={r.id} r={r} onRespond={respondToReview} />
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function ReviewCard({ r, onRespond }: { r: Review; onRespond: (id: string, text: string) => void }) {
  const [text, setText] = useState(r.response || "");
  const [editing, setEditing] = useState(!r.response);
  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="font-medium">{r.guest_name}</div>
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                ))}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">{format(parseISO(r.created_at), "PP")}</div>
          </div>
        </div>
        {r.title && <div className="font-medium">{r.title}</div>}
        {r.body && <div className="text-sm text-muted-foreground">{r.body}</div>}

        <div className="border-t border-border/40 pt-3">
          <div className="mb-1 text-xs uppercase text-muted-foreground">Your response</div>
          {editing ? (
            <div className="space-y-2">
              <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Thank the guest…" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { onRespond(r.id, text); setEditing(false); }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white">Publish</Button>
                {r.response && <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>}
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm">{r.response}</div>
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
