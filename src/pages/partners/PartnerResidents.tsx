import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Users, UserPlus, FileText, BedDouble, BedSingle, IndianRupee, AlertTriangle, Plus, Search, Eye, MessageCircle, X, Loader2, Phone, Mail, Download, Wrench, LogOut, ArrowLeftRight, StickyNote, Upload, ChevronLeft, ChevronRight, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { useDashboardMode } from "@/hooks/useDashboardMode";
import { MODE_LABEL, modesForTypes } from "@/config/dashboardModes";
import { residentConfig, LEAD_SOURCES } from "@/config/residentModes";
import { loadResidents, saveLead, moveLead, deleteLead, addStay, updateStay, setBookingStatus, convertLead, todayISO, type PersonRow, type Lead } from "@/services/hospitality/residentsService";
import { raiseTicket } from "@/services/hospitality/maintenanceService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Data = Awaited<ReturnType<typeof loadResidents>>;
const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const d = (s: string | null) => s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const months = (a: string, b: string | null) => { if (!b) return "Open-ended"; const m = Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 2.63e9)); return m >= 1 ? `${m} Month${m > 1 ? "s" : ""}` : `${Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 864e5))} Nights`; };
const initials = (n: string) => n.split(/\s+/).map(x => x[0]).slice(0, 2).join("").toUpperCase();
const PAGE = 8;
const PAY: Record<string, string> = { paid: "bg-emerald-100 text-emerald-700", due: "bg-amber-100 text-amber-700", overdue: "bg-red-100 text-red-700", none: "bg-muted text-muted-foreground" };
const TONE: Record<string, string> = { blue: "border-sky-200 bg-sky-50 text-sky-700", violet: "border-violet-200 bg-violet-50 text-violet-700", amber: "border-amber-200 bg-amber-50 text-amber-700", fuchsia: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700", green: "border-emerald-200 bg-emerald-50 text-emerald-700" };
const wa = (phone: string | null, text = "") => phone ? window.open(`https://wa.me/${phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}?text=${encodeURIComponent(text)}`, "_blank") : toast.error("No phone number saved");
const ago = (s: string) => { const m = Math.round((Date.now() - new Date(s).getTime()) / 6e4); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : d(s); };

export default function PartnerResidents() {
  const { hotelId } = usePartnerHotel();
  const nav = useNavigate();
  const [hotel, setHotel] = useState<{ name: string; business_types: string[] } | null>(null);
  const mode = useDashboardMode(hotelId ?? undefined, hotel?.business_types ?? null);
  const cfg = residentConfig(mode, modesForTypes(hotel?.business_types));
  const [data, setData] = useState<Data | null>(null); const [error, setError] = useState("");
  const [params, setParams] = useSearchParams(); const tab = params.get("tab") || "residents";
  const [q, setQ] = useState(""); const [room, setRoom] = useState("all"); const [pay, setPay] = useState("all"); const [kind, setKind] = useState("all"); const [page, setPage] = useState(1);
  const [sel, setSel] = useState<string | null>(null); const [ptab, setPtab] = useState("overview"); const [checked, setChecked] = useState<string[]>([]);
  const [leadF, setLeadF] = useState("all"); const [leadForm, setLeadForm] = useState<Partial<Lead> | null>(null);
  const [stayForm, setStayForm] = useState<any>(null); const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<{ type: "note" | "room" | "checkout" | "request" | "import"; text: string; extra?: string } | null>(null);

  const load = useCallback(async () => { if (!hotelId) return; try { setError(""); setData(await loadResidents(hotelId, cfg.sources)); } catch (e: any) { setError(e.message || "Could not load"); } }, [hotelId, cfg.sources.join()]);
  useEffect(() => { setData(null); setSel(null); setChecked([]); setPage(1); if (hotelId) (supabase as any).from("partner_hotels").select("name,business_types").eq("id", hotelId).maybeSingle().then((r: any) => setHotel(r.data)); }, [hotelId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!hotelId) return; const ch = supabase.channel(`residents-${hotelId}`); ["hotel_leads", "hotel_long_stays", "hotel_bookings", "hotel_invoices"].forEach(t => ch.on("postgres_changes" as any, { event: "*", schema: "public", table: t, filter: `hotel_id=eq.${hotelId}` }, () => void load())); ch.subscribe(); return () => { void supabase.removeChannel(ch); }; }, [hotelId, load]);
  const run = async (fn: () => Promise<unknown>, msg: string, close?: () => void) => { setBusy(true); try { await fn(); toast.success(msg); close?.(); await load(); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); } };
  const setTab = (t: string) => { setParams(p => { p.set("tab", t); return p; }); setPage(1); };

  const t = todayISO();
  const people = data?.people ?? [];
  const k = useMemo(() => {
    const cur = people.filter(p => p.bucket === "current"); const mo = t.slice(0, 7);
    const occupied = cur.reduce((s, p) => s + (p.kind === "booking" ? Number(p.raw.num_rooms) || 1 : 1), 0); const cap = data?.capacity ?? 0;
    const collected = (data?.invoices ?? []).filter(i => (i.period_start ?? i.created_at ?? "").slice(0, 7) === mo).reduce((s, i) => s + Number(i.paid_amount ?? 0), 0);
    return { cur: cur.length, newLeads: (data?.leads ?? []).filter(l => l.created_at.slice(0, 7) === mo).length, apps: people.filter(p => p.bucket === "application").length,
      cap, occupied, free: Math.max(0, cap - occupied), collected, overdue: people.filter(p => p.payStatus === "overdue").reduce((s, p) => s + p.outstanding, 0),
      arrivals: people.filter(p => p.start === t && p.bucket !== "alumni").length, departures: people.filter(p => p.end === t && p.bucket === "current").length };
  }, [people, data, t]);
  const pct = (n: number) => k.cap ? `${Math.round((n / k.cap) * 100)}%` : "—";
  const isLong = cfg.sources[0] === "stays";
  const kpis: [any, string, string, string?][] = [
    [Users, String(k.cur), isLong ? `Active ${cfg.people}` : "In-House Guests"], [UserPlus, String(k.newLeads), isLong ? "New Leads (This Month)" : "Enquiries (This Month)"],
    [FileText, String(k.apps), isLong ? "Applications (Pending)" : "Reservations Pending"], [BedDouble, String(k.cap), isLong ? "Total Beds" : "Total Rooms"],
    [BedDouble, String(k.occupied), `Occupied (${pct(k.occupied)})`], [BedSingle, String(k.free), `Available (${pct(k.free)})`],
    [IndianRupee, inr(k.collected), isLong ? "Rent Collected (This Month)" : "Revenue Collected (This Month)"], [AlertTriangle, inr(k.overdue), isLong ? "Overdue Rent" : "Overdue Payments", "alert"],
  ];
  const tabCount: Record<string, number> = { residents: people.filter(p => ["current", "upcoming"].includes(p.bucket)).length, leads: data?.leads.length ?? 0, applications: k.apps,
    moves: people.filter(p => p.bucket !== "alumni" && ((p.start >= t && p.start <= addDays(t, 14)) || (p.end && p.end >= t && p.end <= addDays(t, 14)) || p.status === "notice")).length,
    waitlist: data?.waitlist.filter(w => w.status !== "converted").length ?? 0, alumni: people.filter(p => p.bucket === "alumni").length };

  const scoped = people.filter(p => tab === "applications" ? p.bucket === "application" : tab === "alumni" ? p.bucket === "alumni"
    : tab === "moves" ? p.bucket !== "alumni" && ((p.start >= t && p.start <= addDays(t, 14)) || (!!p.end && p.end >= t && p.end <= addDays(t, 14)) || p.status === "notice")
    : ["current", "upcoming"].includes(p.bucket));
  const rows = scoped.filter(p => (room === "all" || p.roomId === room) && (pay === "all" || p.payStatus === pay) && (kind === "all" || p.kind === kind)
    && (!q || `${p.name} ${p.phone ?? ""} ${p.email ?? ""} ${p.unit} ${p.ref ?? ""} ${p.id}`.toLowerCase().includes(q.toLowerCase())));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = people.find(p => p.id === sel) ?? null;
  const leads = (data?.leads ?? []).filter(l => leadF === "all" || l.stage === leadF);

  const exportCsv = (list: PersonRow[]) => { const body = [["Name", "Phone", "Email", cfg.unitLabel, "Stay type", cfg.amountLabel, "Next due", "Payment", "From", "To"], ...list.map(p => [p.name, p.phone, p.email, p.unit, p.stayType, p.amount, p.nextDue, p.payStatus, p.start, p.end])].map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" })); a.download = `${cfg.people.toLowerCase().replace(/\W+/g, "-")}-${t}.csv`; a.click(); };
  const passUrl = (p: PersonRow) => `${window.location.origin}/hotels/${hotelId}?pass=${p.id}`;
  const downloadPass = (p: PersonRow) => { const svg = document.getElementById("stay-pass-qr")?.outerHTML ?? ""; const w = window.open("", "_blank"); if (!w) return toast.error("Allow pop-ups to download"); w.document.write(`<html><head><title>Stay Pass</title></head><body style="font-family:system-ui;text-align:center;padding:40px"><h2>${hotel?.name ?? ""}</h2><h1>${p.name}</h1><div>${svg}</div><p>${cfg.unitLabel}: ${p.unit}</p><p>Valid ${d(p.start)} – ${d(p.end)}</p><script>setTimeout(()=>print(),300)</script></body></html>`); w.document.close(); };

  const doAction = async () => {
    if (!action || !current || !hotelId) return;
    if (action.type === "note") { if (!action.text.trim()) return toast.error("Write a note"); return run(() => current.kind === "stay" ? updateStay(current, { notes: [current.raw.notes, action.text].filter(Boolean).join("\n") }, "Note added", action.text) : (supabase as any).from("hotel_booking_notes").insert({ booking_id: current.id, hotel_id: hotelId, note: action.text }).then((r: any) => { if (r.error) throw r.error; }), "Note added", () => setAction(null)); }
    if (action.type === "room") { if (!action.extra) return toast.error("Choose a room"); return run(() => updateStay(current, { room_id: action.extra, unit_label: action.text || null }, "Room / bed changed", `${current.unit} → ${action.text}`), "Room updated", () => setAction(null)); }
    if (action.type === "checkout") return run(() => current.kind === "stay" ? updateStay(current, { status: "moved_out", move_out: action.extra || t, checkout_notes: action.text || null }, "Checked out", action.text) : setBookingStatus(current, "checked_out"), "Checkout recorded", () => setAction(null));
    if (action.type === "request") { if (!action.text.trim()) return toast.error("Describe the request"); return run(() => raiseTicket(hotelId, { title: action.text, category_key: action.extra || "other", room_label: current.unit, requester_name: current.name, requester_type: current.kind === "stay" ? "resident" : "guest" }), "Request raised", () => setAction(null)); }
    if (action.type === "import") { const lines = action.text.split(/\n/).map(l => l.split(",").map(x => x.trim())).filter(l => l[0]); if (!lines.length) return toast.error("Paste at least one line"); return run(async () => { for (const [name, phone, email, interest] of lines) await saveLead(hotelId, { name, phone: phone || null, email: email || null, interest: interest || null, source: "other", stage: "new" }); }, `${lines.length} leads imported`, () => setAction(null)); }
  };

  if (!hotelId) return <div className="p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>;
  const timeline = current ? [...(current.raw.timeline ?? []), ...(current.raw.invoices ?? []).map((i: any) => ({ at: i.created_at, label: `Invoice ${i.invoice_no} · ${inr(i.total)}`, note: i.status })), ...(data?.tickets ?? []).filter(x => x.requester_name === current.name).map(x => ({ at: x.created_at, label: x.title, note: x.status }))].sort((a, b) => b.at.localeCompare(a.at)) : [];

  return (
    <div className="flex gap-4 p-3 md:p-5">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs text-muted-foreground">{MODE_LABEL[mode]} / {cfg.title}</p><h1 className="text-2xl font-bold">{cfg.title}</h1><p className="text-sm text-muted-foreground">Manage your {cfg.people.toLowerCase()}, enquiries and the complete stay lifecycle at {hotel?.name ?? "this property"}.</p></div>
          <div className="flex flex-wrap gap-2">
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" disabled={!checked.length}>Bulk Actions ({checked.length})</Button></DropdownMenuTrigger>
              <DropdownMenuContent><DropdownMenuItem onClick={() => exportCsv(people.filter(p => checked.includes(p.id)))}>Export selected</DropdownMenuItem>
                <DropdownMenuItem onClick={() => people.filter(p => checked.includes(p.id) && p.outstanding > 0).forEach(p => wa(p.phone, `Hi ${p.name}, a reminder from ${hotel?.name}: ${inr(p.outstanding)} is due${p.nextDue ? ` by ${d(p.nextDue)}` : ""}.`))}>Send payment reminders</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setChecked([])}>Clear selection</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
            <Button variant="outline" onClick={() => setAction({ type: "import", text: "" })}><Upload className="mr-1 h-4 w-4" />Import / Invite</Button>
            {isLong ? <Button className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-primary-foreground" onClick={() => setStayForm({ resident_name: "", resident_phone: "", resident_email: "", room_id: "", unit_label: "", move_in: t, move_out: "", monthly_rent: "", deposit: "", rent_due_day: 5, gender: "", occupation: "", company: "" })}><Plus className="mr-1 h-4 w-4" />{cfg.addLabel}</Button>
              : <Button className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-primary-foreground" onClick={() => nav("/partners/reservations")}><Plus className="mr-1 h-4 w-4" />New Reservation</Button>}
          </div>
        </div>

        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error} <Button size="sm" variant="link" onClick={() => void load()}>Retry</Button></div>}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
          {kpis.map(([I, v, l, tone]) => <div key={l} className={`rounded-xl border p-3 ${tone ? "border-red-200 bg-red-50" : "bg-card"}`}><div className="flex items-center gap-2"><I className={`h-6 w-6 ${tone ? "text-red-600" : "text-violet-600"}`} /><span className="text-lg font-bold">{data ? v : "…"}</span></div><p className="mt-1 text-[11px] text-muted-foreground">{l}</p></div>)}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {cfg.tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium ${tab === key ? "border-transparent bg-gradient-to-r from-violet-600 to-fuchsia-600 text-primary-foreground" : "bg-card hover:bg-muted"}`}>{label} ({tabCount[key] ?? 0})</button>)}
        </div>

        {tab === "waitlist" ? (
          <div className="rounded-xl border bg-card p-4"><h2 className="mb-3 font-semibold">Waitlist</h2>
            {!data ? <Loader2 className="h-5 w-5 animate-spin" /> : !data.waitlist.length ? <p className="py-8 text-center text-sm text-muted-foreground">Nobody is waiting. Customers join automatically when rooms are full.</p> :
              <div className="divide-y">{data.waitlist.map(w => <div key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span>{data.rooms.find(r => r.id === w.room_id)?.room_name ?? "Any room"} · {d(w.check_in)} – {d(w.check_out)} · {w.guests} guest(s)</span><Badge variant="outline" className="capitalize">{w.status}</Badge></div>)}</div>}
          </div>
        ) : tab !== "leads" && (
          <div className="rounded-xl border bg-card">
            <div className="flex flex-wrap items-center gap-2 border-b p-3">
              <div className="mr-auto"><h2 className="font-semibold">{cfg.tabs.find(x => x[0] === tab)?.[1]}</h2><p className="text-xs text-muted-foreground">{rows.length} record(s) at {hotel?.name}</p></div>
              <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="h-9 w-56 pl-8" placeholder="Search by name, mobile, room, ID…" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /></div>
              <Select value={room} onValueChange={v => { setRoom(v); setPage(1); }}><SelectTrigger className="h-9 w-36"><SelectValue placeholder={cfg.unitLabel} /></SelectTrigger><SelectContent><SelectItem value="all">All rooms</SelectItem>{data?.rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.room_name || r.room_type}</SelectItem>)}</SelectContent></Select>
              <Select value={pay} onValueChange={v => { setPay(v); setPage(1); }}><SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Any payment</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="due">Due</SelectItem><SelectItem value="overdue">Overdue</SelectItem></SelectContent></Select>
              {cfg.sources.length > 1 && <Select value={kind} onValueChange={v => { setKind(v); setPage(1); }}><SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All stays</SelectItem><SelectItem value="stay">Long stays</SelectItem><SelectItem value="booking">Bookings</SelectItem></SelectContent></Select>}
              <Button size="sm" variant="outline" onClick={() => exportCsv(rows)}><Download className="h-4 w-4" /></Button>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr className="border-b"><th className="p-2"><Checkbox checked={!!rows.length && rows.every(r => checked.includes(r.id))} onCheckedChange={v => setChecked(v ? rows.map(r => r.id) : [])} /></th><th className="p-2">{cfg.person}</th><th className="p-2">{cfg.unitLabel}</th><th className="p-2">Stay Type</th><th className="p-2">{cfg.amountLabel}</th><th className="p-2">Next Due</th><th className="p-2">Payment</th><th className="p-2">Stay Period</th><th className="p-2 text-right">Actions</th></tr></thead>
              <tbody>
                {!data ? <tr><td colSpan={9} className="p-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                  : !rows.length ? <tr><td colSpan={9} className="p-10 text-center text-muted-foreground">No {cfg.people.toLowerCase()} match. {isLong && tab === "residents" && "Add your first one with the button above."}</td></tr>
                  : rows.slice((page - 1) * PAGE, page * PAGE).map(p => (
                    <tr key={p.id} onClick={() => { setSel(p.id); setPtab("overview"); }} className={`cursor-pointer border-b hover:bg-muted/50 ${sel === p.id ? "bg-violet-50" : ""}`}>
                      <td className="p-2" onClick={e => e.stopPropagation()}><Checkbox checked={checked.includes(p.id)} onCheckedChange={v => setChecked(c => v ? [...c, p.id] : c.filter(x => x !== p.id))} /></td>
                      <td className="p-2"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{initials(p.name)}</span><div><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.phone ?? p.email ?? "—"}</p></div></div></td>
                      <td className="p-2">{p.unit}</td><td className="p-2"><Badge variant="outline" className="border-violet-200 text-violet-700">{p.stayType}</Badge></td>
                      <td className="p-2 font-semibold">{inr(p.amount)}</td><td className="p-2">{d(p.nextDue)}</td>
                      <td className="p-2"><span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${PAY[p.payStatus]}`}>{p.payStatus === "none" ? "No invoice" : p.payStatus}</span></td>
                      <td className="p-2 text-xs">{d(p.start)} – {p.end ? d(p.end) : "Open"}<br /><span className="text-muted-foreground">({months(p.start, p.end)})</span></td>
                      <td className="p-2 text-right" onClick={e => e.stopPropagation()}><Button size="icon" variant="ghost" onClick={() => setSel(p.id)}><Eye className="h-4 w-4 text-violet-600" /></Button><Button size="icon" variant="ghost" onClick={() => wa(p.phone, `Hi ${p.name}, `)}><MessageCircle className="h-4 w-4 text-violet-600" /></Button></td>
                    </tr>))}
              </tbody></table></div>
            <div className="flex items-center justify-between p-3 text-sm"><span className="text-muted-foreground">Showing {rows.length ? (page - 1) * PAGE + 1 : 0} – {Math.min(page * PAGE, rows.length)} of {rows.length}</span>
              <div className="flex items-center gap-1"><Button size="icon" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button><span className="px-2">{page} / {pages}</span><Button size="icon" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button></div></div>
          </div>
        )}

        {(tab === "leads" || tab === "residents") && (
          <div className="rounded-xl border bg-card p-3">
            <div className="mb-3 flex flex-wrap items-center gap-2"><div className="mr-auto"><h2 className="font-semibold">{cfg.tabs[1][1]}</h2><p className="text-xs text-muted-foreground">Drag a card to change its stage.</p></div>
              <button onClick={() => setLeadF("all")} className={`rounded-full border px-3 py-1 text-xs ${leadF === "all" ? "bg-violet-600 text-primary-foreground" : ""}`}>All ({data?.leads.length ?? 0})</button>
              {cfg.stages.slice(0, 4).map(s => <button key={s.key} onClick={() => setLeadF(s.key)} className={`rounded-full border px-3 py-1 text-xs ${leadF === s.key ? "bg-violet-600 text-primary-foreground" : ""}`}>{s.label} ({data?.leads.filter(l => l.stage === s.key).length ?? 0})</button>)}
              <Button size="sm" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-primary-foreground" onClick={() => setLeadForm({ stage: "new", source: "walk_in" })}><Plus className="mr-1 h-4 w-4" />Add Lead</Button></div>
            <div className="grid gap-3 overflow-x-auto md:grid-cols-3 xl:grid-cols-5">
              {cfg.stages.filter(s => leadF === "all" || s.key === leadF).map(s => { const list = leads.filter(l => l.stage === s.key); return (
                <div key={s.key} onDragOver={e => e.preventDefault()} onDrop={e => { const l = data?.leads.find(x => x.id === e.dataTransfer.getData("lead")); if (l) void run(() => moveLead(l, s.key, s.label), `Moved to ${s.label}`); }} className="min-h-40 rounded-lg border bg-muted/30">
                  <div className={`flex items-center justify-between rounded-t-lg border-b px-3 py-2 text-sm font-semibold ${TONE[s.tone]}`}>{s.label} ({list.length})<button onClick={() => setLeadForm({ stage: s.key, source: "walk_in" })}><Plus className="h-4 w-4" /></button></div>
                  <div className="space-y-2 p-2">{list.slice(0, 6).map(l => (
                    <div key={l.id} draggable onDragStart={e => e.dataTransfer.setData("lead", l.id)} onClick={() => setLeadForm(l)} className="cursor-grab rounded-md border bg-card p-2 text-xs shadow-sm">
                      <p className="font-semibold">{l.name}</p><p className="text-muted-foreground">{l.phone ?? l.email}</p>
                      <p className="text-muted-foreground">{LEAD_SOURCES.find(x => x[0] === l.source)?.[1]} · {ago(l.created_at)}</p>
                      {l.visit_at && <p className="text-amber-700">Visit: {new Date(l.visit_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>}
                      {l.follow_up_at && new Date(l.follow_up_at) <= new Date() && s.key !== "converted" && <p className="flex items-center gap-1 text-red-600"><Clock className="h-3 w-3" />Follow-up due</p>}
                    </div>))}
                    {!list.length && <p className="py-4 text-center text-xs text-muted-foreground">No leads</p>}
                    {list.length > 6 && <button className="w-full text-xs text-violet-700" onClick={() => setLeadF(s.key)}>View all {list.length} →</button>}
                  </div></div>); })}
            </div>
            {data && data.leads.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Conversion rate: {Math.round((data.leads.filter(l => l.stage === "converted").length / data.leads.length) * 100)}%</p>}
          </div>
        )}
      </div>

      {current && (
        <aside className="fixed inset-0 z-40 overflow-y-auto bg-background p-4 lg:sticky lg:top-20 lg:z-auto lg:h-[calc(100vh-6rem)] lg:w-[400px] lg:shrink-0 lg:rounded-xl lg:border">
          <div className="flex items-start gap-3"><span className="grid h-14 w-14 place-items-center rounded-xl bg-violet-100 text-lg font-bold text-violet-700">{initials(current.name)}</span>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="truncate text-lg font-bold">{current.name}</h2><Badge className="capitalize bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{current.status.replace("_", " ")}</Badge></div><p className="text-xs text-muted-foreground">{cfg.person} ID: {current.ref ?? current.id.slice(0, 8).toUpperCase()}</p></div>
            <Button size="icon" variant="ghost" onClick={() => current.phone && window.open(`tel:${current.phone}`)}><Phone className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => setSel(null)}><X className="h-4 w-4" /></Button></div>
          <div className="mt-3 grid grid-cols-5 gap-1 rounded-lg bg-muted p-1 text-xs">{[["overview", "Overview"], ["stay", "Stay & Room"], ["payments", "Payments"], ["docs", "Documents"], ["history", "History"]].map(([k2, l]) => <button key={k2} onClick={() => setPtab(k2)} className={`rounded-md py-1.5 ${ptab === k2 ? "bg-violet-600 text-primary-foreground" : ""}`}>{l}</button>)}</div>

          {ptab === "overview" && <div className="mt-3 space-y-3">
            <div className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border p-3 text-sm">
              <dl className="space-y-1.5">{[["Mobile", current.phone], ["Email", current.email], ["Gender", current.raw.gender], ["DOB", current.raw.dob && d(current.raw.dob)], ["Occupation", current.raw.occupation], ["Company", current.raw.company]].filter(x => x[1]).map(([a, b]) => <div key={a} className="flex gap-2"><dt className="w-20 text-muted-foreground">{a}</dt><dd className="truncate">{b}</dd></div>)}</dl>
              <div className="text-center"><p className="mb-1 text-xs font-semibold text-violet-700">Digital Stay Pass</p><QRCodeSVG id="stay-pass-qr" value={passUrl(current)} size={96} /><p className="mt-1 text-[10px]">{current.unit}</p><Button size="sm" variant="link" className="h-6 text-xs" onClick={() => downloadPass(current)}><Download className="mr-1 h-3 w-3" />Download Pass</Button></div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border p-2"><p className="mb-1 font-semibold">Stay Summary</p>{[[cfg.unitLabel, current.unit], ["Type", current.stayType], ["From", d(current.start)], ["To", current.end ? d(current.end) : "Open"], ["Duration", months(current.start, current.end)]].map(([a, b]) => <p key={a} className="flex justify-between gap-1"><span className="text-muted-foreground">{a}</span><span className="truncate">{b}</span></p>)}</div>
              <div className="rounded-lg border p-2"><p className="mb-1 font-semibold">Payment Summary</p>{[[cfg.amountLabel, inr(current.amount)], ...(current.deposit ? [["Deposit", inr(current.deposit)]] : []), ["Paid", inr(current.paid)], ["Outstanding", inr(current.outstanding)], ["Next due", d(current.nextDue)]].map(([a, b]) => <p key={a} className="flex justify-between gap-1"><span className="text-muted-foreground">{a}</span><span>{b}</span></p>)}<button className="mt-1 text-violet-700" onClick={() => setPtab("payments")}>View Payment History →</button></div>
            </div>
            <div><p className="mb-2 text-sm font-semibold">Quick Actions</p><div className="grid grid-cols-3 gap-2 text-[11px]">
              <QA icon={IndianRupee} label={isLong ? "Collect Rent" : "Collect Payment"} onClick={() => nav("/partners/rent-payments?tab=outstanding")} />
              <QA icon={Wrench} label="Raise Request" onClick={() => setAction({ type: "request", text: "", extra: "other" })} />
              {current.bucket !== "alumni" && <QA icon={LogOut} label="Mark Checkout" onClick={() => setAction({ type: "checkout", text: "", extra: t })} />}
              {current.kind === "stay" && current.bucket !== "alumni" && <QA icon={ArrowLeftRight} label={isLong ? "Change Bed" : "Change Room"} onClick={() => setAction({ type: "room", text: current.raw.unit_label ?? "", extra: current.roomId ?? "" })} />}
              {current.kind === "booking" && current.bucket === "upcoming" && current.start <= t && <QA icon={CheckCircle2} label="Check In" onClick={() => run(() => setBookingStatus(current, "checked_in"), "Checked in")} />}
              <QA icon={StickyNote} label="Add Note" onClick={() => setAction({ type: "note", text: "" })} />
              <QA icon={MessageCircle} label="WhatsApp" onClick={() => wa(current.phone, `Hi ${current.name}, `)} />
            </div></div>
            {current.raw.notes && <div className="rounded-lg border p-2 text-xs"><p className="font-semibold">Notes</p><p className="whitespace-pre-wrap text-muted-foreground">{current.raw.notes}</p></div>}
          </div>}
          {ptab === "stay" && <div className="mt-3 space-y-2 text-sm">{[[cfg.unitLabel, current.unit], ["Stay type", current.stayType], ["Start", d(current.start)], ["End", current.end ? d(current.end) : "Open-ended"], ...(current.kind === "stay" ? [["Rent due day", String(current.raw.rent_due_day)], ["Occupants", String(current.raw.occupants ?? 1)], ["Rent plan", current.raw.rent_plan ?? "Monthly"]] : [["Rooms", String(current.raw.num_rooms ?? 1)], ["Booking ref", current.ref ?? "—"]]), ...(current.raw.checkout_notes ? [["Checkout inspection", current.raw.checkout_notes]] : [])].map(([a, b]) => <div key={a} className="flex justify-between gap-3 border-b py-1.5"><span className="text-muted-foreground">{a}</span><span className="text-right">{b}</span></div>)}</div>}
          {ptab === "payments" && <div className="mt-3 space-y-2 text-sm">{!(current.raw.invoices ?? []).length ? <p className="py-6 text-center text-muted-foreground">No invoices yet. Raise one in Rent & Payments.</p> : current.raw.invoices.map((i: any) => <div key={i.id} className="flex justify-between rounded-lg border p-2"><div><p className="font-medium">{i.invoice_no}</p><p className="text-xs text-muted-foreground">Due {d(i.due_date)}</p></div><div className="text-right"><p>{inr(i.total)}</p><p className="text-xs capitalize text-muted-foreground">{i.status} · paid {inr(i.paid_amount)}</p></div></div>)}<Button variant="outline" className="w-full" onClick={() => nav("/partners/rent-payments")}>Open Rent & Payments</Button></div>}
          {ptab === "docs" && <div className="mt-3 space-y-2 text-sm"><p>KYC status: <Badge variant="outline" className="capitalize">{current.raw.kyc_status ?? "pending"}</Badge></p>
            {current.kind === "stay" && <Select value={current.raw.kyc_status ?? "pending"} onValueChange={v => run(() => updateStay(current, { kyc_status: v }, `KYC marked ${v}`), "KYC updated")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["pending", "submitted", "verified", "rejected"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select>}
            <p className="text-xs text-muted-foreground">Guest ID images uploaded at check-in are stored privately and shown on the booking in Reservations.</p></div>}
          {ptab === "history" && <ol className="mt-3 space-y-2 border-l pl-4 text-sm">{!timeline.length ? <p className="text-muted-foreground">No activity yet.</p> : timeline.map((e: any, i: number) => <li key={i}><p className="font-medium">{e.label}</p><p className="text-xs text-muted-foreground">{new Date(e.at).toLocaleString("en-IN")}{e.note ? ` · ${e.note}` : ""}</p></li>)}</ol>}
        </aside>
      )}

      <Dialog open={!!leadForm} onOpenChange={o => !o && setLeadForm(null)}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{leadForm?.id ? "Lead" : "Add Lead"}</DialogTitle></DialogHeader>
        {leadForm && <div className="grid grid-cols-2 gap-2">
          <Input className="col-span-2" placeholder="Full name *" value={leadForm.name ?? ""} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} />
          <Input placeholder="Phone" value={leadForm.phone ?? ""} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} /><Input placeholder="Email" type="email" value={leadForm.email ?? ""} onChange={e => setLeadForm({ ...leadForm, email: e.target.value })} />
          <Select value={leadForm.source} onValueChange={v => setLeadForm({ ...leadForm, source: v })}><SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger><SelectContent>{LEAD_SOURCES.map(([k2, l]) => <SelectItem key={k2} value={k2}>{l}</SelectItem>)}</SelectContent></Select>
          <Select value={leadForm.stage} onValueChange={v => setLeadForm({ ...leadForm, stage: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{cfg.stages.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent></Select>
          <Input placeholder="Interested in (room / sharing)" value={leadForm.interest ?? ""} onChange={e => setLeadForm({ ...leadForm, interest: e.target.value })} /><Input type="number" placeholder="Budget ₹" value={leadForm.budget ?? ""} onChange={e => setLeadForm({ ...leadForm, budget: e.target.value ? Number(e.target.value) : null })} />
          <Input placeholder="Assigned to" value={leadForm.assignee_name ?? ""} onChange={e => setLeadForm({ ...leadForm, assignee_name: e.target.value })} />
          <label className="text-xs">{isLong ? "Move-in" : "Check-in"}<Input type="date" value={leadForm.preferred_move_in ?? ""} onChange={e => setLeadForm({ ...leadForm, preferred_move_in: e.target.value || null })} /></label>
          <label className="text-xs">Follow-up<Input type="datetime-local" value={leadForm.follow_up_at?.slice(0, 16) ?? ""} onChange={e => setLeadForm({ ...leadForm, follow_up_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>
          <label className="text-xs">Visit<Input type="datetime-local" value={leadForm.visit_at?.slice(0, 16) ?? ""} onChange={e => setLeadForm({ ...leadForm, visit_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>
          <Textarea className="col-span-2" placeholder="Notes" value={leadForm.notes ?? ""} onChange={e => setLeadForm({ ...leadForm, notes: e.target.value })} />
          {leadForm.timeline?.length ? <div className="col-span-2 max-h-24 overflow-y-auto text-xs text-muted-foreground">{leadForm.timeline.slice().reverse().map((e, i) => <p key={i}>{new Date(e.at).toLocaleString("en-IN")} · {e.label}</p>)}</div> : null}
        </div>}
        <DialogFooter className="flex-wrap gap-2">
          {leadForm?.id && <Button variant="ghost" className="mr-auto text-destructive" onClick={() => run(() => deleteLead(leadForm.id!), "Lead removed", () => setLeadForm(null))}><Trash2 className="h-4 w-4" /></Button>}
          {leadForm?.phone && <Button variant="outline" onClick={() => wa(leadForm.phone!, `Hi ${leadForm.name}, thanks for your interest in ${hotel?.name}.`)}><MessageCircle className="mr-1 h-4 w-4" />WhatsApp</Button>}
          {leadForm?.id && leadForm.stage !== "converted" && (isLong ? <Button variant="outline" onClick={() => { const l = leadForm as Lead; setLeadForm(null); setStayForm({ resident_name: l.name, resident_phone: l.phone ?? "", resident_email: l.email ?? "", room_id: "", unit_label: "", move_in: l.preferred_move_in ?? t, move_out: "", monthly_rent: l.budget ?? "", deposit: "", rent_due_day: 5, _lead: l }); }}>Convert to {cfg.person}</Button>
            : <Button variant="outline" onClick={() => run(() => convertLead(leadForm as Lead, null), "Marked as booked", () => { setLeadForm(null); nav("/partners/reservations"); })}>Create Reservation</Button>)}
          <Button disabled={busy} onClick={() => hotelId && run(() => saveLead(hotelId, leadForm!), "Lead saved", () => setLeadForm(null))}>Save</Button>
        </DialogFooter></DialogContent></Dialog>

      <Dialog open={!!stayForm} onOpenChange={o => !o && setStayForm(null)}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{cfg.addLabel}</DialogTitle></DialogHeader>
        {stayForm && <div className="grid grid-cols-2 gap-2">
          <Input className="col-span-2" placeholder="Full name *" value={stayForm.resident_name} onChange={e => setStayForm({ ...stayForm, resident_name: e.target.value })} />
          <Input placeholder="Mobile" value={stayForm.resident_phone} onChange={e => setStayForm({ ...stayForm, resident_phone: e.target.value })} /><Input placeholder="Email" value={stayForm.resident_email} onChange={e => setStayForm({ ...stayForm, resident_email: e.target.value })} />
          <Select value={stayForm.room_id} onValueChange={v => setStayForm({ ...stayForm, room_id: v })}><SelectTrigger><SelectValue placeholder="Room type *" /></SelectTrigger><SelectContent>{data?.rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.room_name || r.room_type}</SelectItem>)}</SelectContent></Select>
          <Input placeholder="Room / bed (e.g. B-204 / Bed 2)" value={stayForm.unit_label} onChange={e => setStayForm({ ...stayForm, unit_label: e.target.value })} />
          <label className="text-xs">Move-in *<Input type="date" value={stayForm.move_in} onChange={e => setStayForm({ ...stayForm, move_in: e.target.value })} /></label><label className="text-xs">Move-out (optional)<Input type="date" value={stayForm.move_out} onChange={e => setStayForm({ ...stayForm, move_out: e.target.value })} /></label>
          <Input type="number" placeholder="Monthly rent ₹ *" value={stayForm.monthly_rent} onChange={e => setStayForm({ ...stayForm, monthly_rent: e.target.value })} /><Input type="number" placeholder="Security deposit ₹" value={stayForm.deposit} onChange={e => setStayForm({ ...stayForm, deposit: e.target.value })} />
          <Input type="number" min={1} max={28} placeholder="Rent due day" value={stayForm.rent_due_day} onChange={e => setStayForm({ ...stayForm, rent_due_day: e.target.value })} />
          <Select value={stayForm.gender || undefined} onValueChange={v => setStayForm({ ...stayForm, gender: v })}><SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger><SelectContent>{["Male", "Female", "Other"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>
          <Input placeholder="Occupation" value={stayForm.occupation ?? ""} onChange={e => setStayForm({ ...stayForm, occupation: e.target.value })} /><Input placeholder="Company / college" value={stayForm.company ?? ""} onChange={e => setStayForm({ ...stayForm, company: e.target.value })} />
        </div>}
        <DialogFooter><Button disabled={busy} onClick={() => hotelId && run(async () => {
          if (!stayForm.room_id) throw new Error("Choose a room type");
          if (stayForm.move_out && stayForm.move_out <= stayForm.move_in) throw new Error("Move-out must be after move-in");
          const { _lead, ...f } = stayForm; const r = await addStay(hotelId, { ...f, move_out: f.move_out || null, monthly_rent: Number(f.monthly_rent), deposit: Number(f.deposit) || 0, rent_due_day: Math.min(28, Math.max(1, Number(f.rent_due_day) || 5)), resident_phone: f.resident_phone || null, resident_email: f.resident_email || null, unit_label: f.unit_label || null, gender: f.gender || null });
          if (_lead) await convertLead(_lead, r.id);
        }, `${cfg.person} added`, () => setStayForm(null))}>Save</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={!!action} onOpenChange={o => !o && setAction(null)}><DialogContent><DialogHeader><DialogTitle>{action && { note: "Add Note", room: "Change Room / Bed", checkout: "Mark Checkout", request: "Raise Request", import: "Import / Invite Leads" }[action.type]}</DialogTitle></DialogHeader>
        {action?.type === "room" && <Select value={action.extra} onValueChange={v => setAction({ ...action, extra: v })}><SelectTrigger><SelectValue placeholder="Room type" /></SelectTrigger><SelectContent>{data?.rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.room_name || r.room_type}</SelectItem>)}</SelectContent></Select>}
        {action?.type === "checkout" && current?.kind === "stay" && <label className="text-xs">Move-out date<Input type="date" value={action.extra} onChange={e => setAction({ ...action, extra: e.target.value })} /></label>}
        {action?.type === "request" && <Select value={action.extra} onValueChange={v => setAction({ ...action, extra: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[["electrical", "Electrical"], ["plumbing", "Plumbing"], ["hvac", "AC / Fan"], ["furniture", "Furniture"], ["internet", "Internet / Wi-Fi"], ["other", "Other"]].map(([a, b]) => <SelectItem key={a} value={a}>{b}</SelectItem>)}</SelectContent></Select>}
        {action?.type === "import" && <p className="text-xs text-muted-foreground">One lead per line: name, phone, email, interest</p>}
        {action && (action.type === "room" ? <Input placeholder="Room / bed label" value={action.text} onChange={e => setAction({ ...action, text: e.target.value })} />
          : <Textarea rows={action.type === "import" ? 6 : 3} placeholder={action.type === "checkout" ? "Checkout inspection notes (damages, keys returned, deposit deductions)" : action.type === "import" ? "Ravi Kumar, 9876543210, ravi@mail.com, Double sharing" : "Write here…"} value={action.text} onChange={e => setAction({ ...action, text: e.target.value })} />)}
        {action?.type === "checkout" && current && current.deposit > 0 && <p className="text-xs text-muted-foreground">Deposit held: {inr(current.deposit)}. Settle refunds in Rent & Payments → Refunds.</p>}
        <DialogFooter><Button disabled={busy} onClick={() => void doAction()}>Save</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function QA({ icon: I, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex flex-col items-center gap-1 rounded-lg border p-2 hover:bg-violet-50"><I className="h-5 w-5 text-violet-600" />{label}</button>;
}
function addDays(iso: string, n: number) { const x = new Date(iso); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); }
