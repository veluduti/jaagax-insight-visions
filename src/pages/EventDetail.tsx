import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, MapPin, Minus, Plus, Loader2, Crown, Ticket, Home, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { requireSignIn } from "@/lib/requireSignIn";
import { supabase } from "@/integrations/supabase/client";
import {
  EventRow, EventBooking, TicketType, getEvent, getLinkedProperties, bookTickets, fmtDate, hhmm, inr,
  seatsLeft, ticketOnSale, eventTypeLabel, eventEnded, KIND_LABEL,
} from "@/services/eventService";

const SALE_LABEL: Record<string, string> = { not_started: "Sales not started", ended: "Sales ended", sold_out: "Sold out" };

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [props, setProps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketId, setTicketId] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<EventBooking | null>(null);

  const load = async () => {
    if (!id) return;
    const e = await getEvent(id).catch(() => null);
    setEvent(e);
    if (e) setProps(await getLinkedProperties(e.property_ids));
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    if (!user) return;
    const m = user.user_metadata || {};
    const raw = String(user.phone || m.phone || m.phone_number || m.mobile || "");
    if (raw) setPhone(raw.startsWith("+") ? raw : raw.length === 10 ? `+91${raw}` : `+${raw}`);
  }, [user]);
  useEffect(() => {
    if (!user || !id) { setMine(null); return; }
    (supabase as any).from("event_bookings").select("*").eq("event_id", id).eq("customer_id", user.id)
      .in("status", ["confirmed", "pending_payment"]).maybeSingle().then(({ data }: any) => setMine(data));
  }, [user, id]);

  if (loading) return <Shell><div className="py-24 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div></Shell>;
  if (!event) return <Shell><div className="py-24 text-center"><h2 className="text-xl font-semibold">Event not found</h2><Button asChild className="mt-4"><Link to="/events">Back to events</Link></Button></div></Shell>;

  const tickets = event.tickets || [];
  const sel = tickets.find((t) => t.id === ticketId);
  const isOrganizer = user?.id === event.organizer_id;
  const open = event.status === "approved" && !eventEnded(event);
  const maxQty = sel ? Math.min(sel.max_per_booking, seatsLeft(sel)) : 1;
  const payable = sel ? (sel.requires_payment ? Number(sel.price) : 0) * qty : 0;

  const book = () => requireSignIn(navigate, async () => {
    if (!sel) { toast.error("Choose a ticket type"); return; }
    if (phone && !/^[+\d][\d\s-]{7,14}$/.test(phone)) { toast.error("Enter a valid phone number"); return; }
    setBusy(true);
    try {
      const b = await bookTickets({ ticketId: sel.id, quantity: qty, phone: phone.replace(/\s|-/g, ""), email: user?.email, name: user?.user_metadata?.full_name });
      toast.success("Booking confirmed! Check your email for details.");
      navigate(`/events/booking/${b.id}`);
    } catch (e: any) {
      toast.error(e.message || "Booking failed");
      load();
    } finally { setBusy(false); }
  }, "Please sign in to book event tickets");

  return (
    <Shell>
      <div className="container mx-auto max-w-6xl px-4 py-6 md:py-10">
        {event.status !== "approved" && (
          <Card className="mb-4 border-amber-500/40 bg-amber-500/10"><CardContent className="py-3 text-sm">
            This event is <b>{event.status.replace("_", " ")}</b> and is not visible to customers.
            {event.rejection_reason && <> Reason: {event.rejection_reason}</>}
          </CardContent></Card>
        )}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-xl overflow-hidden aspect-video bg-gradient-to-br from-primary/20 to-accent/20">
              {event.image_urls?.[0] ? <img src={event.image_urls[0]} alt={event.title} className="w-full h-full object-cover" /> :
                <div className="h-full flex items-center justify-center"><Calendar className="h-14 w-14 text-primary/40" /></div>}
            </div>
            {event.image_urls?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">{event.image_urls.slice(1).map((u) => <img key={u} src={u} alt="" className="h-20 w-28 rounded-md object-cover" />)}</div>
            )}
            <div className="space-y-2">
              <Badge>{eventTypeLabel(event.event_type)}</Badge>
              <h1 className="text-2xl md:text-3xl font-bold">{event.title}</h1>
              {event.organizer_name && <p className="text-sm text-muted-foreground">Hosted by {event.organizer_name}</p>}
            </div>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <Info icon={Calendar} label="Date" value={fmtDate(event.event_date)} />
              <Info icon={Clock} label="Time" value={`${hhmm(event.start_time)}${event.end_time ? ` – ${hhmm(event.end_time)}` : ""}`} />
              <Info icon={MapPin} label="Venue" value={`${event.venue}${event.city ? `, ${event.city}` : ""}`} />
            </div>
            {event.address && (
              <a className="text-sm text-primary underline" target="_blank" rel="noopener noreferrer"
                href={event.latitude && event.longitude ? `https://www.google.com/maps?q=${event.latitude},${event.longitude}` : `https://www.google.com/maps/search/${encodeURIComponent(`${event.venue} ${event.address}`)}`}>
                {event.address} · Open in Maps
              </a>
            )}
            {event.description && <p className="whitespace-pre-line text-muted-foreground">{event.description}</p>}
            {props.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-semibold flex items-center gap-2"><Home className="h-4 w-4" />Featured properties</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {props.map((p) => (
                    <a key={p.id} href={`/property/${p.slug || p.id}`} target="_blank" rel="noopener noreferrer">
                      <Card className="hover:border-primary/50"><CardContent className="p-3 flex gap-3">
                        <img src={(Array.isArray(p.images) ? p.images[0] : null) || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200"} alt="" className="h-14 w-16 rounded object-cover"
                          onError={(ev) => { (ev.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200"; }} />
                        <div className="min-w-0"><p className="font-medium text-sm line-clamp-1">{p.title}</p>
                          <p className="text-xs text-muted-foreground">{[p.locality, p.city].filter(Boolean).join(", ") || "N/A"}</p>
                          {p.price ? <p className="text-xs text-primary">{inr(p.price)}</p> : null}</div>
                      </CardContent></Card>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <Card className="lg:sticky lg:top-20">
              <CardHeader><CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5" />Tickets</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {mine ? (
                  <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm space-y-2">
                    <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-primary" />
                      {mine.status === "confirmed" ? "You're registered" : "Payment pending"}</p>
                    <p>Ref <b>{mine.booking_reference}</b> · {mine.quantity} ticket(s)</p>
                    <Button asChild size="sm" className="w-full"><Link to={`/events/booking/${mine.id}`}>View booking</Link></Button>
                  </div>
                ) : null}
                {tickets.map((t) => <TicketOption key={t.id} t={t} selected={t.id === ticketId} disabled={!open || !!mine || ticketOnSale(t) !== "on_sale"}
                  onSelect={() => { setTicketId(t.id); setQty(1); }} />)}
                {open && !mine && !isOrganizer && (
                  <>
                    {sel && (
                      <div className="flex items-center justify-between">
                        <Label>Quantity</Label>
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-3 w-3" /></Button>
                          <span className="w-6 text-center font-semibold">{qty}</span>
                          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(Math.min(maxQty, qty + 1))}><Plus className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    )}
                    <div className="space-y-1"><Label htmlFor="ph">Phone</Label>
                      <Input id="ph" value={phone} maxLength={15} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98xxxxxxx" /></div>
                    <div className="flex justify-between text-sm font-semibold"><span>Total</span><span>{payable > 0 ? inr(payable) : "Free"}</span></div>
                    <Button className="w-full" disabled={busy || (!!user && !sel)} onClick={() => (user ? book() : requireSignIn(navigate, () => {}, "Please sign in to register for this event"))}>
                      {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {payable > 0 ? `Pay ${inr(payable)} & book` : "Confirm registration"}
                    </Button>
                  </>
                )}
                {isOrganizer && <Button asChild variant="outline" className="w-full"><Link to={`/events/manage/${event.id}`}>Manage this event</Link></Button>}
                {!open && event.status === "approved" && <p className="text-sm text-muted-foreground text-center">This event has ended.</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function TicketOption({ t, selected, disabled, onSelect }: { t: TicketType; selected: boolean; disabled: boolean; onSelect: () => void }) {
  const st = ticketOnSale(t);
  return (
    <button type="button" disabled={disabled} onClick={onSelect}
      className={`w-full text-left rounded-lg border p-3 transition-colors ${selected ? "border-primary bg-primary/10" : "border-border"} ${disabled ? "opacity-60 cursor-not-allowed" : "hover:border-primary/50"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium flex items-center gap-1">{t.kind === "vip" && <Crown className="h-4 w-4 text-amber-500" />}{t.name}</span>
        <span className="font-semibold">{t.requires_payment && t.price > 0 ? inr(t.price) : "Free"}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
        <Badge variant="outline" className="text-[10px]">{KIND_LABEL[t.kind]}</Badge>
        <span>{st === "on_sale" ? `${seatsLeft(t)} of ${t.quantity} seats left` : SALE_LABEL[st]}</span>
      </div>
      {t.benefits?.length > 0 && <ul className="mt-2 text-xs text-muted-foreground list-disc pl-4">{t.benefits.map((b) => <li key={b}>{b}</li>)}</ul>}
      {t.sales_end && st === "on_sale" && <p className="text-[11px] text-muted-foreground mt-1">Sales close {new Date(t.sales_end).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>}
    </button>
  );
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground flex items-center gap-1"><Icon className="h-3 w-3" />{label}</p><p className="font-medium">{value}</p></div>;
}
function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex flex-col bg-background"><Navigation /><main className="flex-1">{children}</main><Footer /></div>;
}
