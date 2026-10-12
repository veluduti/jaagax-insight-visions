import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Upload, X, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  EVENT_TYPES, TicketInput, TicketKind, canOrganize, getEvent, getLinkedProperties, saveEvent, searchProperties, uploadEventImage,
} from "@/services/eventService";

const blankTicket = (kind: TicketKind): TicketInput => ({
  kind, name: kind === "free" ? "Free entry" : kind === "paid" ? "General" : "VIP Pass",
  price: kind === "free" ? 0 : kind === "paid" ? 499 : 1999, quantity: 50, sales_start: null, sales_end: null,
  benefits: [], requires_payment: kind !== "free", max_per_booking: kind === "vip" ? 4 : 10,
});
const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

export default function EventCreate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [f, setF] = useState({
    organizer_name: "", title: "", description: "", event_type: "property_launch", event_date: "", start_time: "10:00",
    end_time: "13:00", venue: "", address: "", city: "", latitude: null as number | null, longitude: null as number | null,
    image_urls: [] as string[], property_ids: [] as string[],
  });
  const [tickets, setTickets] = useState<TicketInput[]>([blankTicket("free")]);
  const [props, setProps] = useState<any[]>([]);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [benefitDraft, setBenefitDraft] = useState<Record<number, string>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`); return; }
    canOrganize(user.id).then(setAllowed);
    if (!f.organizer_name) setF((s) => ({ ...s, organizer_name: user.user_metadata?.full_name || "" }));
  }, [user, authLoading]);

  useEffect(() => {
    if (!id) return;
    getEvent(id).then(async (e) => {
      if (!e) return;
      if (["approved", "cancelled", "completed"].includes(e.status)) setLocked(true);
      setF({
        organizer_name: e.organizer_name || "", title: e.title, description: e.description || "", event_type: e.event_type,
        event_date: e.event_date, start_time: e.start_time.slice(0, 5), end_time: e.end_time?.slice(0, 5) || "",
        venue: e.venue, address: e.address || "", city: e.city || "", latitude: e.latitude, longitude: e.longitude,
        image_urls: e.image_urls || [], property_ids: e.property_ids || [],
      });
      setTickets((e.tickets || []).map((t) => ({
        id: t.id, kind: t.kind, name: t.name, price: Number(t.price), quantity: t.quantity, sales_start: t.sales_start,
        sales_end: t.sales_end, benefits: t.benefits || [], requires_payment: t.requires_payment, max_per_booking: t.max_per_booking,
      })));
      setProps(await getLinkedProperties(e.property_ids));
    });
  }, [id]);

  useEffect(() => {
    if (term.trim().length < 2) { setResults([]); return; }
    const h = setTimeout(() => searchProperties(term.trim()).then(setResults), 300);
    return () => clearTimeout(h);
  }, [term]);

  const set = (k: keyof typeof f, v: any) => setF((s) => ({ ...s, [k]: v }));
  const setT = (i: number, patch: Partial<TicketInput>) => setTickets((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  const onFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, 6 - f.image_urls.length)) {
        if (!file.type.startsWith("image/")) { toast.error(`${file.name} is not an image`); continue; }
        if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} is larger than 5 MB`); continue; }
        urls.push(await uploadEventImage(user.id, file));
      }
      set("image_urls", [...f.image_urls, ...urls]);
    } catch (e: any) { toast.error(e.message || "Upload failed"); } finally { setUploading(false); }
  };

  const validate = (): string | null => {
    if (f.title.trim().length < 3) return "Enter an event title (at least 3 characters)";
    if (!f.event_date) return "Choose the event date";
    if (f.event_date < new Date().toISOString().slice(0, 10)) return "Event date must be today or later";
    if (!f.start_time) return "Choose a start time";
    if (f.end_time && f.end_time <= f.start_time) return "End time must be after start time";
    if (f.venue.trim().length < 2) return "Enter the venue";
    if (!tickets.length) return "Add at least one ticket type";
    for (const t of tickets) {
      if (!t.name.trim()) return "Every ticket type needs a name";
      if (!(t.quantity >= 1)) return `"${t.name}" needs at least 1 seat`;
      if (t.kind === "paid" && !(t.price >= 1)) return `"${t.name}" is a paid ticket — set a price`;
      if (t.kind === "vip" && t.requires_payment && !(t.price >= 1)) return `"${t.name}" requires payment — set a price`;
      if (t.sales_start && t.sales_end && t.sales_end <= t.sales_start) return `"${t.name}": sales end must be after sales start`;
    }
    return null;
  };

  const save = async (submit: boolean) => {
    if (!user) return;
    const err = validate();
    if (err) { toast.error(err); return; }
    setBusy(true);
    try {
      const clean = tickets.map((t) => ({ ...t, name: t.name.trim(), price: t.kind === "free" || (t.kind === "vip" && !t.requires_payment) ? 0 : Number(t.price) }));
      const eid = await saveEvent(user.id, {
        ...f, title: f.title.trim(), description: f.description.trim(), venue: f.venue.trim(), address: f.address.trim(),
        city: f.city.trim(), end_time: f.end_time || null,
      }, clean, submit, id);
      toast.success(submit ? "Submitted for Global Admin approval" : "Draft saved");
      navigate(`/events/manage/${eid}`);
    } catch (e: any) { toast.error(e.message || "Could not save event"); } finally { setBusy(false); }
  };

  if (allowed === null) return <Shell><div className="py-24 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div></Shell>;
  if (!allowed) return <Shell><div className="py-24 text-center max-w-md mx-auto space-y-3 px-4">
    <h2 className="text-xl font-semibold">Only agents and builders can host events</h2>
    <p className="text-muted-foreground text-sm">Register as an agent or create a builder profile to publish events on JAAGA X.</p>
    <Button asChild><Link to="/events">Browse events</Link></Button></div></Shell>;
  if (locked) return <Shell><div className="py-24 text-center space-y-3"><h2 className="text-xl font-semibold">This event can no longer be edited</h2>
    <p className="text-sm text-muted-foreground">Approved events are locked. Use the organizer dashboard to send updates or cancel.</p>
    <Button asChild><Link to={`/events/manage/${id}`}>Open dashboard</Link></Button></div></Shell>;

  return (
    <Shell>
      <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div><h1 className="text-2xl md:text-3xl font-bold">{id ? "Edit event" : "Create an event"}</h1>
          <p className="text-muted-foreground text-sm">Events go live after Global Admin approval.</p></div>

        <Card><CardHeader><CardTitle>Event details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Title *"><Input value={f.title} maxLength={150} onChange={(e) => set("title", e.target.value)} placeholder="Sunrise Towers launch weekend" /></Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Event type *">
                <Select value={f.event_type} onValueChange={(v) => set("event_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Organizer name"><Input value={f.organizer_name} maxLength={120} onChange={(e) => set("organizer_name", e.target.value)} /></Field>
            </div>
            <Field label="Description"><Textarea rows={5} maxLength={5000} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Date *"><Input type="date" value={f.event_date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => set("event_date", e.target.value)} /></Field>
              <Field label="Start time *"><Input type="time" value={f.start_time} onChange={(e) => set("start_time", e.target.value)} /></Field>
              <Field label="End time"><Input type="time" value={f.end_time} onChange={(e) => set("end_time", e.target.value)} /></Field>
            </div>
          </CardContent></Card>

        <Card><CardHeader><CardTitle>Venue & location</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Venue *"><Input value={f.venue} maxLength={200} onChange={(e) => set("venue", e.target.value)} placeholder="Project site office" /></Field>
            <Field label="Address"><Input value={f.address} maxLength={300} onChange={(e) => set("address", e.target.value)} /></Field>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="City"><Input value={f.city} maxLength={80} onChange={(e) => set("city", e.target.value)} /></Field>
              <Field label="Latitude"><Input type="number" step="any" value={f.latitude ?? ""} onChange={(e) => set("latitude", e.target.value ? Number(e.target.value) : null)} /></Field>
              <Field label="Longitude"><Input type="number" step="any" value={f.longitude ?? ""} onChange={(e) => set("longitude", e.target.value ? Number(e.target.value) : null)} /></Field>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => navigator.geolocation?.getCurrentPosition(
              (p) => { set("latitude", +p.coords.latitude.toFixed(6)); set("longitude", +p.coords.longitude.toFixed(6)); },
              () => toast.error("Could not get your location"))}>Use my current location</Button>
          </CardContent></Card>

        <Card><CardHeader><CardTitle>Images</CardTitle><CardDescription>Up to 6 images, 5 MB each. The first is the cover.</CardDescription></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {f.image_urls.map((u) => (
                <div key={u} className="relative"><img src={u} alt="" className="h-20 w-28 rounded object-cover" />
                  <button type="button" className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5" onClick={() => set("image_urls", f.image_urls.filter((x) => x !== u))}><X className="h-3 w-3" /></button></div>
              ))}
              {f.image_urls.length < 6 && (
                <label className="h-20 w-28 rounded border border-dashed flex items-center justify-center cursor-pointer text-muted-foreground">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                  <input type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
                </label>
              )}
            </div>
          </CardContent></Card>

        <Card><CardHeader><CardTitle>Associated properties</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">{props.map((p) => (
              <Badge key={p.id} variant="secondary" className="gap-1">{p.title}
                <button type="button" onClick={() => { setProps(props.filter((x) => x.id !== p.id)); set("property_ids", f.property_ids.filter((x) => x !== p.id)); }}><X className="h-3 w-3" /></button></Badge>
            ))}</div>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search property by title" /></div>
            {results.length > 0 && <div className="border rounded-md divide-y max-h-56 overflow-auto">{results.filter((r) => !f.property_ids.includes(r.id)).map((r) => (
              <button key={r.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                onClick={() => { if (f.property_ids.length >= 10) return toast.error("Up to 10 properties"); setProps([...props, r]); set("property_ids", [...f.property_ids, r.id]); setTerm(""); }}>
                {r.title} <span className="text-muted-foreground">· {[r.locality, r.city].filter(Boolean).join(", ")}</span></button>
            ))}</div>}
          </CardContent></Card>

        <Card><CardHeader><CardTitle>Tickets</CardTitle><CardDescription>Combine Free, Paid and VIP tickets. Each has its own price, seats and sale window.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {tickets.map((t, i) => (
              <div key={t.id || i} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge>{t.kind.toUpperCase()}</Badge>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setTickets(tickets.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Field label="Name"><Input value={t.name} maxLength={60} onChange={(e) => setT(i, { name: e.target.value })} /></Field>
                  <Field label="Price (₹)"><Input type="number" min={0} disabled={t.kind === "free" || (t.kind === "vip" && !t.requires_payment)} value={t.kind === "free" ? 0 : t.price} onChange={(e) => setT(i, { price: Number(e.target.value) })} /></Field>
                  <Field label="Seats"><Input type="number" min={1} value={t.quantity} onChange={(e) => setT(i, { quantity: Number(e.target.value) })} /></Field>
                  <Field label="Sales open"><Input type="datetime-local" value={toLocal(t.sales_start)} onChange={(e) => setT(i, { sales_start: fromLocal(e.target.value) })} /></Field>
                  <Field label="Sales close"><Input type="datetime-local" value={toLocal(t.sales_end)} onChange={(e) => setT(i, { sales_end: fromLocal(e.target.value) })} /></Field>
                  <Field label="Max per booking"><Input type="number" min={1} max={50} value={t.max_per_booking} onChange={(e) => setT(i, { max_per_booking: Math.min(50, Math.max(1, Number(e.target.value))) })} /></Field>
                </div>
                {t.kind === "vip" && (
                  <div className="flex items-center gap-2"><Switch checked={t.requires_payment} onCheckedChange={(v) => setT(i, { requires_payment: v, price: v ? t.price || 999 : 0 })} />
                    <Label>VIP requires payment</Label></div>
                )}
                {t.kind !== "free" && (
                  <div className="space-y-2"><Label>Benefits</Label>
                    <div className="flex flex-wrap gap-2">{t.benefits.map((b) => <Badge key={b} variant="secondary" className="gap-1">{b}
                      <button type="button" onClick={() => setT(i, { benefits: t.benefits.filter((x) => x !== b) })}><X className="h-3 w-3" /></button></Badge>)}</div>
                    <div className="flex gap-2"><Input value={benefitDraft[i] || ""} maxLength={80} placeholder="e.g. Front-row seating" onChange={(e) => setBenefitDraft({ ...benefitDraft, [i]: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = (benefitDraft[i] || "").trim(); if (v) { setT(i, { benefits: [...t.benefits, v] }); setBenefitDraft({ ...benefitDraft, [i]: "" }); } } }} />
                      <Button type="button" variant="outline" onClick={() => { const v = (benefitDraft[i] || "").trim(); if (v) { setT(i, { benefits: [...t.benefits, v] }); setBenefitDraft({ ...benefitDraft, [i]: "" }); } }}>Add</Button></div>
                  </div>
                )}
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              {(["free", "paid", "vip"] as TicketKind[]).map((k) => <Button key={k} type="button" variant="outline" size="sm" onClick={() => setTickets([...tickets, blankTicket(k)])}><Plus className="h-4 w-4 mr-1" />{k.toUpperCase()} ticket</Button>)}
            </div>
          </CardContent></Card>

        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button variant="outline" disabled={busy} onClick={() => save(false)}>Save draft</Button>
          <Button disabled={busy} onClick={() => save(true)}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Submit for approval</Button>
        </div>
      </div>
    </Shell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex flex-col bg-background"><Navigation /><main className="flex-1">{children}</main><Footer /></div>;
}
