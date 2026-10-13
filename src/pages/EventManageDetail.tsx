import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, Pencil, Send, XCircle, Trash2, ExternalLink, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { STATUS_VARIANT } from "./EventsManage";
import {
  EventRow, EventBooking, getEvent, listEventBookings, checkIn, cancelEvent, notifyAttendees, deleteEvent, rescheduleEvent, saveEvent,
  fmtDate, hhmm, inr, seatsLeft,
} from "@/services/eventService";

export default function EventManageDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [e, setE] = useState<EventRow | null>(null);
  const [bookings, setBookings] = useState<EventBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [rs, setRs] = useState({ date: "", start: "", end: "", reason: "" });

  const load = async () => {
    if (!id) return;
    const [ev, bk] = await Promise.all([getEvent(id), listEventBookings(id).catch(() => [])]);
    setE(ev); setBookings(bk); setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const stats = useMemo(() => {
    const conf = bookings.filter((b) => b.status === "confirmed");
    return {
      tickets: conf.reduce((s, b) => s + b.quantity, 0),
      revenue: conf.reduce((s, b) => s + Number(b.total_amount), 0),
      attended: conf.reduce((s, b) => s + b.checked_in_count, 0),
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
      refunds: bookings.filter((b) => b.payment_status === "refund_pending").length,
      pending: bookings.filter((b) => b.status === "pending_payment").length,
    };
  }, [bookings]);

  const shown = bookings.filter((b) => {
    const t = q.trim().toLowerCase();
    return !t || [b.customer_name, b.customer_email, b.customer_phone, b.booking_reference].some((x) => x?.toLowerCase().includes(t));
  });

  if (loading) return <Shell><div className="py-24 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div></Shell>;
  if (!e || (e.organizer_id !== user?.id)) return <Shell><div className="py-24 text-center">Event not found or you are not its organizer.</div></Shell>;

  const editable = ["draft", "pending_approval", "rejected"].includes(e.status);
  const active = !["cancelled", "completed"].includes(e.status);

  const doCheckIn = async (b: EventBooking, n: number) => {
    try { await checkIn(b.id, n); setBookings((bs) => bs.map((x) => (x.id === b.id ? { ...x, checked_in_count: n, checked_in_at: n ? new Date().toISOString() : null } : x))); }
    catch (err: any) { toast.error(err.message); }
  };
  const exportCsv = () => {
    const head = ["Reference", "Name", "Email", "Phone", "Ticket", "Qty", "Amount", "Status", "Payment", "Checked in", "Booked at"];
    const rows = bookings.map((b) => [b.booking_reference, b.customer_name, b.customer_email, b.customer_phone, b.ticket?.name, b.quantity, b.total_amount, b.status, b.payment_status, b.checked_in_count, b.created_at]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `${e.title}-attendees.csv`; a.click();
  };
  const run = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); await load(); } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <Shell>
      <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div>
            <Link to="/events/manage" className="text-xs text-muted-foreground">← All my events</Link>
            <div className="flex items-center gap-2 mt-1"><h1 className="text-2xl font-bold">{e.title}</h1><Badge variant={STATUS_VARIANT[e.status]}>{e.status.replace("_", " ")}</Badge></div>
            <p className="text-sm text-muted-foreground">{fmtDate(e.event_date)} · {hhmm(e.start_time)}{e.end_time ? ` – ${hhmm(e.end_time)}` : ""} · {e.venue}</p>
            {e.status === "rejected" && <p className="text-sm text-destructive mt-1">Rejected: {e.rejection_reason}</p>}
            {e.status === "pending_approval" && <p className="text-sm text-muted-foreground mt-1">Waiting for Global Admin approval.</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><a href={`/events/${e.id}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-1" />View</a></Button>
            {editable && <Button asChild variant="outline" size="sm"><Link to={`/events/edit/${e.id}`}><Pencil className="h-4 w-4 mr-1" />Edit</Link></Button>}
            {e.status === "draft" && <Button size="sm" disabled={busy} onClick={() => run(async () => {
              await saveEvent(user!.id, {
                organizer_name: e.organizer_name || "", title: e.title, description: e.description || "", event_type: e.event_type,
                event_date: e.event_date, start_time: e.start_time, end_time: e.end_time, venue: e.venue, address: e.address || "",
                city: e.city || "", latitude: e.latitude, longitude: e.longitude, image_urls: e.image_urls, property_ids: e.property_ids,
              }, (e.tickets || []).map(({ event_id, sold, ...t }) => t), true, e.id);
            }, "Submitted for approval")}>Submit for approval</Button>}
            <Button variant="ghost" size="sm" className="text-destructive" disabled={busy} onClick={() => {
              const n = bookings.filter((b) => b.status === "confirmed").length;
              if (!confirm(n ? `Delete this event? ${n} booking(s) will be cancelled and attendees emailed.` : "Delete this event?")) return;
              run(async () => { await deleteEvent(e.id); navigate("/events/manage"); }, "Event deleted");
            }}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Stat label="Tickets sold" v={stats.tickets} /><Stat label="Revenue" v={inr(stats.revenue)} /><Stat label="Checked in" v={stats.attended} />
          <Stat label="Seats left" v={(e.tickets || []).reduce((s, t) => s + seatsLeft(t), 0)} /><Stat label="Cancellations" v={stats.cancelled} /><Stat label="Refunds due" v={stats.refunds} />
        </div>

        <Tabs defaultValue="attendees">
          <TabsList><TabsTrigger value="attendees">Attendees</TabsTrigger><TabsTrigger value="tickets">Ticket sales</TabsTrigger><TabsTrigger value="followup">Updates & follow-up</TabsTrigger></TabsList>

          <TabsContent value="attendees" className="space-y-3">
            <div className="flex gap-2"><Input placeholder="Search name, email, phone or reference" value={q} onChange={(ev) => setQ(ev.target.value)} />
              <Button variant="outline" onClick={exportCsv} disabled={!bookings.length}><Download className="h-4 w-4 mr-1" />CSV</Button></div>
            <Card><div className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>Attendee</TableHead><TableHead>Ticket</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Check-in</TableHead></TableRow></TableHeader>
              <TableBody>
                {shown.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No registrations yet</TableCell></TableRow>}
                {shown.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell><p className="font-medium">{b.customer_name || "N/A"}</p><p className="text-xs text-muted-foreground">{b.customer_email}{b.customer_phone ? ` · ${b.customer_phone}` : ""}</p><p className="text-xs font-mono">{b.booking_reference}</p></TableCell>
                    <TableCell>{b.ticket?.name} × {b.quantity}</TableCell>
                    <TableCell>{Number(b.total_amount) > 0 ? inr(b.total_amount) : "Free"}</TableCell>
                    <TableCell><Badge variant={b.status === "confirmed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"}>{b.status.replace("_", " ")}</Badge>
                      {b.payment_status === "refund_pending" && <p className="text-[11px] text-amber-500">Refund due</p>}</TableCell>
                    <TableCell>{b.status === "confirmed" ? (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={b.checked_in_count <= 0} onClick={() => doCheckIn(b, b.checked_in_count - 1)}>−</Button>
                        <span className="w-10 text-center text-sm">{b.checked_in_count}/{b.quantity}</span>
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={b.checked_in_count >= b.quantity} onClick={() => doCheckIn(b, b.checked_in_count + 1)}>+</Button>
                        {b.checked_in_count < b.quantity && <Button size="sm" className="h-7 ml-1" onClick={() => doCheckIn(b, b.quantity)}>All</Button>}
                      </div>) : "—"}</TableCell>
                  </TableRow>))}
              </TableBody></Table></div></Card>
          </TabsContent>

          <TabsContent value="tickets"><Card><CardContent className="p-0"><Table>
            <TableHeader><TableRow><TableHead>Ticket</TableHead><TableHead>Price</TableHead><TableHead>Sold</TableHead><TableHead>Left</TableHead><TableHead>Revenue</TableHead></TableRow></TableHeader>
            <TableBody>{(e.tickets || []).map((t) => {
              const rev = bookings.filter((b) => b.ticket_type_id === t.id && b.status === "confirmed").reduce((s, b) => s + Number(b.total_amount), 0);
              return <TableRow key={t.id}><TableCell>{t.name} <Badge variant="outline" className="ml-1 text-[10px]">{t.kind.toUpperCase()}</Badge></TableCell>
                <TableCell>{t.requires_payment && t.price > 0 ? inr(t.price) : "Free"}</TableCell><TableCell>{t.sold}/{t.quantity}</TableCell><TableCell>{seatsLeft(t)}</TableCell><TableCell>{inr(rev)}</TableCell></TableRow>;
            })}</TableBody></Table>
            {stats.pending > 0 && <p className="text-xs text-muted-foreground p-3">{stats.pending} booking(s) are holding seats while payment is in progress (released after 15 minutes).</p>}
          </CardContent></Card></TabsContent>

          <TabsContent value="followup" className="space-y-4">
            <Card><CardHeader><CardTitle className="text-base">Message attendees</CardTitle></CardHeader><CardContent className="space-y-3">
              <Textarea rows={3} maxLength={500} value={msg} onChange={(ev) => setMsg(ev.target.value)} placeholder="Parking is at Gate 2. Brochures and site tour at 11 AM." />
              <div className="flex flex-wrap gap-2">
                <Button disabled={busy || e.status !== "approved" && e.status !== "completed"} onClick={() => run(async () => { const r = await notifyAttendees(e.id, msg, "all"); setMsg(""); toast.message(`Sent to ${r.sent} booking(s)`); }, "Update sent")}><Send className="h-4 w-4 mr-1" />Send to all registered</Button>
                <Button variant="outline" disabled={busy || stats.attended === 0} onClick={() => run(async () => { const r = await notifyAttendees(e.id, msg, "attended"); setMsg(""); toast.message(`Sent to ${r.sent} attendee(s)`); }, "Follow-up sent")}>Follow up attended buyers</Button>
              </div>
            </CardContent></Card>
            {active && e.status !== "rejected" && (
              <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarClock className="h-4 w-4" />Reschedule event</CardTitle></CardHeader><CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Bookings stay valid. Every registered attendee gets an email and a notification with the new date and time.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input type="date" value={rs.date} onChange={(ev) => setRs({ ...rs, date: ev.target.value })} aria-label="New date" />
                  <Input type="time" value={rs.start} onChange={(ev) => setRs({ ...rs, start: ev.target.value })} aria-label="New start time" />
                  <Input type="time" value={rs.end} onChange={(ev) => setRs({ ...rs, end: ev.target.value })} aria-label="New end time (optional)" />
                </div>
                <Input value={rs.reason} maxLength={500} onChange={(ev) => setRs({ ...rs, reason: ev.target.value })} placeholder="Reason (optional, shared with attendees)" />
                <Button disabled={busy || !rs.date || !rs.start} onClick={() => run(async () => {
                  const r = await rescheduleEvent(e.id, { event_date: rs.date, start_time: rs.start, end_time: rs.end || null, reason: rs.reason });
                  setRs({ date: "", start: "", end: "", reason: "" }); toast.message(`${r.notified} attendee booking(s) notified`);
                }, "Event rescheduled")}><CalendarClock className="h-4 w-4 mr-1" />Reschedule</Button>
              </CardContent></Card>
            )}
            {active && e.status !== "draft" && (
              <Card className="border-destructive/40"><CardHeader><CardTitle className="text-base">Cancel event</CardTitle></CardHeader><CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">All registrations will be cancelled and attendees notified. Paid tickets are marked for refund.</p>
                <Input value={cancelReason} maxLength={500} onChange={(ev) => setCancelReason(ev.target.value)} placeholder="Reason for cancellation" />
                <Button variant="destructive" disabled={busy || cancelReason.trim().length < 5} onClick={() => { if (confirm("Cancel this event for everyone?")) run(() => cancelEvent(e.id, cancelReason), "Event cancelled"); }}><XCircle className="h-4 w-4 mr-1" />Cancel event</Button>
              </CardContent></Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}

function Stat({ label, v }: { label: string; v: React.ReactNode }) {
  return <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-semibold">{v}</p></CardContent></Card>;
}
function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex flex-col bg-background"><Navigation /><main className="flex-1">{children}</main><Footer /></div>;
}
