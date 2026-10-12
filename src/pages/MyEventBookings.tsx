import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Calendar, MapPin, Ticket, Clock, Crown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { EventBooking, listMyBookings, getBooking, cancelBooking, payForBooking, fmtDate, hhmm, inr } from "@/services/eventService";

const STATUS_TEXT: Record<string, string> = { confirmed: "Confirmed", pending_payment: "Payment pending", cancelled: "Cancelled", failed: "Failed" };
const PAY_TEXT: Record<string, string> = { not_required: "Free", pending: "Pending", paid: "Paid", failed: "Failed", refund_pending: "Refund in progress", refunded: "Refunded" };

export default function MyEventBookings() {
  const { user } = useAuth();
  const [list, setList] = useState<EventBooking[] | null>(null);
  useEffect(() => { if (user) listMyBookings(user.id).then(setList).catch(() => setList([])); }, [user]);
  return (
    <Shell><div className="container mx-auto max-w-3xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">My event bookings</h1>
      {!list ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : list.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Ticket className="h-10 w-10 mx-auto mb-2" />No bookings yet.
          <div className="mt-3"><Button asChild><Link to="/events">Browse events</Link></Button></div></CardContent></Card>
      ) : list.map((b) => (
        <Link key={b.id} to={`/events/booking/${b.id}`}><Card className="hover:border-primary/50 mb-3"><CardContent className="p-4 flex justify-between gap-3">
          <div className="min-w-0"><p className="font-semibold truncate">{b.event?.title}</p>
            <p className="text-xs text-muted-foreground">{b.event && fmtDate(b.event.event_date)} · {b.ticket?.name} × {b.quantity}</p>
            <p className="text-xs font-mono">{b.booking_reference}</p></div>
          <Badge variant={b.status === "confirmed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"} className="h-fit">{STATUS_TEXT[b.status]}</Badge>
        </CardContent></Card></Link>
      ))}
    </div></Shell>
  );
}

export function EventBookingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [b, setB] = useState<EventBooking | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const load = () => id && getBooking(id).then(setB).catch(() => setB(null));
  useEffect(() => { load(); }, [id]);

  if (b === undefined) return <Shell><div className="py-24 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div></Shell>;
  if (!b || !b.event) return <Shell><div className="py-24 text-center">Booking not found.</div></Shell>;
  const e = b.event, paid = Number(b.total_amount) > 0;
  const started = new Date(`${e.event_date}T${e.start_time.slice(0, 5)}:00+05:30`).getTime() < Date.now();

  const act = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); await load(); } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <Shell><div className="container mx-auto max-w-xl px-4 py-8">
      <Card><CardContent className="p-6 space-y-5">
        <div className="text-center space-y-2">
          {b.status === "confirmed" ? <CheckCircle2 className="h-12 w-12 text-primary mx-auto" /> : <Ticket className="h-12 w-12 text-muted-foreground mx-auto" />}
          <h1 className="text-xl font-bold">{b.status === "confirmed" ? "Your booking is confirmed" : STATUS_TEXT[b.status]}</h1>
          {b.status === "confirmed" && <p className="text-sm text-muted-foreground">A confirmation email was sent to {b.customer_email}.</p>}
          <p className="text-xs text-muted-foreground">Booking reference</p>
          <p className="text-2xl font-mono font-bold tracking-wider">{b.booking_reference}</p>
        </div>
        <div className="rounded-lg border p-4 space-y-2 text-sm">
          <p className="font-semibold text-base">{e.title}</p>
          <p className="flex items-center gap-2"><Calendar className="h-4 w-4" />{fmtDate(e.event_date)}</p>
          <p className="flex items-center gap-2"><Clock className="h-4 w-4" />{hhmm(e.start_time)}{e.end_time ? ` – ${hhmm(e.end_time)}` : ""}</p>
          <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{e.venue}{e.address ? `, ${e.address}` : ""}{e.city ? `, ${e.city}` : ""}</p>
        </div>
        <div className="space-y-1 text-sm">
          <Row k="Ticket" v={<span className="flex items-center gap-1">{b.ticket?.kind === "vip" && <Crown className="h-3 w-3 text-amber-500" />}{b.ticket?.name}</span>} />
          <Row k="Quantity" v={b.quantity} />
          {paid && <Row k="Price per ticket" v={inr(b.unit_price)} />}
          <Row k="Total" v={paid ? inr(b.total_amount) : "Free"} />
          <Row k="Payment" v={PAY_TEXT[b.payment_status]} />
          {b.razorpay_payment_id && <Row k="Payment ID" v={<span className="font-mono text-xs">{b.razorpay_payment_id}</span>} />}
          {b.checked_in_count > 0 && <Row k="Checked in" v={`${b.checked_in_count} of ${b.quantity}`} />}
          {b.cancel_reason && <Row k="Cancellation" v={b.cancel_reason} />}
        </div>
        {b.ticket?.benefits?.length ? <div className="text-sm"><p className="font-medium">Your benefits</p><ul className="list-disc pl-5 text-muted-foreground">{b.ticket.benefits.map((x) => <li key={x}>{x}</li>)}</ul></div> : null}
        <div className="flex flex-col gap-2">
          {b.status === "pending_payment" && <Button disabled={busy} onClick={() => act(() => payForBooking(b.id, { email: user?.email || undefined, name: b.customer_name || undefined, phone: b.customer_phone || undefined }), "Payment verified — booking confirmed")}>Complete payment {inr(b.total_amount)}</Button>}
          <Button asChild variant="outline"><a href={`/events/${e.id}`} target="_blank" rel="noopener noreferrer">View event</a></Button>
          {["confirmed", "pending_payment"].includes(b.status) && !started && (
            <Button variant="ghost" className="text-destructive" disabled={busy} onClick={() => { if (confirm("Cancel this booking?")) act(() => cancelBooking(b.id), "Booking cancelled"); }}>Cancel booking</Button>
          )}
          <Button asChild variant="link"><Link to="/events/my-bookings">All my bookings</Link></Button>
        </div>
      </CardContent></Card>
    </div></Shell>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{k}</span><span className="font-medium text-right">{v}</span></div>;
}
function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex flex-col bg-background"><Navigation /><main className="flex-1">{children}</main><Footer /></div>;
}
