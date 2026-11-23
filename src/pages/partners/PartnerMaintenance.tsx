import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { Wrench, CheckCircle2, RefreshCw, Clock, AlertTriangle, CalendarDays, Gauge, Star, Plus, ClipboardList, Package, MessageSquarePlus, Search, Eye, X, Loader2, Upload, Paperclip, Zap, Droplet, Fan, Sofa, Wifi, MoreHorizontal, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { useDashboardMode } from "@/hooks/useDashboardMode";
import { MODE_LABEL, modesForTypes } from "@/config/dashboardModes";
import { categoriesForModes, maintCategoryLabel, PRIORITIES, requesterLabel, slaOnTime, ticketState } from "@/config/maintenanceCategories";
import { loadMaintenance, raiseTicket, updateTicket, uploadAttachment, attachmentUrl, saveVendor, saveAsset, saveSchedule, completeSchedule, type Ticket, type Vendor, type Asset, type Schedule } from "@/services/hospitality/maintenanceService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Data = Awaited<ReturnType<typeof loadMaintenance>>;
const TABS = [["overview", "Overview"], ["tickets", "Requests & Tickets"], ["work", "Work Orders"], ["preventive", "Preventive Maintenance"], ["assets", "Assets & Equipment"], ["vendors", "Vendors / Service Providers"], ["reports", "Reports"]] as const;
const STATE_LABEL: Record<string, string> = { completed: "Completed", in_progress: "In Progress", open: "Open", overdue: "Overdue", scheduled: "Scheduled" };
const STATE_COLOR: Record<string, string> = { completed: "hsl(142 70% 45%)", in_progress: "hsl(210 85% 55%)", open: "hsl(45 95% 50%)", overdue: "hsl(0 75% 55%)", scheduled: "hsl(265 80% 60%)" };
const QUICK: [string, string, any][] = [["electrical", "Electrical Issue", Zap], ["plumbing", "Plumbing Issue", Droplet], ["hvac", "AC / Fan Issue", Fan], ["furniture", "Furniture Repair", Sofa], ["internet", "Internet / Wi-Fi", Wifi], ["other", "Other Issue", MoreHorizontal]];
const when = (d: string | null) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const PAGE = 10;
const stateBadge = (t: Ticket) => { const s = ticketState(t); return <Badge variant="outline" style={{ borderColor: STATE_COLOR[s], color: STATE_COLOR[s] }}>{STATE_LABEL[s]}</Badge>; };
const prioBadge = (p: string) => <Badge variant={p === "urgent" || p === "high" ? "destructive" : "secondary"} className="capitalize">{p}</Badge>;

export default function PartnerMaintenance() {
  const { hotelId } = usePartnerHotel();
  const [types, setTypes] = useState<string[] | null>(null);
  const mode = useDashboardMode(hotelId ?? undefined, types);
  const cats = useMemo(() => categoriesForModes(modesForTypes(types)), [types]);
  const who = requesterLabel(mode);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "overview";
  const [q, setQ] = useState(""); const [state, setState] = useState("all"); const [cat, setCat] = useState("all"); const [prio, setPrio] = useState("all"); const [asg, setAsg] = useState("all"); const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<string[]>([]);
  const [detail, setDetail] = useState<string | null>(null);
  const [raise, setRaise] = useState<Partial<Ticket> | null>(null);
  const [vendor, setVendor] = useState<Partial<Vendor> | null>(null);
  const [asset, setAsset] = useState<Partial<Asset> | null>(null);
  const [sched, setSched] = useState<Partial<Schedule> | null>(null);

  const load = useCallback(async () => { if (!hotelId) return; try { setError(""); setData(await loadMaintenance(hotelId)); } catch (e: any) { setError(e.message || "Could not load maintenance"); } }, [hotelId]);
  useEffect(() => { setData(null); setDetail(null); setPicked([]); setPage(1); void load(); if (hotelId) (supabase as any).from("partner_hotels").select("business_types").eq("id", hotelId).maybeSingle().then((r: any) => setTypes(r.data?.business_types ?? [])); }, [hotelId, load]);
  useEffect(() => { if (!hotelId) return; const ch = supabase.channel(`maint-${hotelId}`).on("postgres_changes" as any, { event: "*", schema: "public", table: "hotel_ops_tasks", filter: `hotel_id=eq.${hotelId}` }, () => void load()).subscribe(); return () => { void supabase.removeChannel(ch); }; }, [hotelId, load]);

  const tickets = data?.tickets ?? [];
  const scope = tab === "work" ? tickets.filter(t => t.is_work_order) : tickets;
  const counts = useMemo(() => { const c: Record<string, number> = { completed: 0, in_progress: 0, open: 0, overdue: 0, scheduled: 0 }; tickets.forEach(t => c[ticketState(t)]++); return c; }, [tickets]);
  const assignees = Array.from(new Set(tickets.map(t => t.assignee_name).filter(Boolean))) as string[];
  const filtered = scope.filter(t => (state === "all" || ticketState(t) === state) && (cat === "all" || t.category_key === cat) && (prio === "all" || t.priority === prio) && (asg === "all" || t.assignee_name === asg) && (!q || `${t.ticket_no} ${t.title} ${t.room_label} ${t.requester_name}`.toLowerCase().includes(q.toLowerCase())));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const rated = tickets.filter(t => t.rating);
  const avgRating = rated.length ? (rated.reduce((s, t) => s + Number(t.rating), 0) / rated.length).toFixed(1) : "—";
  const sla = slaOnTime(tickets);
  const pct = (n: number) => tickets.length ? `${((n / tickets.length) * 100).toFixed(1)}%` : "0%";
  const act = async (fn: () => Promise<unknown>, msg: string) => { try { await fn(); toast.success(msg); void load(); } catch (e: any) { toast.error(e.message); } };

  if (!hotelId) return <div className="p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>;
  const selected = tickets.find(t => t.id === detail) ?? null;
  const newTicket = (extra: Partial<Ticket> = {}) => setRaise({ priority: "normal", category_key: cats[0]?.key, requester_type: who.toLowerCase(), ...extra });

  return (
    <div className="flex gap-4 p-3 md:p-5">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs text-muted-foreground">{MODE_LABEL[mode]} / Maintenance</p><h1 className="text-2xl font-bold">Maintenance</h1>
            <p className="text-sm text-muted-foreground">Manage maintenance requests, work orders, assets, preventive maintenance and service providers.</p></div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => newTicket()}><Plus className="mr-1 h-4 w-4" />Raise Request</Button>
            <Button variant="outline" size="sm" onClick={() => newTicket({ is_work_order: true })}><ClipboardList className="mr-1 h-4 w-4" />Create Work Order</Button>
            <Button variant="outline" size="sm" onClick={() => setParams({ tab: "assets" })}><Package className="mr-1 h-4 w-4" />Asset Register</Button>
            <Button size="sm" onClick={() => newTicket({ requester_type: who.toLowerCase() })}><MessageSquarePlus className="mr-1 h-4 w-4" />Add Complaint</Button>
          </div>
        </div>
        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{error} <Button size="sm" variant="link" onClick={() => void load()}>Retry</Button></div>}
        {!data && !error ? <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-primary" /> : data && (<>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
            {[[Wrench, tickets.length, "Total Requests"], [CheckCircle2, counts.completed, `Completed (${pct(counts.completed)})`], [RefreshCw, counts.in_progress, `In Progress (${pct(counts.in_progress)})`], [Clock, counts.open, `Open (${pct(counts.open)})`], [AlertTriangle, counts.overdue, `Overdue (${pct(counts.overdue)})`], [CalendarDays, counts.scheduled, "Scheduled"], [Gauge, sla === null ? "—" : `${sla}%`, "SLA On-time"], [Star, avgRating, `${who} Rating (${rated.length})`]].map(([I, v, l]: any) => (
              <div key={l} className="flex items-center gap-2 rounded-xl border bg-card p-3"><I className="h-6 w-6 shrink-0 text-primary" /><div className="min-w-0"><div className="text-lg font-bold leading-tight">{v}</div><div className="truncate text-[11px] text-muted-foreground">{l}</div></div></div>))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">{TABS.map(([k, l]) => <Button key={k} size="sm" variant={tab === k ? "default" : "outline"} className="shrink-0" onClick={() => { setParams({ tab: k }, { replace: true }); setPage(1); }}>{l}</Button>)}</div>

          {tab === "overview" && <Overview data={data} counts={counts} onQuick={(c) => newTicket({ category_key: c })} onSchedule={() => setParams({ tab: "preventive" })} />}
          {(tab === "overview" || tab === "tickets" || tab === "work") && (
            <section className="rounded-xl border bg-card p-3">
              <div className="mb-3 flex gap-2 overflow-x-auto">{[["all", `All Requests (${scope.length})`], ...Object.keys(STATE_LABEL).map(s => [s, `${STATE_LABEL[s]} (${scope.filter(t => ticketState(t) === s).length})`])].map(([k, l]) => <Button key={k} size="sm" variant={state === k ? "default" : "outline"} className="shrink-0" onClick={() => { setState(k); setPage(1); }}>{l}</Button>)}</div>
              <div className="mb-3 flex flex-wrap gap-2">
                <div className="relative min-w-[200px] flex-1"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder={`Search by ticket ID, room, ${who.toLowerCase()}, issue`} value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /></div>
                <Pick v={cat} set={v => { setCat(v); setPage(1); }} label="Category" opts={cats.map(c => [c.key, c.label])} />
                <Pick v={asg} set={v => { setAsg(v); setPage(1); }} label="Assigned To" opts={assignees.map(a => [a, a])} />
                <Pick v={prio} set={v => { setPrio(v); setPage(1); }} label="Priority" opts={PRIORITIES.map(p => [p, p[0].toUpperCase() + p.slice(1)])} />
              </div>
              {picked.length > 0 && <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg bg-muted p-2 text-sm">{picked.length} selected
                <Button size="sm" variant="outline" onClick={() => act(async () => { for (const t of tickets.filter(x => picked.includes(x.id))) await updateTicket(t, { status: "in_progress" }, "Work in progress"); setPicked([]); }, "Marked in progress")}>Mark In Progress</Button>
                <Button size="sm" variant="outline" onClick={() => act(async () => { for (const t of tickets.filter(x => picked.includes(x.id))) await updateTicket(t, { status: "done" }, "Completed"); setPicked([]); }, "Tickets closed")}>Close</Button></div>}
              <TicketTable rows={filtered.slice((page - 1) * PAGE, page * PAGE)} picked={picked} setPicked={setPicked} onView={setDetail} who={who} empty={tickets.length ? "No tickets match these filters." : "No maintenance requests yet."} />
              <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground"><span>Showing {filtered.length ? (page - 1) * PAGE + 1 : 0}–{Math.min(page * PAGE, filtered.length)} of {filtered.length}</span>
                <div className="flex gap-1"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button><Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</Button></div></div>
            </section>)}
          {tab === "preventive" && <Preventive data={data} onAdd={() => setSched({ every_days: 30, category_key: cats[0]?.key, next_due: new Date().toISOString().slice(0, 10) })} onEdit={setSched} onDone={(s) => act(() => completeSchedule(s), "Marked done; next date set")} onTicket={(s) => newTicket({ title: s.title, category_key: s.category_key, asset_id: s.asset_id, vendor_id: s.vendor_id, is_work_order: true })} />}
          {tab === "assets" && <Assets data={data} onAdd={() => setAsset({ category_key: cats[0]?.key, status: "working" })} onEdit={setAsset} onTicket={(a) => newTicket({ title: `${a.name} needs repair`, category_key: a.category_key, asset_id: a.id, room_label: a.location })} />}
          {tab === "vendors" && <Vendors data={data} onAdd={() => setVendor({ category_keys: [] })} onEdit={setVendor} />}
          {tab === "reports" && <Reports tickets={tickets} />}
        </>)}
      </div>

      {selected && data && <TicketPanel t={selected} data={data} who={who} onClose={() => setDetail(null)} act={act} />}
      {raise && data && <RaiseDialog init={raise} cats={cats} data={data} who={who} onClose={() => setRaise(null)} onSave={(v) => act(async () => { const r = await raiseTicket(hotelId, v); setRaise(null); setDetail(r.id); }, v.is_work_order ? "Work order created" : "Request raised")} />}
      {vendor && <VendorDialog v={vendor} cats={cats} onClose={() => setVendor(null)} onSave={(v) => act(async () => { await saveVendor(hotelId, v); setVendor(null); }, "Vendor saved")} />}
      {asset && data && <AssetDialog a={asset} cats={cats} vendors={data.vendors} onClose={() => setAsset(null)} onSave={(v) => act(async () => { await saveAsset(hotelId, v); setAsset(null); }, "Asset saved")} />}
      {sched && data && <ScheduleDialog s={sched} cats={cats} data={data} onClose={() => setSched(null)} onSave={(v) => act(async () => { await saveSchedule(hotelId, v); setSched(null); }, "Schedule saved")} />}
    </div>
  );
}

function Pick({ v, set, label, opts }: { v: string; set: (v: string) => void; label: string; opts: string[][] }) {
  return <Select value={v} onValueChange={set}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{label}: All</SelectItem>{opts.map(([a, b]) => <SelectItem key={a} value={a}>{b}</SelectItem>)}</SelectContent></Select>;
}

function Overview({ data, counts, onQuick, onSchedule }: { data: Data; counts: Record<string, number>; onQuick: (c: string) => void; onSchedule: () => void }) {
  const total = data.tickets.length;
  const pie = Object.keys(STATE_LABEL).map(k => ({ k, name: STATE_LABEL[k], value: counts[k] })).filter(p => p.value);
  const days = Array.from({ length: 30 }, (_, i) => new Date(Date.now() - (29 - i) * 864e5).toISOString().slice(0, 10));
  const line = days.map(d => ({ d: d.slice(8) + "/" + d.slice(5, 7), Requests: data.tickets.filter(t => t.created_at.slice(0, 10) === d).length }));
  const byCat = Object.entries(data.tickets.reduce((a: Record<string, number>, t) => ({ ...a, [t.category_key ?? "other"]: (a[t.category_key ?? "other"] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const month = new Date().toISOString().slice(0, 7);
  const pm = data.schedules.filter(s => s.next_due.slice(0, 7) === month || s.last_done?.slice(0, 7) === month);
  const pmDone = pm.filter(s => s.last_done?.slice(0, 7) === month).length;
  return (<>
    <div className="grid gap-3 lg:grid-cols-3">
      <section className="rounded-xl border bg-card p-3"><h3 className="mb-2 font-semibold">Request Status Distribution</h3>
        {total ? <div className="flex items-center gap-2"><div className="h-36 w-36 shrink-0"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="value" innerRadius={40} outerRadius={65}>{pie.map(p => <Cell key={p.k} fill={STATE_COLOR[p.k]} />)}</Pie></PieChart></ResponsiveContainer></div>
          <ul className="flex-1 space-y-1 text-xs">{Object.keys(STATE_LABEL).map(k => <li key={k} className="flex justify-between"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: STATE_COLOR[k] }} />{STATE_LABEL[k]}</span><span>{counts[k]} ({((counts[k] / total) * 100).toFixed(1)}%)</span></li>)}</ul></div>
          : <p className="py-8 text-center text-sm text-muted-foreground">No requests yet</p>}</section>
      <section className="rounded-xl border bg-card p-3"><h3 className="mb-2 font-semibold">Requests Trend (Last 30 Days)</h3>
        <div className="h-40"><ResponsiveContainer><LineChart data={line}><XAxis dataKey="d" fontSize={10} interval={5} /><YAxis fontSize={10} width={25} allowDecimals={false} /><Tooltip /><Line dataKey="Requests" stroke="hsl(var(--primary))" dot={false} /></LineChart></ResponsiveContainer></div></section>
      <section className="rounded-xl border bg-card p-3"><h3 className="mb-2 font-semibold">Top Issue Categories</h3>
        {byCat.length ? <ul className="space-y-2 text-xs">{byCat.map(([k, n]) => <li key={k} className="flex items-center gap-2"><span className="w-28 truncate">{maintCategoryLabel(k)}</span><div className="h-2 flex-1 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${(n / total) * 100}%` }} /></div><span className="w-16 text-right">{n} ({((n / total) * 100).toFixed(1)}%)</span></li>)}</ul> : <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>}</section>
    </div>
    <div className="grid gap-3 lg:grid-cols-2">
      <section className="rounded-xl border bg-card p-3"><h3 className="mb-2 font-semibold">Quick Request Actions</h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{QUICK.map(([k, l, I]) => <Button key={k} variant="outline" className="h-auto flex-col gap-1 py-3 text-[11px]" onClick={() => onQuick(k)}><I className="h-5 w-5 text-primary" />{l}</Button>)}</div></section>
      <section className="rounded-xl border bg-card p-3"><div className="mb-2 flex justify-between"><h3 className="font-semibold">Preventive Maintenance (This Month)</h3><Button size="sm" variant="link" onClick={onSchedule}>View Schedule →</Button></div>
        {pm.length ? <><div className="mb-2 h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${(pmDone / pm.length) * 100}%` }} /></div>
          <ul className="space-y-1 text-sm">{pm.slice(0, 4).map(s => <li key={s.id} className="flex justify-between"><span>{s.title}</span><span className="text-muted-foreground">{s.last_done?.slice(0, 7) === month ? "Completed" : `Scheduled – ${new Date(s.next_due).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`}</span></li>)}</ul></>
          : <p className="py-4 text-center text-sm text-muted-foreground">Nothing scheduled this month.</p>}</section>
    </div>
  </>);
}

function TicketTable({ rows, picked, setPicked, onView, who, empty }: { rows: Ticket[]; picked: string[]; setPicked: (f: (p: string[]) => string[]) => void; onView: (id: string) => void; who: string; empty: string }) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  return <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="px-2 py-2" />{["Ticket ID", "Room / Area", "Issue / Request", "Category", "Raised By", "Priority", "Assigned To", "Raised On", "Due By", "Status", ""].map(h => <th key={h} className="whitespace-nowrap px-2">{h}</th>)}</tr></thead>
    <tbody>{rows.map(t => <tr key={t.id} className="cursor-pointer border-t hover:bg-muted/40" onClick={() => onView(t.id)}>
      <td className="px-2" onClick={e => e.stopPropagation()}><Checkbox checked={picked.includes(t.id)} onCheckedChange={c => setPicked(p => c ? [...p, t.id] : p.filter(x => x !== t.id))} /></td>
      <td className="whitespace-nowrap px-2 py-2 font-medium">{t.ticket_no ?? "—"}{t.is_work_order && <Badge variant="secondary" className="ml-1">WO</Badge>}</td><td className="px-2">{t.room_label ?? "—"}</td><td className="px-2">{t.title}</td><td className="px-2"><Badge variant="secondary">{maintCategoryLabel(t.category_key)}</Badge></td>
      <td className="px-2">{t.requester_name ?? who}</td><td className="px-2">{prioBadge(t.priority)}</td><td className="px-2">{t.assignee_name ?? "Unassigned"}</td><td className="whitespace-nowrap px-2">{when(t.created_at)}</td><td className="whitespace-nowrap px-2">{when(t.due_at)}</td><td className="px-2">{stateBadge(t)}</td>
      <td className="px-2"><Eye className="h-4 w-4 text-muted-foreground" /></td></tr>)}</tbody></table></div>;
}

function TicketPanel({ t, data, who, onClose, act }: { t: Ticket; data: Data; who: string; onClose: () => void; act: (fn: () => Promise<unknown>, m: string) => void }) {
  const [assignee, setAssignee] = useState(t.assignee_name ?? ""); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { setAssignee(t.assignee_name ?? ""); }, [t.id, t.assignee_name]);
  const vendor = data.vendors.find(v => v.id === t.vendor_id); const asset = data.assets.find(a => a.id === t.asset_id);
  const hours = t.due_at ? Math.round((new Date(t.due_at).getTime() - new Date(t.created_at).getTime()) / 3600e3) : null;
  const s = ticketState(t);
  const steps = ["Request Raised", "Assigned", "Work In Progress", "Resolution & Verification", "Completed"];
  const reached = t.status === "done" ? 5 : t.status === "in_progress" ? 3 : t.assignee_name || t.vendor_id ? 2 : 1;
  const open = async (p: string) => { try { window.open(await attachmentUrl(p), "_blank"); } catch (e: any) { toast.error(e.message); } };
  return (
    <aside className="fixed inset-0 z-40 overflow-y-auto bg-background p-4 lg:static lg:z-auto lg:w-80 lg:shrink-0 lg:rounded-xl lg:border lg:bg-card">
      <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Ticket Details – {t.ticket_no}</h2><Button size="icon" variant="ghost" aria-label="Close" onClick={onClose}><X className="h-4 w-4" /></Button></div>
      <h3 className="text-lg font-bold">{t.title}</h3><p className="text-sm text-muted-foreground">{t.room_label ?? "No area"}{t.floor ? ` (Floor ${t.floor})` : ""}</p><div className="my-2">{stateBadge(t)}</div>
      <dl className="grid grid-cols-2 gap-y-1 text-sm">{[["Category", maintCategoryLabel(t.category_key)], ["Priority", prioBadge(t.priority)], ["Raised By", `${t.requester_name ?? "—"} (${t.requester_type ?? who})`], ["Assigned To", t.assignee_name ?? vendor?.name ?? "Unassigned"], ["Asset", asset?.name ?? "—"], ["Raised On", when(t.created_at)], ["Due By", when(t.due_at)], ["SLA", hours === null ? "—" : `${hours} hours (${s === "overdue" ? "Breached" : s === "completed" && t.completed_at && t.due_at && t.completed_at > t.due_at ? "Late" : "On-time"})`]].map(([a, b]: any) => <><dt key={a} className="text-muted-foreground">{a}</dt><dd className="font-medium">{b}</dd></>)}</dl>
      {t.notes && <><h4 className="mt-3 font-semibold">Description</h4><p className="rounded-lg border p-2 text-sm">{t.notes}</p></>}
      <h4 className="mt-3 font-semibold">Attachments ({t.attachments?.length ?? 0})</h4>
      <div className="flex flex-wrap gap-2">{(t.attachments ?? []).map(a => <Button key={a.path} size="sm" variant="outline" onClick={() => open(a.path)}><Paperclip className="mr-1 h-3 w-3" />{a.name.slice(0, 16)}</Button>)}
        <label className="inline-flex cursor-pointer items-center rounded-md border border-dashed px-3 py-1 text-sm"><Upload className="mr-1 h-3 w-3" />{busy ? "Uploading…" : "Add"}<input type="file" accept="image/*,video/*,application/pdf" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; setBusy(true); await act(() => uploadAttachment(t, f), "Attachment added"); setBusy(false); }} /></label></div>
      <h4 className="mt-3 font-semibold">Progress Timeline</h4>
      <ol className="space-y-1 text-sm">{steps.map((st, i) => <li key={st} className={i < reached ? "font-medium" : "text-muted-foreground"}>{i < reached ? "●" : "○"} {st}{i >= reached ? " — Pending" : ""}</li>)}</ol>
      {(t.timeline ?? []).length > 0 && <ul className="mt-2 space-y-1 border-l pl-3 text-xs">{t.timeline.map((e, i) => <li key={i}><b>{e.label}</b> <span className="text-muted-foreground">{when(e.at)}{e.note ? ` – ${e.note}` : ""}</span></li>)}</ul>}
      {t.status !== "done" && <div className="mt-4 space-y-2">
        <div className="flex gap-2"><Input placeholder="Technician name" value={assignee} onChange={e => setAssignee(e.target.value)} /><Button variant="outline" disabled={!assignee.trim() || assignee === t.assignee_name} onClick={() => act(() => updateTicket(t, { assignee_name: assignee.trim(), status: "in_progress" }, `Assigned to ${assignee.trim()}`), "Technician assigned")}>Assign</Button></div>
        <Input placeholder="Status note (optional)" value={note} onChange={e => setNote(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Select onValueChange={v => act(() => updateTicket(t, { status: v }, `${STATE_LABEL[v === "done" ? "completed" : v]}${note ? ` – ${note}` : ""}`), "Status updated")}><SelectTrigger><SelectValue placeholder="Update Status" /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem></SelectContent></Select>
          <Button onClick={() => act(() => updateTicket(t, { status: "done" }, `Ticket closed${note ? ` – ${note}` : ""}`), "Ticket closed")}><CheckCircle2 className="mr-1 h-4 w-4" />Close Ticket</Button></div></div>}
      {t.status === "done" && !t.rating && <div className="mt-4"><p className="mb-1 text-sm">Record {who.toLowerCase()} rating</p><div className="flex gap-1">{[1, 2, 3, 4, 5].map(n => <Button key={n} size="sm" variant="outline" onClick={() => act(() => updateTicket(t, { rating: n }, `Rated ${n}/5`), "Rating saved")}>{n}★</Button>)}</div></div>}
    </aside>);
}

function Preventive({ data, onAdd, onEdit, onDone, onTicket }: { data: Data; onAdd: () => void; onEdit: (s: Schedule) => void; onDone: (s: Schedule) => void; onTicket: (s: Schedule) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  return <section className="rounded-xl border bg-card p-3"><div className="mb-2 flex justify-between"><h2 className="font-semibold">Preventive Maintenance ({data.schedules.length})</h2><Button size="sm" onClick={onAdd}><Plus className="mr-1 h-4 w-4" />Schedule Maintenance</Button></div>
    {data.schedules.length ? <div className="space-y-2">{data.schedules.map(s => <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><div><b>{s.title}</b> · {maintCategoryLabel(s.category_key)}<div className="text-xs text-muted-foreground">Every {s.every_days} days · Next {s.next_due}{s.last_done ? ` · Last ${s.last_done}` : ""}{data.assets.find(a => a.id === s.asset_id) ? ` · ${data.assets.find(a => a.id === s.asset_id)!.name}` : ""}</div></div>
      <div className="flex gap-2">{s.next_due < today && <Badge variant="destructive">Due</Badge>}<Button size="sm" variant="outline" onClick={() => onTicket(s)}>Create Work Order</Button><Button size="sm" variant="outline" onClick={() => onEdit(s)}>Edit</Button><Button size="sm" onClick={() => onDone(s)}>Mark Done</Button></div></div>)}</div>
      : <p className="py-6 text-center text-sm text-muted-foreground">No preventive schedules yet.</p>}</section>;
}

function Assets({ data, onAdd, onEdit, onTicket }: { data: Data; onAdd: () => void; onEdit: (a: Asset) => void; onTicket: (a: Asset) => void }) {
  return <section className="rounded-xl border bg-card p-3"><div className="mb-2 flex justify-between"><h2 className="font-semibold">Asset Register ({data.assets.length})</h2><Button size="sm" onClick={onAdd}><Plus className="mr-1 h-4 w-4" />Add Asset</Button></div>
    {data.assets.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr>{["Asset", "Category", "Location", "Serial", "Warranty", "Status", "Open tickets", ""].map(h => <th key={h} className="px-2 py-2">{h}</th>)}</tr></thead><tbody>{data.assets.map(a => <tr key={a.id} className="border-t"><td className="px-2 py-2 font-medium">{a.name}</td><td className="px-2">{maintCategoryLabel(a.category_key)}</td><td className="px-2">{a.location ?? "—"}</td><td className="px-2">{a.serial_no ?? "—"}</td><td className="px-2">{a.warranty_until ?? "—"}</td><td className="px-2 capitalize">{a.status.replace(/_/g, " ")}</td><td className="px-2">{data.tickets.filter(t => t.asset_id === a.id && t.status !== "done").length}</td>
      <td className="whitespace-nowrap px-2"><Button size="sm" variant="ghost" onClick={() => onEdit(a)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => onTicket(a)}>Report Issue</Button></td></tr>)}</tbody></table></div>
      : <p className="py-6 text-center text-sm text-muted-foreground">No assets registered yet.</p>}</section>;
}

function Vendors({ data, onAdd, onEdit }: { data: Data; onAdd: () => void; onEdit: (v: Vendor) => void }) {
  return <section className="rounded-xl border bg-card p-3"><div className="mb-2 flex justify-between"><h2 className="font-semibold">Vendors / Service Providers ({data.vendors.length})</h2><Button size="sm" onClick={onAdd}><Plus className="mr-1 h-4 w-4" />Add Vendor</Button></div>
    {data.vendors.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{data.vendors.map(v => <button key={v.id} onClick={() => onEdit(v)} className="rounded-lg border p-3 text-left text-sm hover:border-primary"><b>{v.name}</b><div className="text-xs text-muted-foreground">{[v.phone, v.email].filter(Boolean).join(" · ") || "No contact"}</div><div className="mt-1 text-xs">{v.category_keys.map(maintCategoryLabel).join(", ") || "All categories"} · {data.tickets.filter(t => t.vendor_id === v.id).length} jobs</div></button>)}</div>
      : <p className="py-6 text-center text-sm text-muted-foreground">No service providers yet.</p>}</section>;
}

function Reports({ tickets }: { tickets: Ticket[] }) {
  const download = () => {
    const head = ["Ticket", "Title", "Area", "Category", "Priority", "Status", "Requester", "Assigned", "Raised", "Due", "Completed", "Rating"];
    const rows = tickets.map(t => [t.ticket_no, t.title, t.room_label, maintCategoryLabel(t.category_key), t.priority, STATE_LABEL[ticketState(t)], t.requester_name, t.assignee_name, t.created_at, t.due_at, t.completed_at, t.rating].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    const url = URL.createObjectURL(new Blob([[head.join(","), ...rows].join("\n")], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `maintenance-report-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  const done = tickets.filter(t => t.completed_at);
  const avgHrs = done.length ? (done.reduce((s, t) => s + (new Date(t.completed_at!).getTime() - new Date(t.created_at).getTime()), 0) / done.length / 3600e3).toFixed(1) : "—";
  return <section className="rounded-xl border bg-card p-4 text-sm"><div className="mb-3 flex justify-between"><h2 className="font-semibold">Maintenance Report</h2><Button size="sm" disabled={!tickets.length} onClick={download}><Download className="mr-1 h-4 w-4" />Generate Report (CSV)</Button></div>
    <p>Total tickets: <b>{tickets.length}</b> · Completed: <b>{done.length}</b> · Average resolution: <b>{avgHrs} hours</b> · SLA on-time: <b>{slaOnTime(tickets) ?? "—"}{slaOnTime(tickets) !== null ? "%" : ""}</b></p></section>;
}

function RaiseDialog({ init, cats, data, who, onClose, onSave }: { init: Partial<Ticket>; cats: ReturnType<typeof categoriesForModes>; data: Data; who: string; onClose: () => void; onSave: (v: Partial<Ticket>) => void }) {
  const [v, setV] = useState(init); const f = (k: keyof Ticket) => (e: any) => setV(p => ({ ...p, [k]: e.target.value }));
  return <Dialog open onOpenChange={onClose}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{init.is_work_order ? "Create work order" : "Raise maintenance request"}</DialogTitle></DialogHeader>
    <div className="grid grid-cols-2 gap-2 text-sm">
      <label className="col-span-2">Issue<Input value={v.title ?? ""} onChange={f("title")} placeholder="AC not cooling properly" /></label>
      <label>Category<Select value={v.category_key ?? undefined} onValueChange={c => setV(p => ({ ...p, category_key: c }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{cats.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent></Select></label>
      <label>Priority<Select value={v.priority} onValueChange={p => setV(x => ({ ...x, priority: p }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent></Select></label>
      <label>Room / Bed / Area<Input value={v.room_label ?? ""} onChange={f("room_label")} placeholder="A-203" /></label>
      <label>Floor<Input value={v.floor ?? ""} onChange={f("floor")} /></label>
      <label>Raised by ({who})<Input value={v.requester_name ?? ""} onChange={f("requester_name")} /></label>
      <label>Technician<Input value={v.assignee_name ?? ""} onChange={f("assignee_name")} /></label>
      <label>Vendor<Select value={v.vendor_id ?? "none"} onValueChange={x => setV(p => ({ ...p, vendor_id: x === "none" ? null : x }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{data.vendors.map(x => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select></label>
      <label>Asset<Select value={v.asset_id ?? "none"} onValueChange={x => setV(p => ({ ...p, asset_id: x === "none" ? null : x }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{data.assets.map(x => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select></label>
      <label>Schedule for (optional)<Input type="datetime-local" onChange={e => setV(p => ({ ...p, scheduled_for: e.target.value ? new Date(e.target.value).toISOString() : null }))} /></label>
      <label>Due by (default from priority SLA)<Input type="datetime-local" onChange={e => setV(p => ({ ...p, due_at: e.target.value ? new Date(e.target.value).toISOString() : null }))} /></label>
      <label className="col-span-2">Description<Textarea value={v.notes ?? ""} onChange={f("notes")} /></label>
    </div><DialogFooter><Button onClick={() => onSave(v)}>Submit</Button></DialogFooter></DialogContent></Dialog>;
}

function VendorDialog({ v: init, cats, onClose, onSave }: { v: Partial<Vendor>; cats: ReturnType<typeof categoriesForModes>; onClose: () => void; onSave: (v: Partial<Vendor>) => void }) {
  const [v, setV] = useState(init);
  return <Dialog open onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>{init.id ? "Edit vendor" : "Add vendor"}</DialogTitle></DialogHeader>
    <div className="space-y-2 text-sm"><Input placeholder="Name" value={v.name ?? ""} onChange={e => setV({ ...v, name: e.target.value })} /><Input placeholder="Phone" value={v.phone ?? ""} onChange={e => setV({ ...v, phone: e.target.value })} /><Input placeholder="Email" type="email" value={v.email ?? ""} onChange={e => setV({ ...v, email: e.target.value })} />
      <div className="flex flex-wrap gap-1">{cats.map(c => { const on = v.category_keys?.includes(c.key); return <Button key={c.key} size="sm" variant={on ? "default" : "outline"} onClick={() => setV({ ...v, category_keys: on ? v.category_keys!.filter(x => x !== c.key) : [...(v.category_keys ?? []), c.key] })}>{c.label}</Button>; })}</div></div>
    <DialogFooter><Button onClick={() => onSave(v)}>Save</Button></DialogFooter></DialogContent></Dialog>;
}

function AssetDialog({ a: init, cats, vendors, onClose, onSave }: { a: Partial<Asset>; cats: ReturnType<typeof categoriesForModes>; vendors: Vendor[]; onClose: () => void; onSave: (v: Partial<Asset>) => void }) {
  const [a, setA] = useState(init); const f = (k: keyof Asset) => (e: any) => setA(p => ({ ...p, [k]: e.target.value || null }));
  return <Dialog open onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>{init.id ? "Edit asset" : "Add asset"}</DialogTitle></DialogHeader>
    <div className="grid grid-cols-2 gap-2 text-sm"><label className="col-span-2">Name<Input value={a.name ?? ""} onChange={f("name")} /></label>
      <label>Category<Select value={a.category_key} onValueChange={c => setA(p => ({ ...p, category_key: c }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{cats.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent></Select></label>
      <label>Status<Select value={a.status} onValueChange={s => setA(p => ({ ...p, status: s }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["working", "needs_repair", "out_of_service", "retired"].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></label>
      <label>Location<Input value={a.location ?? ""} onChange={f("location")} /></label><label>Serial no.<Input value={a.serial_no ?? ""} onChange={f("serial_no")} /></label>
      <label>Installed on<Input type="date" value={a.installed_on ?? ""} onChange={f("installed_on")} /></label><label>Warranty until<Input type="date" value={a.warranty_until ?? ""} onChange={f("warranty_until")} /></label>
      <label className="col-span-2">Service vendor<Select value={a.vendor_id ?? "none"} onValueChange={x => setA(p => ({ ...p, vendor_id: x === "none" ? null : x }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{vendors.map(x => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select></label></div>
    <DialogFooter><Button onClick={() => onSave(a)}>Save</Button></DialogFooter></DialogContent></Dialog>;
}

function ScheduleDialog({ s: init, cats, data, onClose, onSave }: { s: Partial<Schedule>; cats: ReturnType<typeof categoriesForModes>; data: Data; onClose: () => void; onSave: (v: Partial<Schedule>) => void }) {
  const [s, setS] = useState(init);
  return <Dialog open onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>{init.id ? "Edit schedule" : "Schedule maintenance"}</DialogTitle></DialogHeader>
    <div className="grid grid-cols-2 gap-2 text-sm"><label className="col-span-2">Title<Input value={s.title ?? ""} onChange={e => setS({ ...s, title: e.target.value })} placeholder="Water purifier service" /></label>
      <label>Category<Select value={s.category_key} onValueChange={c => setS({ ...s, category_key: c })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{cats.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent></Select></label>
      <label>Repeat every (days)<Input type="number" min={1} value={s.every_days ?? 30} onChange={e => setS({ ...s, every_days: Number(e.target.value) })} /></label>
      <label>Next date<Input type="date" value={s.next_due ?? ""} onChange={e => setS({ ...s, next_due: e.target.value })} /></label>
      <label>Asset<Select value={s.asset_id ?? "none"} onValueChange={x => setS({ ...s, asset_id: x === "none" ? null : x })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{data.assets.map(x => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select></label>
      <label className="col-span-2">Vendor<Select value={s.vendor_id ?? "none"} onValueChange={x => setS({ ...s, vendor_id: x === "none" ? null : x })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{data.vendors.map(x => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select></label></div>
    <DialogFooter><Button disabled={!(Number(s.every_days) > 0)} onClick={() => onSave(s)}>Save</Button></DialogFooter></DialogContent></Dialog>;
}
