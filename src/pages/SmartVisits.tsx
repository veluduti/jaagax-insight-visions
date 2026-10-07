import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Route, Calendar, Clock, MapPin, Users, Star, Car, Home as HomeIcon, ArrowLeft, Building2, ChevronDown, ArrowRight } from "lucide-react";
import { visitDateLabel, visitTimeLabel } from "@/lib/smartVisitDate";
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
  useEffect(() => {
    const selected = params.get("plan");
    if (!selected || !plans.some((p) => p.id === selected)) return;
    setExpanded(selected);
    requestAnimationFrame(() => document.getElementById(`visit-${selected}`)?.scrollIntoView({ block: "center" }));
  }, [params, plans]);

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
          <Button variant="outline" size="icon" aria-label="Go back" className="shrink-0 rounded-full" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}><ArrowLeft className="h-5 w-5" /></Button>
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
                <Card key={p.id} id={`visit-${p.id}`} className={`overflow-hidden rounded-lg shadow-sm transition-shadow hover:shadow-md scroll-mt-28 ${params.get("plan") === p.id ? "border-primary" : "border-border"}`}>
                  <CardContent className="p-0">
                    <div className="p-5 sm:p-6 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-12 w-12 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Route className="h-6 w-6" /></div>
                          <div className="min-w-0">
                            <h3 className="text-lg font-semibold break-words">{p.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1">Agent {ag?.agent_code || "JAAGA"}{rt?.count ? <> · <Star className="inline h-3 w-3 text-primary" /> {rt.avg} ({rt.count})</> : " · New"}</p>
                          </div>
                        </div>
                        <Badge variant={left > 0 ? "secondary" : "outline"} className="shrink-0 gap-1.5"><Users className="h-3.5 w-3.5" />{left > 0 ? `${left} seats left` : "Full"}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />{visitDateLabel(p.visit_date)}</span>
                        <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />{visitTimeLabel(p.start_time)}</span>
                        <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{p.city || "Location to be confirmed"}</span>
                      </div>
                      {p.description && <p className="text-sm text-muted-foreground break-words">{p.description}</p>}
                      {p.meeting_point && <p className="text-sm"><span className="text-muted-foreground">Meeting point · </span>{p.meeting_point}</p>}
                      <Button variant="outline" onClick={() => setExpanded(expanded === p.id ? null : p.id)} className="gap-2">
                        <Building2 className="h-4 w-4" />{expanded === p.id ? "Hide properties" : `View ${p.property_ids?.length ?? 0} properties`}<ChevronDown className={`h-4 w-4 transition-transform ${expanded === p.id ? "rotate-180" : ""}`} />
                      </Button>
                      {expanded === p.id && <PlanPropertyList ids={p.property_ids ?? []} />}
                    </div>
                    <div className="border-t border-border bg-muted/30 px-5 py-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap gap-x-8 gap-y-3">
                        <div><p className="text-xs text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Meeting point</p><p className="mt-1"><span className="text-lg font-semibold">{inr(p.price_meeting_point)}</span><span className="text-xs text-muted-foreground"> / person</span></p></div>
                        <div><p className="text-xs text-muted-foreground flex items-center gap-1.5"><Car className="h-3.5 w-3.5" />Home pickup</p><p className="mt-1"><span className="text-lg font-semibold">{inr(p.price_home_pickup)}</span><span className="text-xs text-muted-foreground"> / person</span></p></div>
                      </div>
                      {bookedPlanIds.has(p.id) ? <Badge>Booked</Badge> : <Button disabled={left <= 0} onClick={() => startBooking(p)} className="gap-2 w-full sm:w-auto">Book visit<ArrowRight className="h-4 w-4" /></Button>}
                    </div>
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
            <p className="text-xs text-muted-foreground">{visitDateLabel(p?.visit_date)} · {visitTimeLabel(p?.start_time)} · {b.seats} seat(s) · {b.pickup_type === "home" ? `Home pickup: ${b.pickup_address}` : `Meeting point: ${p?.meeting_point || "To be confirmed"}`}</p>
            <p className="text-sm">Total: <b>{inr(b.total_amount)}</b> <span className="text-xs text-muted-foreground">({inr(b.price_per_person)}/person)</span></p>
          </div>
          <div className="flex gap-1 flex-wrap items-start">
            <Badge>{statusLabel[b.status] || b.status}</Badge>
            <Badge variant={b.payment_status === "paid" ? "default" : "outline"}>{b.payment_status === "paid" ? "Paid" : "Not paid"}</Badge>
            {["cancelled", "completed", "no_show"].includes(b.status) && (
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" aria-label="Delete booking"
                onClick={() => confirm("Remove this booking from your list?") && act({ customer_hidden: true } as any, "Booking removed")}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {(b.pickup_time || b.agent_message) && (
          <div className="rounded-lg bg-primary/10 p-3 text-sm">
            <p className="font-medium">From your agent</p>
            {b.pickup_time && <p>Pickup time: {b.pickup_time}</p>}
            {b.agent_message && <p>{b.agent_message}</p>}
          </div>
        )}
        {b.status === "cancelled" && (p?.status === "cancelled"
          ? <p className="text-xs text-destructive">The agent cancelled this visit.{b.payment_status === "paid" ? " Your payment will be reviewed for a refund by JAAGA." : ""}</p>
          : <p className="text-xs text-muted-foreground">This booking was cancelled.{b.payment_status === "paid" ? " JAAGA has been notified to review your refund." : ""}</p>)}
        {b.status === "no_show" && <p className="text-xs text-muted-foreground">This visit finished without your pickup being recorded.</p>}
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
