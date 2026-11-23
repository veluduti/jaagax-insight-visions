import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Users, LogIn, LogOut, Hourglass, UserCheck, AlertTriangle, ShieldCheck, Star, Plus, Settings2, QrCode, ScanLine, Search, Download, Loader2, X, Phone, MessageSquare, Printer, Send, CheckCircle2, Clock, Ban, FileText, Eye, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { useDashboardMode } from "@/hooks/useDashboardMode";
import { MODE_LABEL, isLongStayMode } from "@/config/dashboardModes";
import { VISITORS, STATUS_LABEL, visitMinutes, fmtDuration, isOverstay, withinHours } from "@/config/visitorModes";
import { loadVisitors, saveSettings, createVisitor, updateVisitor, findByPass, blockVisitor, unblock, type Visitor, type VisitorSettings } from "@/services/hospitality/visitorService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Data = Awaited<ReturnType<typeof loadVisitors>>;
const PAGE = 10;
const COLORS = ["hsl(265 80% 60%)", "hsl(210 85% 60%)", "hsl(142 65% 45%)", "hsl(30 90% 55%)", "hsl(220 10% 65%)", "hsl(340 75% 60%)", "hsl(180 60% 45%)"];
const TABS: [string, string][] = [["overview", "Overview"], ["logs", "Visitor Logs"], ["requests", "Requests & Approvals"], ["passes", "Passes & QR"], ["policies", "Visitor Policies"], ["blacklist", "Blacklisted"], ["reports", "Reports"]];
const DEFAULTS: Omit<VisitorSettings, "hotel_id" | "require_approval"> = { visiting_start: "08:00", visiting_end: "21:00", max_per_host: 3, max_duration_minutes: 240, require_id: false, pass_validity_hours: 6, restricted_areas: [], retention_days: 365, pass_note: null };
const dayKey = (d: string | Date) => new Date(d).toLocaleDateString("en-CA");
const t = (d: string | null) => d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const passUrl = (v: Visitor) => `${window.location.origin}/partners/visitors?pass=${v.pass_code}`;
const csv = (name: string, head: string[], rows: any[][]) => { const body = [head, ...rows].map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" })); a.download = `${name}.csv`; a.click(); };
const statusVariant = (s: string, over: boolean) => over ? "destructive" : s === "inside" ? "default" : s === "pending" ? "secondary" : s === "rejected" ? "destructive" : "outline";

export default function PartnerVisitors() {
  const { hotelId } = usePartnerHotel();
  const [hotel, setHotel] = useState<any>(null);
  const mode = useDashboardMode(hotelId ?? undefined, hotel?.business_types ?? null);
  const cfg = VISITORS[mode]; const long = isLongStayMode(mode);
  const [params, setParams] = useSearchParams(); const tab = params.get("tab") ?? "overview";
  const [data, setData] = useState<Data | null>(null); const [error, setError] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState(""); const [chip, setChip] = useState("all"); const [typeF, setTypeF] = useState("all"); const [statusF, setStatusF] = useState("all"); const [day, setDay] = useState(""); const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<string[]>([]);
  const [form, setForm] = useState<any>(null); const [scan, setScan] = useState<string | null>(null); const [dlg, setDlg] = useState<{ kind: "extend" | "note" | "block" | "reject" | "unblock"; v?: Visitor; id?: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false); const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => { if (!hotelId) return; try { setError(""); setData(await loadVisitors(hotelId, long)); } catch (e: any) { setError(e.message || "Could not load visitors"); } }, [hotelId, long]);
  useEffect(() => { setData(null); setSel(null); setPicked([]); void load(); if (hotelId) (supabase as any).from("partner_hotels").select("name,business_types").eq("id", hotelId).maybeSingle().then((r: any) => setHotel(r.data)); }, [hotelId, load]);
  useEffect(() => { if (!hotelId) return; const ch = supabase.channel(`visitors-${hotelId}`); ["hotel_visitors", "hotel_visitor_blacklist", "hotel_visitor_settings"].forEach(tb => ch.on("postgres_changes" as any, { event: "*", schema: "public", table: tb, filter: `hotel_id=eq.${hotelId}` }, () => void load())); ch.subscribe(); return () => { void supabase.removeChannel(ch); }; }, [hotelId, load]);
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(i); }, []);
  useEffect(() => { const p = params.get("pass"); if (p && hotelId) setScan(p); }, [params, hotelId]);

  const settings: VisitorSettings = useMemo(() => ({ hotel_id: hotelId ?? "", require_approval: cfg.defaultApproval, ...DEFAULTS, ...(data?.settings ?? {}) } as VisitorSettings), [data, hotelId, cfg]);
  const catLabel = (k: string) => cfg.categories.find(c => c[0] === k)?.[1] ?? k;
  const over = (v: Visitor) => isOverstay(v, settings.max_duration_minutes, now);

  const m = useMemo(() => {
    if (!data) return null; const vs = data.visitors; const td = dayKey(new Date()); const month = td.slice(0, 7);
    const monthly = vs.filter(v => dayKey(v.created_at).startsWith(month));
    const inside = vs.filter(v => v.status === "inside");
    const closed = vs.filter(v => v.checked_in_at);
    const compliant = closed.filter(v => !(v.checked_out_at && visitMinutes(v) > settings.max_duration_minutes) && !over(v) && (!settings.require_id || v.id_verified));
    const rated = vs.filter(v => v.rating);
    const hours = Array.from({ length: 13 }, (_, i) => 8 + i).map(h => ({ h: `${h % 12 || 12}${h < 12 ? "AM" : "PM"}`, "Check-In": vs.filter(v => v.checked_in_at && dayKey(v.checked_in_at) === td && new Date(v.checked_in_at).getHours() === h).length, "Check-Out": vs.filter(v => v.checked_out_at && dayKey(v.checked_out_at) === td && new Date(v.checked_out_at).getHours() === h).length }));
    const types = cfg.categories.map(([k, l]) => ({ k, l, n: monthly.filter(v => v.category === k).length })).concat(Object.entries(monthly.reduce((a: any, v) => { if (!cfg.categories.some(c => c[0] === v.category)) a[v.category] = (a[v.category] ?? 0) + 1; return a; }, {})).map(([k, n]) => ({ k, l: k, n: n as number }))).filter(x => x.n);
    return { monthly, inside, td, hours, types,
      inToday: vs.filter(v => v.checked_in_at && dayKey(v.checked_in_at) === td).length,
      outToday: vs.filter(v => v.checked_out_at && dayKey(v.checked_out_at) === td).length,
      pending: vs.filter(v => v.status === "pending").length, overN: inside.filter(over).length,
      compliance: closed.length ? Math.round((compliant.length / closed.length) * 100) : null,
      rating: rated.length ? (rated.reduce((s, v) => s + (v.rating ?? 0), 0) / rated.length).toFixed(1) : null, ratedN: rated.length };
  }, [data, settings, now, cfg]);

  const rows = useMemo(() => (data?.visitors ?? []).filter(v => {
    if (tab === "requests" && !["pending", "approved", "rejected"].includes(v.status)) return false;
    if (chip === "today" && dayKey(v.created_at) !== m?.td && (!v.checked_in_at || dayKey(v.checked_in_at) !== m?.td)) return false;
    if (chip === "inside" && v.status !== "inside") return false; if (chip === "pending" && v.status !== "pending") return false; if (chip === "overstay" && !over(v)) return false;
    if (typeF !== "all" && v.category !== typeF) return false; if (statusF !== "all" && v.status !== statusF) return false;
    if (day && dayKey(v.checked_in_at ?? v.expected_at ?? v.created_at) !== day) return false;
    return !q || `${v.visitor_code} ${v.name} ${v.phone} ${v.host_name} ${v.area}`.toLowerCase().includes(q.toLowerCase());
  }), [data, tab, chip, typeF, statusF, day, q, m]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = data?.visitors.find(v => v.id === sel) ?? null;

  const act = async (fn: () => Promise<any>, msg: string) => { setBusy(true); try { await fn(); toast.success(msg); await load(); } catch (e: any) { toast.error(e.message || "Action failed"); } finally { setBusy(false); } };
  const checkIn = (v: Visitor) => { if (!withinHours(new Date(), settings.visiting_start, settings.visiting_end)) return toast.error(`Outside visiting hours (${settings.visiting_start.slice(0, 5)}–${settings.visiting_end.slice(0, 5)})`); if (settings.require_id && !v.id_verified) return toast.error("Verify the visitor's ID before check-in"); void act(() => updateVisitor(v, { status: "inside" }, "Checked-In", v.area ?? undefined), `${v.name} checked in`); };
  const checkOut = (v: Visitor) => act(() => updateVisitor(v, { status: "checked_out" }, "Checked-Out"), `${v.name} checked out`);
  const approve = (v: Visitor) => act(() => updateVisitor(v, { status: "approved" }, "Visitor Request Approved"), "Request approved");
  const printPass = (v: Visitor) => { const svg = document.getElementById(`pass-${v.id}`)?.outerHTML ?? ""; const w = window.open("", "_blank"); if (!w) return; w.document.write(`<html><body style="font-family:sans-serif;text-align:center;padding:24px"><h2>${hotel?.name ?? ""}</h2><h3>Visitor Pass ${v.visitor_code}</h3>${svg}<p><b>${v.name}</b><br/>${catLabel(v.category)} · ${v.host_name ?? v.area ?? ""}</p><p>Valid till: ${t(v.pass_valid_until)}</p>${settings.pass_note ? `<p>${settings.pass_note}</p>` : ""}<script>print()</script></body></html>`); w.document.close(); };
  const resend = (v: Visitor) => { if (!v.phone) return toast.error("No phone number for this visitor"); window.open(`https://wa.me/${v.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}?text=${encodeURIComponent(`Your visitor pass ${v.visitor_code} for ${hotel?.name ?? "the property"}, valid till ${t(v.pass_valid_until)}: ${passUrl(v)}`)}`, "_blank"); void updateVisitor(v, {}, "Pass sent").then(load); };

  const submitForm = async () => {
    if (!form.name?.trim()) return toast.error("Enter the visitor's name");
    if (form.phone && !/^\+?[\d\s-]{8,15}$/.test(form.phone)) return toast.error("Enter a valid phone number");
    if (form.expected_out && form.expected_at && form.expected_out <= form.expected_at) return toast.error("Expected check-out must be after arrival");
    const host = data?.hosts.find(h => h.id === form.host_id);
    const needsApproval = form.entry_type === "pre_registered" ? settings.require_approval : settings.require_approval && !form.approve_now;
    if (form.check_in && !needsApproval && !withinHours(new Date(), settings.visiting_start, settings.visiting_end)) return toast.error("Outside visiting hours — save as a pre-registration instead");
    if (form.check_in && settings.require_id && !form.id_verified) return toast.error("ID verification is required before check-in");
    await act(async () => { const v = await createVisitor(hotelId!, { name: form.name.trim(), phone: form.phone || null, category: form.category, host_name: host?.name ?? (form.host_name || null), long_stay_id: host?.id ?? null, area: form.area || host?.unit || null, purpose: form.purpose || null, entry_type: form.entry_type, expected_at: form.expected_at ? new Date(form.expected_at).toISOString() : null, expected_out: form.expected_out ? new Date(form.expected_out).toISOString() : null, id_type: form.id_type || null, id_verified: !!form.id_verified }, long, needsApproval, !!form.check_in); setSel(v.id); setForm(null); }, "Visitor saved");
  };
  const runScan = async () => { if (!scan?.trim()) return; setBusy(true); try { const v = await findByPass(hotelId!, scan); if (!v) { toast.error("No pass found at this property"); return; } setSel(v.id); setScan(null); setParams(p => { p.delete("pass"); return p; }, { replace: true });
      if (v.status === "inside") checkOut(v); else if (v.status === "approved") checkIn(v); else toast.info(`Pass status: ${STATUS_LABEL[v.status]}`); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); } };
  const runDlg = async () => { if (!dlg) return; const { kind, v, text } = dlg;
    if (kind === "extend") { const mins = Number(text); if (!(mins > 0)) return toast.error("Enter minutes to extend"); const base = new Date(Math.max(Date.now(), new Date(v!.expected_out ?? v!.pass_valid_until ?? Date.now()).getTime()) + mins * 60000).toISOString(); await act(() => updateVisitor(v!, { expected_out: base, pass_valid_until: base }, "Visit Extended", `+${mins} min`), "Visit extended"); }
    if (kind === "note") { if (!text.trim()) return; await act(() => updateVisitor(v!, { notes: [v!.notes, text.trim()].filter(Boolean).join("\n") }, "Note added", text.trim()), "Note added"); }
    if (kind === "reject") await act(() => updateVisitor(v!, { status: "rejected" }, "Request Rejected", text || undefined), "Request rejected");
    if (kind === "block") { if (!text.trim()) return toast.error("Give a reason"); await act(async () => { await blockVisitor(hotelId!, v!.name, v!.phone, text.trim()); if (["pending", "approved"].includes(v!.status)) await updateVisitor(v!, { status: "cancelled" }, "Visitor Blocked", text.trim()); else await updateVisitor(v!, {}, "Visitor Blocked", text.trim()); }, "Visitor blacklisted"); }
    if (kind === "unblock") { if (!text.trim()) return toast.error("Give a reason for removal"); await act(() => unblock(dlg.id!, text.trim()), "Removed from blacklist"); }
    setDlg(null); };

  if (!hotelId) return <div className="p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>;
  const kpis: [any, any, string, string?][] = m ? [[Users, m.monthly.length, "Total Visitors (This Month)"], [LogIn, m.inToday, "Checked-In (Today)"], [LogOut, m.outToday, "Checked-Out (Today)"], [Hourglass, m.pending, "Pending Approvals"], [UserCheck, m.inside.length, "Currently Inside"], [AlertTriangle, m.overN, "Overstay Alerts", m.overN ? "text-destructive" : ""], [ShieldCheck, m.compliance === null ? "—" : `${m.compliance}%`, "Policy Compliance"], [Star, m.rating ?? "—", `Visitor Experience (${m.ratedN} ratings)`]] : [];

  return (
    <div className="flex flex-col gap-4 p-3 md:p-5 xl:flex-row">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs text-muted-foreground">{MODE_LABEL[mode]} / Visitor Management</p><h1 className="text-2xl font-bold">Visitor Management</h1>
            <p className="text-sm text-muted-foreground">Manage visitor requests, approvals, check-ins, check-outs and visitor policies{hotel?.name ? ` for ${hotel.name}` : ""}.</p></div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setForm({ category: cfg.categories[0][0], entry_type: "walk_in", check_in: true })}><Plus className="mr-1 h-4 w-4" />New Visitor Entry</Button>
            <Button variant="outline" size="sm" onClick={() => setParams({ tab: "policies" })}><Settings2 className="mr-1 h-4 w-4" />Visitor Settings</Button>
            <Button variant="outline" size="sm" onClick={() => setParams({ tab: "passes" })}><QrCode className="mr-1 h-4 w-4" />Pass Templates</Button>
            <Button size="sm" onClick={() => setScan("")}><ScanLine className="mr-1 h-4 w-4" />Scan Check-In</Button>
          </div>
        </div>
        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{error} <Button size="sm" variant="link" onClick={() => void load()}>Retry</Button></div>}
        {!data && !error ? <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-primary" /> : data && m && (<>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 2xl:grid-cols-8">
            {kpis.map(([I, v, l, c]) => <div key={l} className="flex items-center gap-2 rounded-xl border bg-card p-3"><I className={`h-6 w-6 shrink-0 text-primary ${c ?? ""}`} /><div className="min-w-0"><div className="text-lg font-bold leading-tight">{v}</div><div className="text-[11px] leading-tight text-muted-foreground">{l}</div></div></div>)}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">{TABS.map(([k, l]) => <Button key={k} size="sm" variant={tab === k ? "default" : "outline"} className="shrink-0" onClick={() => { setParams({ tab: k }, { replace: true }); setPage(1); }}>{l}{k === "requests" && m.pending ? ` (${m.pending})` : ""}</Button>)}</div>

          {tab === "overview" && <div className="grid gap-3 lg:grid-cols-3">
            <section className="rounded-xl border bg-card p-3"><h3 className="mb-2 font-semibold">Today's Visitor Flow</h3>
              <div className="h-44"><ResponsiveContainer><LineChart data={m.hours}><XAxis dataKey="h" fontSize={10} /><YAxis fontSize={10} width={24} allowDecimals={false} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Line dataKey="Check-In" stroke="hsl(var(--primary))" /><Line dataKey="Check-Out" stroke="hsl(265 60% 75%)" /></LineChart></ResponsiveContainer></div></section>
            <section className="rounded-xl border bg-card p-3"><h3 className="mb-2 font-semibold">Visitor Types (This Month)</h3>
              {m.types.length ? <div className="flex items-center gap-2"><div className="relative h-32 w-32 shrink-0"><ResponsiveContainer><PieChart><Pie data={m.types} dataKey="n" innerRadius={38} outerRadius={60}>{m.types.map((x, i) => <Cell key={x.k} fill={COLORS[i % COLORS.length]} />)}</Pie></PieChart></ResponsiveContainer><div className="absolute inset-0 grid place-items-center text-center text-xs"><div><b className="text-lg">{m.monthly.length}</b><br />Visitors</div></div></div>
                <ul className="space-y-1 text-xs">{m.types.map((x, i) => <li key={x.k} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{catLabel(x.k)} <b className="ml-auto pl-2">{x.n} ({((x.n / m.monthly.length) * 100).toFixed(1)}%)</b></li>)}</ul></div> : <p className="py-8 text-center text-sm text-muted-foreground">No visitors this month</p>}</section>
            <section className="rounded-xl border bg-card p-3"><h3 className="mb-2 font-semibold">Current On-Premise ({m.inside.length})</h3>
              {m.inside.length ? <ul className="space-y-2">{m.inside.slice(0, 5).map(v => <li key={v.id}><button className="flex w-full items-center justify-between gap-2 text-left text-sm" onClick={() => setSel(v.id)}><span className="min-w-0"><b className="block truncate">{v.name}</b><span className="text-xs text-muted-foreground">{catLabel(v.category)} · {v.area ?? v.host_name ?? "—"}</span></span><Badge variant={over(v) ? "destructive" : "secondary"}>{fmtDuration(visitMinutes(v, now))}</Badge></button></li>)}</ul> : <p className="py-8 text-center text-sm text-muted-foreground">Nobody is inside right now</p>}</section>
          </div>}

          {["overview", "logs", "requests"].includes(tab) && <section className="rounded-xl border bg-card p-3">
            <div className="mb-3 flex flex-wrap gap-2">
              {[["all", `All Visitors (${data.visitors.length})`], ["today", "Today"], ["inside", `Currently Inside (${m.inside.length})`], ["pending", `Pending (${m.pending})`], ["overstay", `Overstay (${m.overN})`]].map(([k, l]) => <Button key={k} size="sm" variant={chip === k ? "default" : "outline"} onClick={() => { setChip(k); setPage(1); }}>{l}</Button>)}
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              <div className="relative min-w-[180px] flex-1"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder={`Search name, mobile, ${cfg.host.toLowerCase()}, ID…`} value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /></div>
              <Select value={typeF} onValueChange={v => { setTypeF(v); setPage(1); }}><SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Visitor Type: All</SelectItem>{cfg.categories.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select>
              <Select value={statusF} onValueChange={v => { setStatusF(v); setPage(1); }}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Status: All</SelectItem>{Object.entries(STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select>
              <Input type="date" className="w-[150px]" value={day} onChange={e => { setDay(e.target.value); setPage(1); }} />
              <Button variant="ghost" size="sm" onClick={() => { setQ(""); setChip("all"); setTypeF("all"); setStatusF("all"); setDay(""); setPage(1); }}><RotateCcw className="mr-1 h-4 w-4" />Reset</Button>
              <Button variant="outline" size="sm" onClick={() => csv("visitors", ["Visit ID", "Name", "Phone", "Type", cfg.host, cfg.unit, "Check-In", "Check-Out", "Duration", "Status"], rows.filter(v => !picked.length || picked.includes(v.id)).map(v => [v.visitor_code, v.name, v.phone, catLabel(v.category), v.host_name, v.area, t(v.checked_in_at), t(v.checked_out_at), v.checked_in_at ? fmtDuration(visitMinutes(v, now)) : "", STATUS_LABEL[v.status]]))}><Download className="mr-1 h-4 w-4" />Export{picked.length ? ` (${picked.length})` : ""}</Button>
            </div>
            {picked.length > 0 && <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg bg-muted p-2 text-sm"><b>{picked.length} selected</b>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => act(async () => { for (const v of data.visitors.filter(x => picked.includes(x.id) && x.status === "pending")) await updateVisitor(v, { status: "approved" }, "Visitor Request Approved"); setPicked([]); }, "Approved")}>Approve pending</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => act(async () => { for (const v of data.visitors.filter(x => picked.includes(x.id) && x.status === "inside")) await updateVisitor(v, { status: "checked_out" }, "Checked-Out"); setPicked([]); }, "Checked out")}>Check out inside</Button>
              <Button size="sm" variant="ghost" onClick={() => setPicked([])}>Clear</Button></div>}
            {rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr>
              <th className="px-2 py-2"><input type="checkbox" aria-label="Select all" checked={rows.length > 0 && rows.every(v => picked.includes(v.id))} onChange={e => setPicked(e.target.checked ? rows.map(v => v.id) : [])} /></th>
              {["Visit ID", "Visitor Name", "Visitor Type", `Visiting ${cfg.host}`, cfg.unit, "Check-In", "Check-Out", "Duration", "Status", "Action"].map(h => <th key={h} className="whitespace-nowrap px-2 py-2">{h}</th>)}</tr></thead>
              <tbody>{rows.slice((page - 1) * PAGE, page * PAGE).map(v => <tr key={v.id} className={`border-t ${sel === v.id ? "bg-primary/5" : ""}`}>
                <td className="px-2"><input type="checkbox" aria-label={`Select ${v.name}`} checked={picked.includes(v.id)} onChange={e => setPicked(p => e.target.checked ? [...p, v.id] : p.filter(x => x !== v.id))} /></td>
                <td className="whitespace-nowrap px-2 py-2">{v.visitor_code}</td>
                <td className="px-2"><button className="text-left font-medium hover:underline" onClick={() => setSel(v.id)}>{v.name}</button><div className="text-xs text-muted-foreground">{v.phone ?? "—"}</div></td>
                <td className="px-2"><Badge variant="secondary">{catLabel(v.category)}</Badge></td>
                <td className="px-2">{v.host_name ?? "—"}</td><td className="px-2">{v.area ?? "—"}</td>
                <td className="whitespace-nowrap px-2">{t(v.checked_in_at)}</td><td className="whitespace-nowrap px-2">{t(v.checked_out_at)}</td>
                <td className="px-2">{v.checked_in_at ? fmtDuration(visitMinutes(v, now)) : "—"}</td>
                <td className="px-2"><Badge variant={statusVariant(v.status, over(v)) as any}>{over(v) ? "Overstay" : STATUS_LABEL[v.status]}</Badge></td>
                <td className="whitespace-nowrap px-2"><Button size="icon" variant="ghost" aria-label="View" onClick={() => setSel(v.id)}><Eye className="h-4 w-4" /></Button>
                  {v.status === "pending" && <><Button size="sm" variant="ghost" disabled={busy} onClick={() => approve(v)}>Approve</Button><Button size="sm" variant="ghost" onClick={() => setDlg({ kind: "reject", v, text: "" })}>Reject</Button></>}
                  {v.status === "approved" && <Button size="sm" variant="ghost" disabled={busy} onClick={() => checkIn(v)}>Check-In</Button>}
                  {v.status === "inside" && <Button size="sm" variant="ghost" disabled={busy} onClick={() => checkOut(v)}>Check-Out</Button>}</td></tr>)}</tbody></table></div>
              : <p className="py-8 text-center text-sm text-muted-foreground">{data.visitors.length ? "No visitors match these filters." : "No visitors recorded yet. Use New Visitor Entry to add the first one."}</p>}
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground"><span>Showing {rows.length ? (page - 1) * PAGE + 1 : 0}–{Math.min(page * PAGE, rows.length)} of {rows.length} visitors</span>
              <div className="flex gap-1"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button><span className="px-2 py-1">{page} / {pages}</span><Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</Button></div></div>
          </section>}

          {tab === "passes" && <section className="rounded-xl border bg-card p-3 space-y-3"><h2 className="font-semibold">Passes & QR</h2>
            <p className="text-sm text-muted-foreground">Every visitor gets a unique QR pass that expires {settings.pass_validity_hours} hours after arrival unless an expected check-out is set. Scanning an approved pass checks the visitor in; scanning again checks them out.</p>
            <div className="flex flex-wrap items-end gap-2"><div className="flex-1"><label className="text-xs">Text printed on every pass</label><Input value={settings.pass_note ?? ""} onChange={e => setData(d => d && { ...d, settings: { ...settings, pass_note: e.target.value } })} placeholder="e.g. Please carry a photo ID" /></div><Button disabled={busy} onClick={() => act(() => saveSettings(hotelId, { pass_note: settings.pass_note }), "Pass template saved")}>Save template</Button></div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{data.visitors.filter(v => ["approved", "inside"].includes(v.status)).map(v => <div key={v.id} className="flex items-center gap-3 rounded-lg border p-2"><QRCodeSVG value={passUrl(v)} size={64} /><div className="min-w-0 text-sm"><b className="block truncate">{v.name}</b><span className="text-xs text-muted-foreground">{v.visitor_code} · till {t(v.pass_valid_until)}</span><div><Button size="sm" variant="link" className="h-6 px-0" onClick={() => setSel(v.id)}>Open</Button></div></div></div>)}</div>
            {!data.visitors.some(v => ["approved", "inside"].includes(v.status)) && <p className="py-6 text-center text-sm text-muted-foreground">No active passes.</p>}
          </section>}

          {tab === "policies" && <Policies settings={settings} areas={cfg.areas} busy={busy} onSave={s => act(() => saveSettings(hotelId, s), "Visitor settings saved")} />}

          {tab === "blacklist" && <section className="rounded-xl border bg-card p-3"><h2 className="mb-2 font-semibold">Blacklisted Visitors</h2>
            {data.blacklist.length ? <table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr>{["Name", "Phone", "Reason", "Added", "Status", ""].map(h => <th key={h} className="px-2 py-2">{h}</th>)}</tr></thead><tbody>{data.blacklist.map(b => <tr key={b.id} className="border-t"><td className="px-2 py-2 font-medium">{b.name}</td><td className="px-2">{b.phone ?? "—"}</td><td className="px-2">{b.reason}</td><td className="px-2">{t(b.created_at)}</td><td className="px-2"><Badge variant={b.active ? "destructive" : "outline"}>{b.active ? "Blocked" : `Removed${b.removed_reason ? ` – ${b.removed_reason}` : ""}`}</Badge></td><td className="px-2">{b.active && <Button size="sm" variant="ghost" onClick={() => setDlg({ kind: "unblock", id: b.id, text: "" })}>Remove</Button>}</td></tr>)}</tbody></table> : <p className="py-8 text-center text-sm text-muted-foreground">No blacklisted visitors.</p>}</section>}

          {tab === "reports" && <section className="rounded-xl border bg-card p-3 space-y-3"><h2 className="font-semibold">Reports</h2>
            <div className="grid gap-2 sm:grid-cols-3">{[["This month", m.monthly.length], ["Repeat visitors", Object.values(data.visitors.reduce((a: any, v) => { const k = v.phone ?? v.name; a[k] = (a[k] ?? 0) + 1; return a; }, {})).filter((n: any) => n > 1).length], ["Rejected requests", data.visitors.filter(v => v.status === "rejected").length], ["Overstays (all time)", data.visitors.filter(v => v.checked_in_at && (over(v) || (v.checked_out_at && visitMinutes(v) > settings.max_duration_minutes))).length], ["ID verified", data.visitors.filter(v => v.id_verified).length], ["Blacklisted", data.blacklist.filter(b => b.active).length]].map(([l, n]) => <div key={l as string} className="rounded-lg border p-3"><div className="text-xl font-bold">{n as number}</div><div className="text-xs text-muted-foreground">{l}</div></div>)}</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => csv("visitor-log", ["Visit ID", "Name", "Phone", "Type", cfg.host, cfg.unit, "Purpose", "Entry", "Status", "Check-In", "Check-Out", "Minutes", "ID verified"], data.visitors.map(v => [v.visitor_code, v.name, v.phone, catLabel(v.category), v.host_name, v.area, v.purpose, v.entry_type, STATUS_LABEL[v.status], v.checked_in_at, v.checked_out_at, visitMinutes(v, now), v.id_verified ? "Yes" : "No"]))}><Download className="mr-1 h-4 w-4" />Full visitor log</Button>
              <Button variant="outline" size="sm" onClick={() => csv("emergency-on-premise", ["Name", "Phone", "Type", cfg.host, cfg.unit, "Checked-In"], m.inside.map(v => [v.name, v.phone, catLabel(v.category), v.host_name, v.area, v.checked_in_at]))}><AlertTriangle className="mr-1 h-4 w-4" />Emergency list (inside now)</Button>
            </div></section>}
        </>)}
      </div>

      {current && <aside className="w-full shrink-0 space-y-3 rounded-xl border bg-card p-3 xl:sticky xl:top-20 xl:w-[340px] xl:self-start">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Visitor Details – {current.visitor_code}</h2><Button size="icon" variant="ghost" aria-label="Close" onClick={() => setSel(null)}><X className="h-4 w-4" /></Button></div>
        <div className="flex items-start justify-between gap-2"><div><b className="text-lg">{current.name}</b><div className="text-sm text-muted-foreground">{current.phone ?? "No phone"}</div></div><Badge variant={statusVariant(current.status, over(current)) as any}>{over(current) ? "Overstay" : STATUS_LABEL[current.status]}</Badge></div>
        {current.phone && <div className="flex gap-2"><Button size="sm" variant="outline" asChild><a href={`tel:${current.phone}`}><Phone className="mr-1 h-3 w-3" />Call</a></Button><Button size="sm" variant="outline" asChild><a target="_blank" rel="noreferrer" href={`https://wa.me/${current.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}`}><MessageSquare className="mr-1 h-3 w-3" />Message</a></Button></div>}
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">{[["Visitor Type", catLabel(current.category)], [`Visiting ${cfg.host}`, current.host_name], [cfg.unit, current.area], ["Check-In Time", t(current.checked_in_at)], ["Expected Check-Out", t(current.expected_out)], ["Duration", current.checked_in_at ? fmtDuration(visitMinutes(current, now)) : "—"], ["ID Proof", current.id_type ? `${current.id_type}${current.id_verified ? " (Verified)" : " (Not verified)"}` : current.id_verified ? "Verified" : "—"], ["Purpose", current.purpose], ["Entry", current.entry_type === "pre_registered" ? "Pre-registered" : "Walk-in"]].map(([k, v]) => <Fragment key={k}><dt className="text-muted-foreground">{k}</dt><dd>{v || "—"}</dd></Fragment>)}</dl>
        {!current.id_verified && !["checked_out", "rejected", "cancelled"].includes(current.status) && <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => updateVisitor(current, { id_verified: true }, "ID verified"), "ID marked verified")}><CheckCircle2 className="mr-1 h-3 w-3" />Mark ID verified</Button>}
        <div className="rounded-lg border p-3"><h3 className="mb-2 font-semibold">Visitor Pass (QR)</h3><div className="flex items-center gap-3"><QRCodeSVG id={`pass-${current.id}`} value={passUrl(current)} size={96} /><div className="text-sm"><Badge>{current.visitor_code}</Badge><p className="mt-1 text-xs">Valid till: {t(current.pass_valid_until)}</p><Badge variant={current.pass_valid_until && new Date(current.pass_valid_until).getTime() < now ? "destructive" : "secondary"} className="mt-1">{current.pass_valid_until && new Date(current.pass_valid_until).getTime() < now ? "Expired" : ["approved", "inside"].includes(current.status) ? "Active" : STATUS_LABEL[current.status]}</Badge></div></div>
          <div className="mt-2 flex flex-wrap gap-1"><Button size="sm" variant="outline" onClick={() => printPass(current)}><Printer className="mr-1 h-3 w-3" />Print Pass</Button><Button size="sm" variant="outline" onClick={() => resend(current)}><Send className="mr-1 h-3 w-3" />Resend Pass</Button>{current.status === "inside" && <Button size="sm" variant="outline" disabled={busy} onClick={() => checkOut(current)}><LogOut className="mr-1 h-3 w-3" />Check-Out</Button>}</div></div>
        <div><h3 className="mb-2 font-semibold">Visit Timeline</h3><ol className="space-y-2 border-l pl-3 text-sm">{(current.timeline ?? []).map((e, i) => <li key={i}><b>{e.label}</b><div className="text-xs text-muted-foreground">{t(e.at)}{e.note ? ` · ${e.note}` : ""}</div></li>)}</ol>
          {current.notes && <p className="mt-2 whitespace-pre-wrap rounded bg-muted p-2 text-xs">{current.notes}</p>}</div>
        <div><h3 className="mb-2 font-semibold">Quick Actions</h3><div className="grid grid-cols-3 gap-2">
          {[[CheckCircle2, "Approve Request", current.status === "pending", () => approve(current)], [LogIn, "Check-In", current.status === "approved", () => checkIn(current)], [Clock, "Extend Time", ["approved", "inside"].includes(current.status), () => setDlg({ kind: "extend", v: current, text: "30" })], [LogOut, "Mark Check-Out", current.status === "inside", () => checkOut(current)], [Ban, "Block Visitor", true, () => setDlg({ kind: "block", v: current, text: "" })], [FileText, "Add Note", true, () => setDlg({ kind: "note", v: current, text: "" })]].map(([I, l, en, fn]: any) => <Button key={l} variant="outline" className="h-auto flex-col gap-1 py-2 text-[11px]" disabled={!en || busy} onClick={fn}><I className="h-4 w-4 text-primary" />{l}</Button>)}
          {current.status === "checked_out" && <div className="col-span-3 flex items-center gap-1 text-xs">Rate visit: {[1, 2, 3, 4, 5].map(n => <button key={n} aria-label={`${n} stars`} onClick={() => act(() => updateVisitor(current, { rating: n }, "Visit rated", `${n}/5`), "Rating saved")}><Star className={`h-4 w-4 ${(current.rating ?? 0) >= n ? "fill-primary text-primary" : "text-muted-foreground"}`} /></button>)}</div>}
        </div></div>
      </aside>}

      <Dialog open={!!form} onOpenChange={o => !o && setForm(null)}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>New Visitor Entry</DialogTitle></DialogHeader>{form && <div className="grid gap-2 sm:grid-cols-2">
        <div className="sm:col-span-2 flex gap-2">{[["walk_in", "Walk-in"], ["pre_registered", "Pre-register / Invite"]].map(([k, l]) => <Button key={k} size="sm" type="button" variant={form.entry_type === k ? "default" : "outline"} onClick={() => setForm({ ...form, entry_type: k, check_in: k === "walk_in" })}>{l}</Button>)}</div>
        <Input placeholder="Visitor name *" value={form.name ?? ""} onChange={e => setForm({ ...form, name: e.target.value })} maxLength={100} />
        <Input placeholder="Mobile number" value={form.phone ?? ""} onChange={e => setForm({ ...form, phone: e.target.value })} maxLength={16} />
        <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{cfg.categories.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select>
        {data?.hosts.length ? <Select value={form.host_id ?? "none"} onValueChange={v => setForm({ ...form, host_id: v === "none" ? undefined : v })}><SelectTrigger><SelectValue placeholder={`Visiting ${cfg.host}`} /></SelectTrigger><SelectContent><SelectItem value="none">No {cfg.host.toLowerCase()} (common area)</SelectItem>{data.hosts.map(h => <SelectItem key={h.id} value={h.id}>{h.name}{h.unit ? ` · ${h.unit}` : ""}</SelectItem>)}</SelectContent></Select>
          : <Input placeholder={`Visiting ${cfg.host}`} value={form.host_name ?? ""} onChange={e => setForm({ ...form, host_name: e.target.value })} />}
        <Input list="visitor-areas" placeholder={`${cfg.unit} or area`} value={form.area ?? ""} onChange={e => setForm({ ...form, area: e.target.value })} /><datalist id="visitor-areas">{cfg.areas.filter(a => !settings.restricted_areas.includes(a)).map(a => <option key={a} value={a} />)}</datalist>
        <Input placeholder="Purpose of visit" value={form.purpose ?? ""} onChange={e => setForm({ ...form, purpose: e.target.value })} maxLength={200} />
        <label className="text-xs">Expected arrival<Input type="datetime-local" value={form.expected_at ?? ""} onChange={e => setForm({ ...form, expected_at: e.target.value })} /></label>
        <label className="text-xs">Expected check-out<Input type="datetime-local" value={form.expected_out ?? ""} onChange={e => setForm({ ...form, expected_out: e.target.value })} /></label>
        <Select value={form.id_type ?? "none"} onValueChange={v => setForm({ ...form, id_type: v === "none" ? undefined : v })}><SelectTrigger><SelectValue placeholder="ID type" /></SelectTrigger><SelectContent><SelectItem value="none">No ID shown</SelectItem>{["Aadhaar", "Passport", "Driving Licence", "Voter ID", "PAN", "Company ID"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
        <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.id_verified} onCheckedChange={c => setForm({ ...form, id_verified: c })} />ID checked by staff</label>
        {form.entry_type === "walk_in" && <>{settings.require_approval && <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.approve_now} onCheckedChange={c => setForm({ ...form, approve_now: c })} />Approved by {cfg.host.toLowerCase()} now</label>}
          <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.check_in} onCheckedChange={c => setForm({ ...form, check_in: c })} />Check in immediately</label></>}
        <p className="sm:col-span-2 text-xs text-muted-foreground">Visiting hours {settings.visiting_start.slice(0, 5)}–{settings.visiting_end.slice(0, 5)} · max {settings.max_per_host} visitors per {cfg.host.toLowerCase()} · ID numbers are not stored.</p>
      </div>}<DialogFooter><Button disabled={busy} onClick={submitForm}>{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save visitor</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={scan !== null} onOpenChange={o => !o && setScan(null)}><DialogContent><DialogHeader><DialogTitle>Scan Check-In</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Scan the visitor's QR with a scanner or phone camera, or type the visitor ID (e.g. VIS-000012).</p>
        <Input autoFocus value={scan ?? ""} onChange={e => setScan(e.target.value)} onKeyDown={e => e.key === "Enter" && void runScan()} placeholder="Pass code or visitor ID" />
        <DialogFooter><Button disabled={busy || !scan?.trim()} onClick={runScan}>Verify pass</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={!!dlg} onOpenChange={o => !o && setDlg(null)}><DialogContent><DialogHeader><DialogTitle>{dlg && { extend: "Extend Visit", note: "Add Note", block: "Block Visitor", reject: "Reject Request", unblock: "Remove from Blacklist" }[dlg.kind]}</DialogTitle></DialogHeader>
        {dlg?.kind === "extend" ? <Input type="number" min={5} value={dlg.text} onChange={e => setDlg({ ...dlg, text: e.target.value })} placeholder="Minutes" /> : dlg && <Textarea value={dlg.text} onChange={e => setDlg({ ...dlg, text: e.target.value })} placeholder={dlg.kind === "note" ? "Note" : "Reason"} maxLength={500} />}
        <DialogFooter><Button disabled={busy} variant={dlg?.kind === "block" ? "destructive" : "default"} onClick={runDlg}>Confirm</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function Policies({ settings, areas, busy, onSave }: { settings: VisitorSettings; areas: string[]; busy: boolean; onSave: (s: Partial<VisitorSettings>) => void }) {
  const [s, setS] = useState(settings); useEffect(() => setS(settings), [settings]);
  const num = (k: keyof VisitorSettings, l: string) => <label className="text-xs">{l}<Input type="number" min={1} value={s[k] as number} onChange={e => setS({ ...s, [k]: Math.max(1, Number(e.target.value) || 1) })} /></label>;
  return <section className="rounded-xl border bg-card p-3 space-y-3"><h2 className="font-semibold">Visitor Policies & Settings</h2>
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="text-xs">Visiting from<Input type="time" value={s.visiting_start.slice(0, 5)} onChange={e => setS({ ...s, visiting_start: e.target.value })} /></label>
      <label className="text-xs">Visiting until<Input type="time" value={s.visiting_end.slice(0, 5)} onChange={e => setS({ ...s, visiting_end: e.target.value })} /></label>
      {num("max_per_host", "Max visitors inside per host")}{num("max_duration_minutes", "Overstay after (minutes)")}{num("pass_validity_hours", "Pass validity (hours)")}{num("retention_days", "Keep visitor records (days)")}
    </div>
    <label className="flex items-center gap-2 text-sm"><Switch checked={s.require_approval} onCheckedChange={c => setS({ ...s, require_approval: c })} />Host approval required before entry</label>
    <label className="flex items-center gap-2 text-sm"><Switch checked={s.require_id} onCheckedChange={c => setS({ ...s, require_id: c })} />ID verification required before check-in</label>
    <div><p className="mb-1 text-xs">Restricted areas (hidden from visitor entry)</p><div className="flex flex-wrap gap-2">{areas.map(a => <Button key={a} size="sm" variant={s.restricted_areas.includes(a) ? "destructive" : "outline"} onClick={() => setS({ ...s, restricted_areas: s.restricted_areas.includes(a) ? s.restricted_areas.filter(x => x !== a) : [...s.restricted_areas, a] })}>{a}</Button>)}</div></div>
    <Button disabled={busy || s.visiting_end <= s.visiting_start} onClick={() => { const { hotel_id, ...rest } = s as any; onSave(rest); }}>Save settings</Button>
    {s.visiting_end <= s.visiting_start && <p className="text-xs text-destructive">Visiting end must be after start.</p>}
  </section>;
}
