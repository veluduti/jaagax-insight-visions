import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Route, Calendar, MapPin, Users, Star, Car, Home as HomeIcon, ArrowLeft } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import PlanPropertyList from "@/components/smartvisit/PlanPropertyList";
import {
  listOpenPlans, listMyBookings, createBooking, updateBooking, payForBooking, seatsTaken, agentRating, getAgentsPublic,
  priceFor, inr, statusLabel, errMsg, type SmartVisitPlan, type PickupType,
} from "@/services/smartVisitService";

export default function SmartVisits() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "mine" ? "mine" : "open";
  const [plans, setPlans] = useState<SmartVisitPlan[]>([]);
  const [meta, setMeta] = useState<Record<string, { left: number }>>({});
  const [agents, setAgents] = useState<Record<string, any>>({});
  const [ratings, setRatings] = useState<Record<string, { avg: number | null; count: number }>>({});
  const [mine, setMine] = useState<Awaited<ReturnType<typeof listMyBookings>>>([]);
  const [city, setCity] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [booking, setBooking] = useState<SmartVisitPlan | null>(null);

  const loadOpen = async () => {
    const p = await listOpenPlans().catch(() => []);
    setPlans(p);
    const left = await Promise.all(p.map(async (x) => [x.id, { left: x.max_seats - (await seatsTaken(x.id)) }] as const));
    setMeta(Object.fromEntries(left));
    const agentIds = [...new Set(p.map((x) => x.agent_id))];
    const a = await getAgentsPublic(agentIds);
    setAgents(Object.fromEntries(a.map((r: any) => [r.id, r])));
    const r = await Promise.all(agentIds.map(async (id) => [id, await agentRating(id)] as const));
    setRatings(Object.fromEntries(r));
  };
  const loadMine = () => user && listMyBookings(user.id).then(setMine).catch(() => setMine([]));
  useEffect(() => { loadOpen(); }, []);
  useEffect(() => { loadMine(); }, [user?.id]);

  const filtered = useMemo(() => plans.filter((p) => !city || (p.city || "").toLowerCase().includes(city.toLowerCase())), [plans, city]);
  const bookedPlanIds = new Set(mine.filter((b) => b.status !== "cancelled").map((b) => b.plan_id));

  const startBooking = (p: SmartVisitPlan) => {
    if (!user) { toast.error("Please sign in to book a Smart Visit"); navigate("/auth"); return; }
    setBooking(p);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-20 pb-24 max-w-5xl space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Route className="h-6 w-6 text-primary" />Smart Visits</h1>
            <p className="text-sm text-muted-foreground">Join a guided group site visit with a verified JAAGA agent — pickup, visits and drop included.</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setParams(v === "mine" ? { tab: "mine" } : {})}>
          <TabsList><TabsTrigger value="open">Upcoming visits</TabsTrigger><TabsTrigger value="mine">My bookings</TabsTrigger></TabsList>

          <TabsContent value="open" className="space-y-3 mt-4">
            <Input placeholder="Filter by city" value={city} onChange={(e) => setCity(e.target.value)} className="max-w-xs" />
            {filtered.length === 0 && <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No upcoming Smart Visits right now.</CardContent></Card>}
            {filtered.map((p) => {
              const ag = agents[p.agent_id]; const rt = ratings[p.agent_id]; const left = meta[p.id]?.left ?? p.max_seats;
              return (
                <Card key={p.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between gap-2 flex-wrap">
                      <div>
                        <h3 className="font-semibold">{p.title}</h3>
                        <p className="text-xs text-muted-foreground flex flex-wrap gap-3 mt-1">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{p.visit_date} · {p.start_time}</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.city || "N/A"}</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{left > 0 ? `${left} seats left` : "Full"}</span>
                        </p>
                        <p className="text-xs mt-1">Agent {ag?.agent_code || "JAAGA"}{rt?.count ? <> · <Star className="inline h-3 w-3 text-primary" /> {rt.avg} ({rt.count})</> : " · New"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm"><b>{inr(p.price_meeting_point)}</b> <span className="text-xs text-muted-foreground">/person meeting point</span></p>
                        <p className="text-sm"><b>{inr(p.price_home_pickup)}</b> <span className="text-xs text-muted-foreground">/person home pickup</span></p>
                      </div>
                    </div>
                    {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                        {expanded === p.id ? "Hide properties" : `View ${p.property_ids.length} properties`}
                      </Button>
                      {bookedPlanIds.has(p.id) ? <Badge>Booked</Badge> :
                        <Button size="sm" disabled={left <= 0} onClick={() => startBooking(p)}>Book visit</Button>}
                    </div>
                    {expanded === p.id && <PlanPropertyList ids={p.property_ids} />}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="mine" className="space-y-3 mt-4">
            {!user ? <p className="text-sm text-muted-foreground">Please sign in to see your bookings.</p> :
              mine.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">You haven't booked any Smart Visit yet.</CardContent></Card> :
              mine.map((b) => <MyBookingCard key={b.id} b={b} onChange={() => { loadMine(); loadOpen(); }} />)}
          </TabsContent>
        </Tabs>
      </div>
      {booking && <BookDialog plan={booking} left={meta[booking.id]?.left ?? booking.max_seats} onClose={() => setBooking(null)}
        onDone={() => { setBooking(null); loadMine(); loadOpen(); setParams({ tab: "mine" }); }} />}
    </div>
  );
}

function BookDialog({ plan, left, onClose, onDone }: { plan: SmartVisitPlan; left: number; onClose: () => void; onDone: () => void }) {
  const { user } = useAuth();
  const [pickup, setPickup] = useState<PickupType>("meeting_point");
  const [seats, setSeats] = useState(1);
  const [name, setName] = useState((user?.user_metadata as any)?.full_name || "");
  const [phone, setPhone] = useState((user as any)?.phone || "");
  const [address, setAddress] = useState("");
  const [drop, setDrop] = useState("");
  const [saving, setSaving] = useState(false);
  const per = priceFor(plan, pickup);

  const submit = async () => {
    if (!user) return;
    if (!name.trim()) return toast.error("Please enter your name");
    if (!/^\+?\d[\d\s-]{8,}$/.test(phone.trim())) return toast.error("Please enter a valid phone number");
    if (pickup === "home" && !address.trim()) return toast.error("Please enter your pickup address");
    if (seats < 1 || seats > left) return toast.error(`Choose 1 to ${left} seats`);
    setSaving(true);
    let id: string | null = null;
    try {
      id = await createBooking({ plan_id: plan.id, customer_id: user.id, customer_name: name.trim(), contact_phone: phone.trim(),
        seats, pickup_type: pickup, pickup_address: pickup === "home" ? address.trim() : undefined, drop_address: drop.trim() || undefined });
      await payForBooking(id, { name: name.trim(), email: user.email ?? undefined, contact: phone.trim() }, plan.title);
      toast.success("Paid and booked! The agent will send your pickup time and trip details.");
      onDone();
    } catch (e: any) {
      if (id) {
        toast.message(e?.message === "Payment cancelled" ? "Payment not finished" : errMsg(e),
          { description: "Your seat is saved. Tap “Pay now” in My bookings to finish payment." });
        onDone();
      } else toast.error(errMsg(e));
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Book: {plan.title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {([["meeting_point", Car, "Meeting point", plan.meeting_point], ["home", HomeIcon, "Pick me from home", "Agent comes to you"]] as const).map(([v, Icon, label, sub]) => (
              <button key={v} type="button" onClick={() => setPickup(v)}
                className={`rounded-lg border p-3 text-left transition-colors ${pickup === v ? "border-primary bg-primary/10" : "border-border"}`}>
                <Icon className="h-4 w-4 text-primary mb-1" />
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{sub}</p>
                <p className="text-sm font-semibold mt-1">{inr(priceFor(plan, v))}/person</p>
              </button>
            ))}
          </div>
          {pickup === "home" && <div><Label>Pickup address</Label><Textarea value={address} onChange={(e) => setAddress(e.target.value)} /></div>}
          <div><Label>Drop location (optional)</Label><Input value={drop} onChange={(e) => setDrop(e.target.value)} placeholder="Same as pickup if empty" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Your name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          </div>
          <div><Label>People ({left} seats left)</Label><Input type="number" min={1} max={left} value={seats} onChange={(e) => setSeats(Number(e.target.value))} /></div>
          <div className="rounded-lg bg-muted p-3 text-sm flex justify-between"><span>{inr(per)} × {seats}</span><b>{inr(per * seats)}</b></div>
          <p className="text-xs text-muted-foreground">Pay securely online with UPI, card or net banking.</p>
        </div>
        <DialogFooter><Button onClick={submit} disabled={saving} className="w-full">{saving ? "Processing…" : `Pay ${inr(per * seats)} & book`}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MyBookingCard({ b, onChange }: { b: any; onChange: () => void }) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [note, setNote] = useState("");
  const [showProps, setShowProps] = useState(false);
  const [paying, setPaying] = useState(false);
  const p: SmartVisitPlan = b.plan;
  const act = async (patch: any, msg: string) => {
    try { await updateBooking(b.id, patch); toast.success(msg); onChange(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex justify-between gap-2 flex-wrap">
          <div>
            <h3 className="font-semibold">{p?.title || "Smart Visit"}</h3>
            <p className="text-xs text-muted-foreground">{p?.visit_date} · {p?.start_time} · {b.seats} seat(s) · {b.pickup_type === "home" ? `Home pickup: ${b.pickup_address}` : `Meeting point: ${p?.meeting_point}`}</p>
            <p className="text-sm">Total: <b>{inr(b.total_amount)}</b> <span className="text-xs text-muted-foreground">({inr(b.price_per_person)}/person)</span></p>
          </div>
          <div className="flex gap-1 flex-wrap items-start">
            <Badge>{statusLabel[b.status] || b.status}</Badge>
            <Badge variant={b.payment_status === "paid" ? "default" : "outline"}>{b.payment_status === "paid" ? "Paid" : "Not paid"}</Badge>
          </div>
        </div>
        {(b.pickup_time || b.agent_message) && (
          <div className="rounded-lg bg-primary/10 p-3 text-sm">
            <p className="font-medium">From your agent</p>
            {b.pickup_time && <p>Pickup time: {b.pickup_time}</p>}
            {b.agent_message && <p>{b.agent_message}</p>}
          </div>
        )}
        {b.status === "booked" && <p className="text-xs text-muted-foreground">Waiting for the agent to send pickup time and trip details.</p>}
        <div className="flex gap-2 flex-wrap">
          {b.payment_status !== "paid" && ["booked", "confirmed"].includes(b.status) && (
            <Button size="sm" disabled={paying} onClick={async () => {
              setPaying(true);
              try { await payForBooking(b.id, { name: b.customer_name ?? undefined, contact: b.contact_phone ?? undefined }, p?.title || "Smart Visit"); toast.success("Payment received"); onChange(); }
              catch (e: any) { if (e?.message !== "Payment cancelled") toast.error(errMsg(e)); }
              finally { setPaying(false); }
            }}>{paying ? "Processing…" : `Pay now ${inr(b.total_amount)}`}</Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowProps(!showProps)}>{showProps ? "Hide" : "View"} properties</Button>
          {["booked", "confirmed"].includes(b.status) && (
            <Button size="sm" variant="ghost" onClick={() => confirm(b.payment_status === "paid" ? "Cancel this booking? For a refund, use Get help or contact the agent." : "Cancel this booking?") && act({ status: "cancelled" }, "Booking cancelled")}>Cancel booking</Button>
          )}
        </div>
        {showProps && p && <PlanPropertyList ids={p.property_ids} />}
        {b.status === "completed" && (
          <div className="border-t border-border pt-3 space-y-3">
            {b.rating ? <p className="text-sm flex items-center gap-1"><Star className="h-4 w-4 text-primary" />You rated {b.rating}/5</p> : (
              <div className="space-y-2">
                <p className="text-sm font-medium">Rate your agent</p>
                <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
                    <Star className={`h-6 w-6 ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  </button>))}</div>
                <Textarea placeholder="How was the visit? (optional)" value={review} onChange={(e) => setReview(e.target.value)} />
                <Button size="sm" disabled={!rating} onClick={() => act({ rating, review: review.trim() || null }, "Thanks for your rating!")}>Submit rating</Button>
              </div>
            )}
            {b.interested_to_buy ? <p className="text-sm text-primary">You told the agent you're interested. They will contact you.</p> : (
              <div className="space-y-2">
                <p className="text-sm font-medium">Liked a property? Connect with the agent to buy</p>
                <Input placeholder="Which property / your questions (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                <Button size="sm" variant="outline" onClick={() => act({ interested_to_buy: true, interest_note: note.trim() || null }, "Agent notified — they'll contact you")}>I'm interested – connect me</Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
