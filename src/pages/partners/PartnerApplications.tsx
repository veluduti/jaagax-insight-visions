import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Users, FileText, CalendarDays, ShieldCheck, CheckCircle2, UserCheck, Hourglass, XCircle, Plus, Upload, BarChart3, Search, Download, Loader2, X, Phone, MessageSquare, LayoutGrid, List, CheckCircle, Circle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { useDashboardMode } from "@/hooks/useDashboardMode";
import { MODE_LABEL } from "@/config/dashboardModes";
import { LEAD_SOURCES } from "@/config/residentModes";
import { applicationConfig, pipelineCounts, findDuplicate } from "@/config/applicationModes";
import { addStay } from "@/services/hospitality/residentsService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import LeadDocumentsTab from "@/components/partners/LeadDocumentsTab";

const db = supabase as any;
type Lead = any;
const PAGE = 10;
const inr = (n: any) => n ? `₹${Number(n).toLocaleString("en-IN")}` : "—";
const d = (s: string | null) => s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const dt = (s: string | null) => s ? new Date(s).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const ago = (s: string) => { const m = Math.round((Date.now() - new Date(s).getTime()) / 60000); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };
const entry = (label: string, note?: string) => ({ at: new Date().toISOString(), label, ...(note ? { note } : {}) });
const srcLabel = (k: string) => LEAD_SOURCES.find(s => s[0] === k)?.[1] ?? k;
const RANGES: [string, string, number][] = [["7", "Last 7 Days", 7], ["30", "Last 30 Days", 30], ["90", "Last 90 Days", 90], ["all", "All time", 0]];

export default function PartnerApplications() {
  const { hotelId } = usePartnerHotel();
  const [hotel, setHotel] = useState<any>(null);
  const mode = useDashboardMode(hotelId ?? undefined, hotel?.business_types ?? null);
  const cfg = applicationConfig(mode);
  const [params, setParams] = useSearchParams(); const stageF = params.get("stage") ?? "all";
  const [leads, setLeads] = useState<Lead[] | null>(null); const [rooms, setRooms] = useState<any[]>([]); const [error, setError] = useState("");
  const [view, setView] = useState<"pipeline" | "list">("pipeline"); const [range, setRange] = useState("30");
  const [q, setQ] = useState(""); const [srcF, setSrcF] = useState("all"); const [typeF, setTypeF] = useState("all"); const [sort, setSort] = useState("recent"); const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<string[]>([]); const [sel, setSel] = useState<string | null>(null); const [panelTab, setPanelTab] = useState("overview");
  const [form, setForm] = useState<any>(null); const [importText, setImportText] = useState<string | null>(null); const [sourcesOpen, setSourcesOpen] = useState(false);
  const [dlg, setDlg] = useState<{ kind: "note" | "visit" | "drop" | "convert"; l: Lead; text: string; extra?: string } | null>(null);
  const [busy, setBusy] = useState(false); const [drag, setDrag] = useState<string | null>(null);

  const load = useCallback(async () => { if (!hotelId) return; try { setError("");
    const [l, r] = await Promise.all([db.from("hotel_leads").select("*").eq("hotel_id", hotelId).order("created_at", { ascending: false }).limit(3000), db.from("hotel_rooms").select("id,room_name,room_type").eq("hotel_id", hotelId)]);
    if (l.error) throw l.error; setLeads(l.data ?? []); setRooms(r.data ?? []); } catch (e: any) { setError(e.message || "Could not load leads"); } }, [hotelId]);
  useEffect(() => { setLeads(null); setSel(null); setPicked([]); void load(); if (hotelId) db.from("partner_hotels").select("name,business_types").eq("id", hotelId).maybeSingle().then((r: any) => setHotel(r.data)); }, [hotelId, load]);
  useEffect(() => { if (!hotelId) return; const ch = supabase.channel(`apps-${hotelId}`).on("postgres_changes" as any, { event: "*", schema: "public", table: "hotel_leads", filter: `hotel_id=eq.${hotelId}` }, () => void load()).subscribe(); return () => { void supabase.removeChannel(ch); }; }, [hotelId, load]);

  const stageOf = (l: Lead) => l.stage === "lost" ? "dropped" : cfg.stages.some(s => s.key === l.stage) ? l.stage : "new";
  const stageLabel = (k: string) => cfg.stages.find(s => s.key === k)?.label ?? k;
  const inRange = useMemo(() => { const days = RANGES.find(r => r[0] === range)![2]; const from = days ? Date.now() - days * 86400000 : 0; return (leads ?? []).filter(l => new Date(l.created_at).getTime() >= from); }, [leads, range]);
  const k = useMemo(() => { const month = new Date().toISOString().slice(0, 7); return pipelineCounts(inRange.map(stageOf), (leads ?? []).filter(l => l.stage === "converted" && (l.timeline ?? []).some((e: any) => e.label === "Converted" && e.at.startsWith(month))).length); }, [inRange, leads, cfg]);
  const rows = useMemo(() => inRange.filter(l => (stageF === "all" || stageOf(l) === stageF) && (srcF === "all" || l.source === srcF) && (typeF === "all" || l.stay_type === typeF)
      && (!q || `${l.name} ${l.phone} ${l.email} ${l.application_code} ${l.preferred_unit}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => sort === "budget" ? Number(b.budget ?? 0) - Number(a.budget ?? 0) : sort === "movein" ? String(a.preferred_move_in ?? "9").localeCompare(String(b.preferred_move_in ?? "9")) : sort === "name" ? a.name.localeCompare(b.name) : b.last_activity_at.localeCompare(a.last_activity_at)),
    [inRange, stageF, srcF, typeF, q, sort, cfg]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = leads?.find(l => l.id === sel) ?? null;

  const act = async (fn: () => Promise<any>, msg: string) => { setBusy(true); try { await fn(); toast.success(msg); await load(); } catch (e: any) { toast.error(e.message || "Action failed"); } finally { setBusy(false); } };
  const upd = (l: Lead, patch: any, label: string, note?: string) => db.from("hotel_leads").update({ ...patch, timeline: [...(l.timeline ?? []), entry(label, note)] }).eq("id", l.id).then((r: any) => { if (r.error) throw r.error; });
  const move = (l: Lead, stage: string) => { if (stageOf(l) === stage) return; if (stage === "converted") return setDlg({ kind: "convert", l, text: String(l.budget ?? ""), extra: l.preferred_move_in ?? "" }); if (stage === "dropped") return setDlg({ kind: "drop", l, text: "" }); void act(() => upd(l, { stage, ...(stage === "application" ? { lead_type: "application" } : {}) }, `Moved to ${stageLabel(stage)}`), `Moved to ${stageLabel(stage)}`); };

  const save = async () => {
    const f = form; if (!f.name?.trim()) return toast.error("Enter the name"); if (!f.phone?.trim() && !f.email?.trim()) return toast.error("Add a phone number or email");
    if (f.phone && !/^\+?[\d\s-]{7,15}$/.test(f.phone)) return toast.error("Enter a valid phone number"); if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) return toast.error("Enter a valid email");
    if (f.check_out_date && f.preferred_move_in && f.check_out_date <= f.preferred_move_in) return toast.error("Departure must be after arrival");
    const dup = findDuplicate(leads ?? [], f.phone, f.email, f.id); if (dup && !f.allowDup) { toast.error(`Possible duplicate of ${dup.name} (${stageLabel(stageOf(dup))}). Save again to keep both.`); setForm({ ...f, allowDup: true }); return; }
    const { allowDup, id, timeline, created_at, application_code, last_activity_at, hotel_id, ...rest } = f;
    const payload = { ...rest, name: f.name.trim(), budget: f.budget ? Number(f.budget) : null, guests: f.guests ? Number(f.guests) : null, stage: f.stage ?? (f.lead_type === "application" ? "application" : "new") };
    await act(async () => { const { data: { user } } = await supabase.auth.getUser();
      const r = id ? await db.from("hotel_leads").update({ ...payload, timeline: [...(timeline ?? []), entry("Details updated")] }).eq("id", id) : await db.from("hotel_leads").insert({ ...payload, hotel_id: hotelId, created_by: user?.id, timeline: [entry(f.lead_type === "application" ? "Application submitted" : "Lead created")] });
      if (r.error) throw r.error; setForm(null); }, id ? "Saved" : "Added");
  };
  const runImport = async () => {
    const lines = (importText ?? "").split("\n").map(s => s.trim()).filter(Boolean); if (!lines.length) return;
    const { data: { user } } = await supabase.auth.getUser(); const existing = [...(leads ?? [])]; const out: any[] = []; let skipped = 0;
    for (const line of lines) { const [name, phone, email, source, budget] = line.split(/[,\t]/).map(s => s?.trim()); if (!name || (!phone && !email) || /^name$/i.test(name)) { skipped++; continue; }
      if (findDuplicate([...existing, ...out.map((o, i) => ({ ...o, id: `n${i}` }))], phone, email)) { skipped++; continue; }
      out.push({ hotel_id: hotelId, name, phone: phone || null, email: email || null, source: LEAD_SOURCES.some(s => s[0] === source) ? source : "other", budget: Number(budget) || null, created_by: user?.id, timeline: [entry("Imported")] }); }
    if (!out.length) return toast.error(`Nothing to import (${skipped} skipped as invalid or duplicate)`);
    await act(async () => { const r = await db.from("hotel_leads").insert(out); if (r.error) throw r.error; setImportText(null); }, `Imported ${out.length}${skipped ? `, skipped ${skipped}` : ""}`);
  };
  const runDlg = async () => { if (!dlg) return; const { kind, l, text, extra } = dlg;
    if (kind === "note") { if (!text.trim()) return; await act(() => upd(l, { notes: [l.notes, text.trim()].filter(Boolean).join("\n") }, "Note added", text.trim()), "Note added"); }
    if (kind === "visit") { if (!text) return toast.error("Pick a date and time"); await act(() => upd(l, { visit_at: new Date(text).toISOString(), stage: ["new", "contacted"].includes(stageOf(l)) && cfg.long ? "visit" : l.stage }, "Visit Scheduled", dt(new Date(text).toISOString())), "Visit scheduled"); }
    if (kind === "drop") await act(() => upd(l, { stage: "dropped", lost_reason: text || null }, "Dropped / Closed", text || undefined), "Marked dropped");
    if (kind === "convert") {
      if (cfg.long) { if (!(Number(text) > 0)) return toast.error("Enter the monthly rent"); if (!extra) return toast.error("Choose the move-in date");
        await act(async () => { const s = await addStay(hotelId!, { resident_name: l.name, resident_phone: l.phone, resident_email: l.email, monthly_rent: Number(text), move_in: extra, unit_label: l.preferred_unit, occupation: l.occupation, company: l.company, kyc_status: Object.values(l.verification ?? {}).length && Object.values(l.verification).every(v => v === "verified") ? "verified" : "pending" });
          await upd(l, { stage: "converted", converted_stay_id: s.id }, "Converted"); }, `${l.name} added as ${cfg.person.toLowerCase()}`); }
      else await act(() => upd(l, { stage: "converted" }, "Converted", "Booking confirmed"), "Marked booking confirmed");
    }
    setDlg(null); };
  const csv = (list: Lead[]) => { const head = ["Application ID", "Name", "Phone", "Email", "Type", "Source", "Stay Type", cfg.unit, "Budget", cfg.date, "Stage", "Assigned", "Last Activity"]; const body = [head, ...list.map(l => [l.application_code, l.name, l.phone, l.email, l.lead_type, srcLabel(l.source), l.stay_type, l.preferred_unit, l.budget, l.preferred_move_in, stageLabel(stageOf(l)), l.assignee_name, l.last_activity_at])].map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" })); a.download = "applications-leads.csv"; a.click(); };
  const bulk = (patch: any, label: string) => act(async () => { for (const l of (leads ?? []).filter(x => picked.includes(x.id))) await upd(l, patch, label); setPicked([]); }, `${label} (${picked.length})`);

  if (!hotelId) return <div className="p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>;
  const kpis: [any, number, string][] = [[Users, k.total, "Total Leads"], [FileText, k.inProcess, "Applications (In Process)"], [CalendarDays, k.visits, "Visit Scheduled"], [ShieldCheck, k.verification, "Under Verification"], [CheckCircle2, k.approved, cfg.long ? "Approved (Ready to Move-in)" : "Approved"], [UserCheck, k.converted, "Converted (This Month)"], [Hourglass, k.waitlist, "Waitlist"], [XCircle, k.dropped, "Dropped / Closed"]];
  const shownKpis = kpis.filter(([, , l]) => cfg.long || !["Visit Scheduled", "Under Verification"].includes(l));

  return (
    <div className="flex flex-col gap-4 p-3 md:p-5 xl:flex-row">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs text-muted-foreground">{MODE_LABEL[mode]} / {cfg.title}</p><h1 className="text-2xl font-bold">{cfg.title}</h1><p className="text-sm text-muted-foreground">{cfg.subtitle}</p></div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportText("")}><Upload className="mr-1 h-4 w-4" />Import Leads</Button>
            <Button variant="outline" size="sm" onClick={() => setSourcesOpen(true)}><BarChart3 className="mr-1 h-4 w-4" />Lead Sources</Button>
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" disabled={!picked.length}>Bulk Actions{picked.length ? ` (${picked.length})` : ""}</Button></DropdownMenuTrigger><DropdownMenuContent>
              {cfg.stages.filter(s => !["converted", "dropped"].includes(s.key)).map(s => <DropdownMenuItem key={s.key} onClick={() => bulk({ stage: s.key }, `Moved to ${s.label}`)}>Move to {s.label}</DropdownMenuItem>)}
              <DropdownMenuItem onClick={() => bulk({ stage: "dropped" }, "Dropped / Closed")}>Mark Dropped</DropdownMenuItem>
              <DropdownMenuItem onClick={() => csv((leads ?? []).filter(l => picked.includes(l.id)))}>Export selected</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
            <Button size="sm" onClick={() => setForm({ lead_type: "lead", source: "walk_in" })}><Plus className="mr-1 h-4 w-4" />Add Lead / Application</Button>
          </div>
        </div>
        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{error} <Button size="sm" variant="link" onClick={() => void load()}>Retry</Button></div>}
        {!leads && !error ? <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-primary" /> : leads && <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 2xl:grid-cols-8">{shownKpis.map(([I, v, l]) => <div key={l} className="flex items-center gap-2 rounded-xl border bg-card p-3"><I className="h-6 w-6 shrink-0 text-primary" /><div className="min-w-0"><div className="text-lg font-bold leading-tight">{v}</div><div className="text-[11px] leading-tight text-muted-foreground">{l}</div></div></div>)}</div>
          <div className="flex gap-2 overflow-x-auto pb-1">{[["all", `All (${inRange.length})`], ...cfg.stages.map(s => [s.key, `${s.label} (${inRange.filter(l => stageOf(l) === s.key).length})`])].map(([key, l]) => <Button key={key} size="sm" className="shrink-0" variant={stageF === key ? "default" : "outline"} onClick={() => { setParams(key === "all" ? {} : { stage: key }, { replace: true }); setPage(1); }}>{l}</Button>)}</div>

          <section className="rounded-xl border bg-card p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Lead & Application Pipeline</h2>
              <div className="flex gap-2"><Button size="sm" variant={view === "pipeline" ? "default" : "outline"} onClick={() => setView("pipeline")}><LayoutGrid className="mr-1 h-4 w-4" />Pipeline</Button><Button size="sm" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}><List className="mr-1 h-4 w-4" />List</Button>
                <Select value={range} onValueChange={setRange}><SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger><SelectContent>{RANGES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div></div>
            {view === "pipeline" ? <div className="flex gap-2 overflow-x-auto pb-2">{cfg.stages.filter(s => stageF === "all" || s.key === stageF).map(s => { const items = rows.filter(l => stageOf(l) === s.key); return (
              <div key={s.key} className={`w-56 shrink-0 rounded-lg p-2 ${s.tone}`} onDragOver={e => e.preventDefault()} onDrop={() => { const l = leads.find(x => x.id === drag); setDrag(null); if (l) move(l, s.key); }}>
                <h3 className="mb-2 text-sm font-semibold">{s.label} ({items.length})</h3>
                <div className="space-y-2">{items.slice(0, 6).map(l => <button key={l.id} draggable onDragStart={() => setDrag(l.id)} onClick={() => setSel(l.id)} className="block w-full rounded-md border bg-card p-2 text-left text-xs text-foreground shadow-sm">
                  <b className="block truncate text-sm">{l.name}</b>
                  <span className="text-muted-foreground">{[l.stay_type, l.budget && inr(l.budget)].filter(Boolean).join(" · ") || srcLabel(l.source)}</span>
                  <div className="mt-1 text-muted-foreground">{s.key === "visit" && l.visit_at ? `Visit: ${dt(l.visit_at)}` : s.key === "approved" && l.preferred_move_in ? `${cfg.date}: ${d(l.preferred_move_in)}` : ["application", "verification", "reservation"].includes(s.key) ? (Object.values(l.verification ?? {}).some(v => v !== "verified") || !Object.keys(l.verification ?? {}).length ? "Docs pending" : "Docs verified") : ago(l.created_at)}</div></button>)}
                  {items.length > 6 && <Button size="sm" variant="ghost" className="w-full" onClick={() => { setParams({ stage: s.key }); setView("list"); }}>+ {items.length - 6} more</Button>}
                  {!items.length && <p className="py-4 text-center text-xs opacity-70">Drop leads here</p>}</div></div>); })}</div> : null}
          </section>

          <section className="rounded-xl border bg-card p-3"><h2 className="mb-2 font-semibold">{cfg.title} – Detailed List</h2>
            <div className="mb-3 flex flex-wrap gap-2">
              <div className="relative min-w-[180px] flex-1"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Search by name, mobile, email, ID…" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /></div>
              <Select value={srcF} onValueChange={v => { setSrcF(v); setPage(1); }}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Lead Source: All</SelectItem>{LEAD_SOURCES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
              <Select value={typeF} onValueChange={v => { setTypeF(v); setPage(1); }}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Stay Type: All</SelectItem>{cfg.stayTypes.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
              <Select value={sort} onValueChange={setSort}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="recent">Sort: Last activity</SelectItem><SelectItem value="budget">Sort: Budget</SelectItem><SelectItem value="movein">Sort: {cfg.date}</SelectItem><SelectItem value="name">Sort: Name</SelectItem></SelectContent></Select>
              <Button variant="outline" size="sm" onClick={() => csv(rows)}><Download className="mr-1 h-4 w-4" />Export</Button>
            </div>
            {rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr>
              <th className="px-2 py-2"><input type="checkbox" aria-label="Select all" checked={rows.every(l => picked.includes(l.id))} onChange={e => setPicked(e.target.checked ? rows.map(l => l.id) : [])} /></th>
              {["Name", "Type", "Lead Source", cfg.unit, "Budget", cfg.date, "Status", "Assigned To", "Last Activity", ""].map(h => <th key={h} className="whitespace-nowrap px-2 py-2">{h}</th>)}</tr></thead>
              <tbody>{rows.slice((page - 1) * PAGE, page * PAGE).map(l => <tr key={l.id} className={`border-t ${sel === l.id ? "bg-primary/5" : ""}`}>
                <td className="px-2"><input type="checkbox" aria-label={`Select ${l.name}`} checked={picked.includes(l.id)} onChange={e => setPicked(p => e.target.checked ? [...p, l.id] : p.filter(x => x !== l.id))} /></td>
                <td className="px-2 py-2"><button className="text-left font-medium hover:underline" onClick={() => setSel(l.id)}>{l.name}</button><div className="text-xs text-muted-foreground">{l.phone ?? l.email}</div></td>
                <td className="px-2"><Badge variant={l.lead_type === "application" ? "default" : "secondary"}>{l.lead_type === "application" ? "Application" : "Lead"}</Badge></td>
                <td className="px-2">{srcLabel(l.source)}</td><td className="px-2">{[l.stay_type, l.preferred_unit].filter(Boolean).join(" · ") || "—"}</td><td className="px-2">{inr(l.budget)}</td><td className="whitespace-nowrap px-2">{d(l.preferred_move_in)}</td>
                <td className="px-2"><span className={`rounded px-2 py-0.5 text-xs ${cfg.stages.find(s => s.key === stageOf(l))?.tone}`}>{stageLabel(stageOf(l))}</span></td>
                <td className="px-2">{l.assignee_name ?? "—"}</td><td className="whitespace-nowrap px-2 text-xs">{l.timeline?.at(-1)?.label}<div className="text-muted-foreground">{dt(l.last_activity_at)}</div></td>
                <td className="whitespace-nowrap px-2">{l.phone && <Button size="icon" variant="ghost" asChild aria-label="WhatsApp"><a target="_blank" rel="noreferrer" href={`https://wa.me/${l.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}`}><MessageSquare className="h-4 w-4" /></a></Button>}<Button size="sm" variant="ghost" onClick={() => setSel(l.id)}>View</Button></td></tr>)}</tbody></table></div>
              : <p className="py-8 text-center text-sm text-muted-foreground">{leads.length ? "No leads match these filters." : "No leads yet. Add your first lead or import a list."}</p>}
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground"><span>Showing {rows.length ? (page - 1) * PAGE + 1 : 0}–{Math.min(page * PAGE, rows.length)} of {rows.length} records</span>
              <div className="flex gap-1"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button><span className="px-2 py-1">{page} / {pages}</span><Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</Button></div></div>
          </section>
        </>}
      </div>

      {current && <aside className="w-full shrink-0 space-y-3 rounded-xl border bg-card p-3 xl:sticky xl:top-20 xl:w-[360px] xl:self-start">
        <div className="flex items-start justify-between gap-2"><div><div className="flex flex-wrap items-center gap-2"><b className="text-lg">{current.name}</b><span className={`rounded px-2 py-0.5 text-xs ${cfg.stages.find(s => s.key === stageOf(current))?.tone}`}>{stageLabel(stageOf(current))}</span></div><p className="text-xs text-muted-foreground">{current.application_code ? `Application ID: ${current.application_code}` : `Lead · ${ago(current.created_at)}`}</p></div>
          <div className="flex">{current.phone && <Button size="icon" variant="ghost" asChild aria-label="Call"><a href={`tel:${current.phone}`}><Phone className="h-4 w-4" /></a></Button>}<Button size="icon" variant="ghost" aria-label="Close" onClick={() => setSel(null)}><X className="h-4 w-4" /></Button></div></div>
        <div className="flex gap-1 overflow-x-auto">{["overview", "documents", "visits", "notes", "activity"].map(t => <Button key={t} size="sm" variant={panelTab === t ? "default" : "ghost"} className="capitalize" onClick={() => setPanelTab(t)}>{t}</Button>)}</div>
        {panelTab === "overview" && <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">{[["Property", hotel?.name], ["Stay Type", current.stay_type], [cfg.unit, current.preferred_unit], ["Budget", inr(current.budget)], [cfg.date, d(current.preferred_move_in)], ...(!cfg.long ? [["Check-out", d(current.check_out_date)], ["Guests", current.guests]] : []), ["Mobile", current.phone], ["Email", current.email], ["Occupation", current.occupation], ["Company", current.company], ["Source", srcLabel(current.source)], ["Assigned To", current.assignee_name], ["Interest", current.interest], ["Created", dt(current.created_at)]].map(([kk, v]) => <Fragment key={kk as string}><dt className="text-muted-foreground">{kk}</dt><dd>{v || "—"}</dd></Fragment>)}</dl>}
        {panelTab === "documents" && <LeadDocumentsTab key={current.id} hotelId={hotelId} leadId={current.id} categories={cfg.docs} onChanged={load} />}
        {panelTab === "visits" && <div className="space-y-2 text-sm"><p>Visit scheduled: <b>{dt(current.visit_at)}</b></p><p>Follow-up: <b>{dt(current.follow_up_at)}</b></p>
          <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setDlg({ kind: "visit", l: current, text: "" })}>{current.visit_at ? "Reschedule" : "Schedule Visit"}</Button>{current.visit_at && <Button size="sm" disabled={busy} onClick={() => act(() => upd(current, { stage: cfg.long ? "application" : current.stage }, "Visited"), "Marked as visited")}>Mark as Visited</Button>}</div></div>}
        {panelTab === "notes" && <div className="space-y-2"><p className="whitespace-pre-wrap rounded bg-muted p-2 text-sm">{current.notes || "No notes yet."}</p><Button size="sm" variant="outline" onClick={() => setDlg({ kind: "note", l: current, text: "" })}>Add Note</Button></div>}
        {panelTab === "activity" && <ol className="space-y-2 border-l pl-3 text-sm">{[...(current.timeline ?? [])].reverse().map((e: any, i: number) => <li key={i}><b>{e.label}</b><div className="text-xs text-muted-foreground">{dt(e.at)}{e.note ? ` · ${e.note}` : ""}</div></li>)}</ol>}
        <div><h3 className="mb-2 font-semibold">Next Actions</h3><div className="grid gap-2">
          {!["approved", "converted", "dropped"].includes(stageOf(current)) && <Button size="sm" variant="outline" disabled={busy} onClick={() => move(current, "approved")}><CheckCircle2 className="mr-1 h-4 w-4" />Approve</Button>}
          {stageOf(current) !== "converted" && <Button size="sm" disabled={busy} onClick={() => move(current, "converted")}><UserCheck className="mr-1 h-4 w-4" />{cfg.convertLabel}</Button>}
          {cfg.long && !["verification", "converted"].includes(stageOf(current)) && <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => upd(current, { stage: "verification", lead_type: "application" }, "Requested documents"), "Moved to verification")}><FileText className="mr-1 h-4 w-4" />Request Documents</Button>}
          <Button size="sm" variant="outline" onClick={() => setDlg({ kind: "visit", l: current, text: "" })}><CalendarDays className="mr-1 h-4 w-4" />Schedule Visit</Button>
          <Button size="sm" variant="outline" onClick={() => setForm({ ...current })}>Edit Details</Button>
          {stageOf(current) !== "waitlist" && stageOf(current) !== "converted" && <Button size="sm" variant="outline" disabled={busy} onClick={() => move(current, "waitlist")}><Hourglass className="mr-1 h-4 w-4" />Add to Waitlist</Button>}
          {stageOf(current) !== "dropped" && <Button size="sm" variant="outline" className="text-destructive" onClick={() => setDlg({ kind: "drop", l: current, text: "" })}><XCircle className="mr-1 h-4 w-4" />Reject / Drop</Button>}
          {current.stage === "dropped" && <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => { if (confirm("Delete this lead permanently?")) void act(async () => { const r = await db.from("hotel_leads").delete().eq("id", current.id); if (r.error) throw r.error; setSel(null); }, "Deleted"); }}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>}
        </div></div>
      </aside>}

      <Dialog open={!!form} onOpenChange={o => !o && setForm(null)}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{form?.id ? "Edit Details" : "Add Lead / Application"}</DialogTitle></DialogHeader>{form && <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex gap-2 sm:col-span-2">{[["lead", "Lead / Enquiry"], ["application", "Application"]].map(([v, l]) => <Button key={v} size="sm" type="button" variant={form.lead_type === v ? "default" : "outline"} onClick={() => setForm({ ...form, lead_type: v })}>{l}</Button>)}</div>
        <Input placeholder="Full name *" maxLength={100} value={form.name ?? ""} onChange={e => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Mobile" maxLength={16} value={form.phone ?? ""} onChange={e => setForm({ ...form, phone: e.target.value })} />
        <Input placeholder="Email" maxLength={150} value={form.email ?? ""} onChange={e => setForm({ ...form, email: e.target.value })} />
        <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}><SelectTrigger><SelectValue placeholder="Lead source" /></SelectTrigger><SelectContent>{LEAD_SOURCES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
        <Select value={form.stay_type ?? ""} onValueChange={v => setForm({ ...form, stay_type: v })}><SelectTrigger><SelectValue placeholder="Stay type" /></SelectTrigger><SelectContent>{cfg.stayTypes.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
        <Input list="app-rooms" placeholder={cfg.unit} value={form.preferred_unit ?? ""} onChange={e => setForm({ ...form, preferred_unit: e.target.value })} /><datalist id="app-rooms">{rooms.map(r => <option key={r.id} value={r.room_name ?? r.room_type} />)}</datalist>
        <Input type="number" min={0} placeholder={cfg.budget} value={form.budget ?? ""} onChange={e => setForm({ ...form, budget: e.target.value })} />
        <label className="text-xs">{cfg.date}<Input type="date" value={form.preferred_move_in ?? ""} onChange={e => setForm({ ...form, preferred_move_in: e.target.value })} /></label>
        {!cfg.long && <><label className="text-xs">Check-out<Input type="date" value={form.check_out_date ?? ""} onChange={e => setForm({ ...form, check_out_date: e.target.value })} /></label><Input type="number" min={1} placeholder="Guests" value={form.guests ?? ""} onChange={e => setForm({ ...form, guests: e.target.value })} /></>}
        <Input placeholder="Occupation" value={form.occupation ?? ""} onChange={e => setForm({ ...form, occupation: e.target.value })} />
        <Input placeholder="Company / College" value={form.company ?? ""} onChange={e => setForm({ ...form, company: e.target.value })} />
        <Input placeholder="Assigned to (staff name)" value={form.assignee_name ?? ""} onChange={e => setForm({ ...form, assignee_name: e.target.value })} />
        <label className="text-xs">Follow-up<Input type="datetime-local" value={form.follow_up_at ? String(form.follow_up_at).slice(0, 16) : ""} onChange={e => setForm({ ...form, follow_up_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>
        <Textarea className="sm:col-span-2" placeholder="Requirements / interest" maxLength={500} value={form.interest ?? ""} onChange={e => setForm({ ...form, interest: e.target.value })} />
      </div>}<DialogFooter><Button disabled={busy} onClick={save}>{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{form?.allowDup ? "Save anyway" : "Save"}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={importText !== null} onOpenChange={o => !o && setImportText(null)}><DialogContent><DialogHeader><DialogTitle>Import Leads</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Paste one lead per line: <b>name, phone, email, source, budget</b>. Rows matching an existing phone or email are skipped.</p>
        <Textarea rows={8} value={importText ?? ""} onChange={e => setImportText(e.target.value)} placeholder="Ravi Kumar, 9876543210, ravi@mail.com, website, 12000" />
        <DialogFooter><Button disabled={busy} onClick={runImport}>Import</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={sourcesOpen} onOpenChange={setSourcesOpen}><DialogContent><DialogHeader><DialogTitle>Lead Sources</DialogTitle></DialogHeader>
        <table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1">Source</th><th>Leads</th><th>Converted</th><th>Rate</th></tr></thead><tbody>{LEAD_SOURCES.map(([v, l]) => { const all = inRange.filter(x => x.source === v); const c = all.filter(x => x.stage === "converted").length; return all.length ? <tr key={v} className="border-t"><td className="py-1">{l}</td><td>{all.length}</td><td>{c}</td><td>{Math.round((c / all.length) * 100)}%</td></tr> : null; })}</tbody></table>
        {!inRange.length && <p className="text-center text-sm text-muted-foreground">No leads in this period.</p>}</DialogContent></Dialog>

      <Dialog open={!!dlg} onOpenChange={o => !o && setDlg(null)}><DialogContent><DialogHeader><DialogTitle>{dlg && { note: "Add Note", visit: "Schedule Visit", drop: "Reject / Drop", convert: cfg.convertLabel }[dlg.kind]}</DialogTitle></DialogHeader>
        {dlg?.kind === "visit" && <Input type="datetime-local" value={dlg.text} onChange={e => setDlg({ ...dlg, text: e.target.value })} />}
        {(dlg?.kind === "note" || dlg?.kind === "drop") && <Textarea maxLength={500} placeholder={dlg.kind === "drop" ? "Reason (optional)" : "Note"} value={dlg.text} onChange={e => setDlg({ ...dlg, text: e.target.value })} />}
        {dlg?.kind === "convert" && (cfg.long ? <div className="grid gap-2"><label className="text-xs">Monthly rent (₹)<Input type="number" min={1} value={dlg.text} onChange={e => setDlg({ ...dlg, text: e.target.value })} /></label><label className="text-xs">Move-in date<Input type="date" value={dlg.extra} onChange={e => setDlg({ ...dlg, extra: e.target.value })} /></label><p className="text-xs text-muted-foreground">This adds {dlg.l.name} to {cfg.person}s, ready for room/bed assignment and rent invoices.</p></div>
          : <p className="text-sm text-muted-foreground">Create the reservation in Reservations, then confirm here to close this enquiry as booked.</p>)}
        <DialogFooter><Button disabled={busy} variant={dlg?.kind === "drop" ? "destructive" : "default"} onClick={runDlg}>Confirm</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
