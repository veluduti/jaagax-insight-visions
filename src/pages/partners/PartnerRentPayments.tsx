import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line as RLine, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";
import { IndianRupee, Wallet, AlertCircle, ShieldCheck, PlusCircle, Users, Plus, Search, Download, Loader2, Receipt, Send, RotateCcw, SlidersHorizontal, FileText, X, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { useDashboardMode } from "@/hooks/useDashboardMode";
import { MODE_LABEL } from "@/config/dashboardModes";
import { BILLING, invoiceTotals, balanceOf, displayStatus, type Line } from "@/config/billingModes";
import { loadBilling, createInvoice, addPayment, voidInvoice, generateRentInvoices, importBookings, type Invoice, type InvPayment } from "@/services/hospitality/billingService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Data = Awaited<ReturnType<typeof loadBilling>>;
const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const today = () => new Date().toISOString().slice(0, 10);
const PAGE = 10;
const METHODS: [string, string][] = [["upi", "UPI"], ["cash", "Cash"], ["card", "Card"], ["netbanking", "Net banking"], ["bank", "Bank transfer"], ["online", "Online"]];
const TABS: [string, string][] = [["invoices", "Collections"], ["payments", "Payments"], ["outstanding", "Outstanding"], ["deposits", "Deposits"], ["adjustments", "Adjustments"], ["refunds", "Refunds"], ["statements", "Statements"]];
const STATUS_COLOR: Record<string, string> = { paid: "hsl(142 70% 42%)", partial: "hsl(38 92% 50%)", due: "hsl(217 91% 60%)", overdue: "hsl(0 84% 60%)", refunded: "hsl(270 60% 60%)", void: "hsl(var(--muted-foreground))" };
const keyOf = () => crypto.randomUUID();
const esc = (s: any) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const csv = (name: string, head: string[], rows: any[][]) => { const body = [head, ...rows].map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" })); a.download = `${name}-${today()}.csv`; a.click(); };
function printDoc(title: string, html: string) {
  const w = window.open("", "_blank"); if (!w) return toast.error("Allow pop-ups to download");
  w.document.write(`<html><head><title>${esc(title)}</title><style>body{font-family:system-ui;padding:32px;color:#111}table{width:100%;border-collapse:collapse;margin:12px 0}td,th{border-bottom:1px solid #ddd;padding:6px;text-align:left}.r{text-align:right}h1{color:#6d28d9}</style></head><body>${html}<script>setTimeout(()=>print(),300)</script></body></html>`); w.document.close();
}

export default function PartnerRentPayments() {
  const { hotelId } = usePartnerHotel();
  const [hotel, setHotel] = useState<{ name: string; business_types: string[] } | null>(null);
  const mode = useDashboardMode(hotelId ?? undefined, hotel?.business_types ?? null);
  const cfg = BILLING[mode];
  const [data, setData] = useState<Data | null>(null); const [error, setError] = useState("");
  const [params, setParams] = useSearchParams(); const tab = params.get("tab") || "invoices";
  const [q, setQ] = useState(""); const [statusF, setStatusF] = useState("all"); const [page, setPage] = useState(1);
  const [sel, setSel] = useState<string | null>(null); const [checked, setChecked] = useState<string[]>([]);
  const [raise, setRaise] = useState<{ party_name: string; party_phone: string; room_label: string; room_type: string; due_date: string; period_start: string; period_end: string; lines: Line[]; discount: number; taxPct: number; long_stay_id?: string } | null>(null);
  const [pay, setPay] = useState<{ invoice: Invoice; kind: InvPayment["kind"]; amount: number; method: string; reference: string; note: string; key: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => { if (!hotelId) return; try { setError(""); setData(await loadBilling(hotelId)); } catch (e: any) { setError(e.message || "Could not load payments"); } }, [hotelId]);
  useEffect(() => { setData(null); setSel(null); setChecked([]); void load(); if (hotelId) (supabase as any).from("partner_hotels").select("name,business_types").eq("id", hotelId).maybeSingle().then((r: any) => setHotel(r.data)); }, [hotelId, load]);
  useEffect(() => { if (!hotelId) return; const ch = supabase.channel(`billing-${hotelId}`); ["hotel_invoices", "hotel_invoice_payments"].forEach(t => ch.on("postgres_changes" as any, { event: "*", schema: "public", table: t, filter: `hotel_id=eq.${hotelId}` }, () => void load())); ch.subscribe(); return () => { void supabase.removeChannel(ch); }; }, [hotelId, load]);
  const run = async (fn: () => Promise<unknown>, msg: string, close?: () => void) => { setBusy(true); try { const r = await fn(); toast.success(typeof r === "number" ? `${msg}: ${r}` : msg); close?.(); await load(); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); } };

  const m = useMemo(() => {
    if (!data) return null; const t = today(); const live = data.invoices.filter(i => i.status !== "void");
    const st = (i: Invoice) => displayStatus(i, t);
    const sumCat = (c: string) => live.reduce((s, i) => s + (i.lines ?? []).filter(l => l.category === c).reduce((a, l) => a + Number(l.amount), 0), 0);
    const pays = data.payments.filter(p => p.kind === "payment"), refunds = data.payments.filter(p => p.kind === "refund");
    const months = [...Array(6)].map((_, k) => { const d = new Date(); d.setMonth(d.getMonth() - 5 + k); return d.toISOString().slice(0, 7); });
    const trend = months.map(mo => ({ m: mo.slice(5), Billed: live.filter(i => (i.period_start ?? i.created_at).slice(0, 7) === mo).reduce((s, i) => s + Number(i.total), 0), Collected: pays.filter(p => p.created_at.slice(0, 7) === mo).reduce((s, p) => s + Number(p.amount), 0) }));
    const statusCount = ["paid", "partial", "due", "overdue", "refunded"].map(s => ({ name: s, v: live.filter(i => st(i) === s).length })).filter(x => x.v);
    const breakdown = cfg.charges.map(([k, l]) => ({ name: l, v: sumCat(k) })).filter(x => x.v);
    const depositHeld = sumCat("deposit") - refunds.filter(r => data.invoices.find(i => i.id === r.invoice_id)?.lines?.some(l => l.category === "deposit")).reduce((s, r) => s + Number(r.amount), 0);
    return { st, live, total: live.reduce((s, i) => s + Number(i.total), 0), collected: pays.reduce((s, p) => s + Number(p.amount), 0) - refunds.reduce((s, p) => s + Number(p.amount), 0),
      outstanding: live.reduce((s, i) => s + balanceOf(i), 0), deposits: Math.max(0, depositHeld), extra: live.reduce((s, i) => s + (i.lines ?? []).filter(l => !["rent", "room", "deposit"].includes(l.category)).reduce((a, l) => a + Number(l.amount), 0), 0) + data.payments.filter(p => p.kind === "adjustment" && p.amount > 0).reduce((s, p) => s + Number(p.amount), 0),
      active: cfg.source === "booking" ? new Set(live.filter(i => i.booking_id && (i.period_end ?? "") >= t).map(i => i.booking_id)).size : data.stays.length, trend, statusCount, breakdown };
  }, [data, cfg]);

  if (!hotelId) return <div className="p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>;
  const invoices = (data?.invoices ?? []).filter(i => {
    const s = m?.st(i) ?? i.status;
    if (tab === "outstanding" && (balanceOf(i) <= 0 || i.status === "void")) return false;
    if (tab === "deposits" && !(i.lines ?? []).some(l => l.category === "deposit")) return false;
    if (statusF !== "all" && s !== statusF) return false;
    return !q || `${i.invoice_no} ${i.party_name} ${i.room_label ?? ""} ${i.room_type ?? ""}`.toLowerCase().includes(q.toLowerCase());
  });
  const kindFor: Record<string, string> = { payments: "payment", adjustments: "adjustment", refunds: "refund" };
  const txns = (data?.payments ?? []).filter(p => p.kind === kindFor[tab]).filter(p => { const i = data?.invoices.find(x => x.id === p.invoice_id); return !q || `${p.receipt_no} ${i?.party_name} ${i?.invoice_no} ${p.reference ?? ""}`.toLowerCase().includes(q.toLowerCase()); });
  const list = kindFor[tab] ? txns : invoices; const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const current = data?.invoices.find(i => i.id === sel) ?? null;
  const people = [...new Set((data?.invoices ?? []).map(i => i.party_name))];

  const remind = (i: Invoice) => {
    const text = `Hi ${i.party_name}, a reminder from ${hotel?.name ?? "us"}: invoice ${i.invoice_no} has ${inr(balanceOf(i))} due by ${i.due_date}. Thank you.`;
    if (i.party_phone) window.open(`https://wa.me/${i.party_phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}?text=${encodeURIComponent(text)}`, "_blank");
    else { void navigator.clipboard.writeText(text); toast.success("No phone saved — reminder text copied"); }
  };
  const invoiceHtml = (i: Invoice) => `<h1>${esc(hotel?.name)}</h1><h2>Invoice ${esc(i.invoice_no)}</h2><p>${esc(i.party_name)} · ${esc(i.room_label ?? "")} ${esc(i.room_type ?? "")}<br/>Period: ${esc(i.period_start ?? "")} – ${esc(i.period_end ?? "")} · Due ${esc(i.due_date)}</p><table>${(i.lines ?? []).map(l => `<tr><td>${esc(l.label)}</td><td class=r>${inr(l.amount)}</td></tr>`).join("")}<tr><td>Discount</td><td class=r>-${inr(i.discount)}</td></tr><tr><td>Tax</td><td class=r>${inr(i.tax)}</td></tr><tr><td>Adjustments</td><td class=r>${inr(i.adjustments)}</td></tr><tr><th>Total</th><th class=r>${inr(i.total)}</th></tr><tr><td>Paid</td><td class=r>${inr(i.paid_amount - i.refunded_amount)}</td></tr><tr><th>Balance due</th><th class=r>${inr(balanceOf(i))}</th></tr></table>`;
  const receipt = (p: InvPayment) => { const i = data!.invoices.find(x => x.id === p.invoice_id)!; printDoc(p.receipt_no, `<h1>${esc(hotel?.name)}</h1><h2>${p.kind === "refund" ? "Refund" : "Payment"} receipt ${esc(p.receipt_no)}</h2><p>${esc(i.party_name)} · Invoice ${esc(i.invoice_no)}</p><table><tr><td>Amount</td><td class=r>${inr(p.amount)}</td></tr><tr><td>Method</td><td class=r>${esc(p.method)}</td></tr><tr><td>Reference</td><td class=r>${esc(p.reference ?? "-")}</td></tr><tr><td>Date</td><td class=r>${new Date(p.created_at).toLocaleString("en-IN")}</td></tr><tr><td>Balance after</td><td class=r>${inr(balanceOf(i))}</td></tr></table>`); };
  const statement = (name: string) => { const inv = data!.invoices.filter(i => i.party_name === name && i.status !== "void"); const ps = data!.payments.filter(p => inv.some(i => i.id === p.invoice_id));
    printDoc(`Statement ${name}`, `<h1>${esc(hotel?.name)}</h1><h2>Statement – ${esc(name)}</h2><table><tr><th>Date</th><th>Detail</th><th class=r>Charge</th><th class=r>Payment</th></tr>${[...inv.map(i => ({ d: i.created_at, t: `Invoice ${i.invoice_no}`, c: i.total - i.adjustments, p: 0 })), ...ps.map(p => ({ d: p.created_at, t: `${p.kind} ${p.receipt_no}`, c: p.kind === "adjustment" ? p.amount : p.kind === "refund" ? p.amount : 0, p: p.kind === "payment" ? p.amount : 0 }))].sort((a, b) => a.d.localeCompare(b.d)).map(r => `<tr><td>${r.d.slice(0, 10)}</td><td>${esc(r.t)}</td><td class=r>${r.c ? inr(r.c) : ""}</td><td class=r>${r.p ? inr(r.p) : ""}</td></tr>`).join("")}<tr><th colspan=3>Balance due</th><th class=r>${inr(inv.reduce((s, i) => s + balanceOf(i), 0))}</th></tr></table>`); };
  const newRaise = (stay?: any) => setRaise({ party_name: stay?.resident_name ?? "", party_phone: stay?.resident_phone ?? "", room_label: stay?.unit_label ?? "", room_type: "", due_date: today(), period_start: today().slice(0, 8) + "01", period_end: "", lines: [{ label: cfg.charges[0][1], category: cfg.charges[0][0], amount: Number(stay?.monthly_rent) || 0 }], discount: 0, taxPct: 0, long_stay_id: stay?.id });
  const openPay = (i: Invoice, kind: InvPayment["kind"]) => setPay({ invoice: i, kind, amount: kind === "payment" ? balanceOf(i) : 0, method: kind === "adjustment" ? "adjustment" : "upi", reference: "", note: "", key: keyOf() });
  const Pill = ({ s }: { s: string }) => <span className="rounded-full px-2 py-0.5 text-[11px] font-medium capitalize" style={{ background: `${STATUS_COLOR[s]}22`, color: STATUS_COLOR[s] }}>{s}</span>;

  return (
    <div className="flex flex-col gap-4 p-3 md:p-5 xl:flex-row">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs text-muted-foreground">{MODE_LABEL[mode]} / {cfg.title}</p><h1 className="text-2xl font-bold">{cfg.title}</h1>
            <p className="text-sm text-muted-foreground">Invoices, collections, deposits, refunds and statements for {hotel?.name ?? "this property"}.</p></div>
          <div className="flex flex-wrap gap-2">
            {cfg.source !== "booking" && <Button variant="outline" size="sm" disabled={busy || !data} onClick={() => run(() => generateRentInvoices(hotelId, data!.stays, data!.invoices), "Rent invoices created")}><RefreshCw className="mr-1 h-4 w-4" />Generate Next Invoices</Button>}
            {cfg.source !== "long_stay" && <Button variant="outline" size="sm" disabled={busy || !data} onClick={() => run(() => importBookings(hotelId, data!.invoices), "Booking invoices added")}><RefreshCw className="mr-1 h-4 w-4" />Sync Bookings</Button>}
            <Button size="sm" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-primary-foreground" onClick={() => newRaise()}><Plus className="mr-1 h-4 w-4" />Raise Invoice</Button>
          </div>
        </div>
        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{error} <Button size="sm" variant="link" onClick={() => void load()}>Retry</Button></div>}
        {!data && !error ? <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-primary" /> : data && m && (<>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {[[IndianRupee, inr(m.total), cfg.revenueLabel], [Wallet, inr(m.collected), "Collected"], [AlertCircle, inr(m.outstanding), "Outstanding"], [ShieldCheck, inr(m.deposits), "Deposits Held"], [PlusCircle, inr(m.extra), "Additional Charges"], [Users, m.active, `Active ${cfg.people}`]].map(([I, v, l]: any) => (
              <div key={l} className="flex items-center gap-2 rounded-xl border bg-card p-3"><I className="h-6 w-6 shrink-0 text-primary" /><div className="min-w-0"><div className="text-lg font-bold leading-tight">{v}</div><div className="truncate text-[11px] text-muted-foreground">{l}</div></div></div>))}
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <section className="rounded-xl border bg-card p-3"><h3 className="mb-2 font-semibold">{cfg.source === "booking" ? "Revenue" : "Rent"} Collection Trend</h3>
              <div className="h-40"><ResponsiveContainer><LineChart data={m.trend}><XAxis dataKey="m" fontSize={10} /><YAxis fontSize={10} width={44} /><Tooltip formatter={(v: any) => inr(v)} /><RLine dataKey="Billed" stroke="hsl(270 60% 60%)" /><RLine dataKey="Collected" stroke="hsl(142 70% 42%)" /></LineChart></ResponsiveContainer></div></section>
            <section className="rounded-xl border bg-card p-3"><h3 className="mb-2 font-semibold">Payment Status</h3>
              {m.statusCount.length ? <div className="flex items-center gap-2"><div className="h-36 w-36 shrink-0"><ResponsiveContainer><PieChart><Pie data={m.statusCount} dataKey="v" innerRadius={38} outerRadius={62}>{m.statusCount.map(s => <Cell key={s.name} fill={STATUS_COLOR[s.name]} />)}</Pie></PieChart></ResponsiveContainer></div>
                <ul className="space-y-1 text-xs">{m.statusCount.map(s => <li key={s.name} className="flex items-center gap-1 capitalize"><span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[s.name] }} />{s.name}: <b>{s.v}</b></li>)}</ul></div> : <p className="py-10 text-center text-sm text-muted-foreground">No invoices yet</p>}</section>
            <section className="rounded-xl border bg-card p-3"><h3 className="mb-2 font-semibold">Revenue Breakdown</h3>
              {m.breakdown.length ? <div className="h-40"><ResponsiveContainer><BarChart data={m.breakdown} layout="vertical"><XAxis type="number" fontSize={10} /><YAxis type="category" dataKey="name" fontSize={10} width={90} /><Tooltip formatter={(v: any) => inr(v)} /><Bar dataKey="v" fill="hsl(270 60% 60%)" radius={4} /></BarChart></ResponsiveContainer></div> : <p className="py-10 text-center text-sm text-muted-foreground">No charges yet</p>}</section>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">{TABS.map(([k, l]) => <Button key={k} size="sm" variant={tab === k ? "default" : "outline"} className="shrink-0" onClick={() => { setParams({ tab: k }, { replace: true }); setPage(1); setChecked([]); }}>{l}</Button>)}</div>

          <section className="rounded-xl border bg-card p-3">
            <div className="mb-3 flex flex-wrap gap-2">
              <div className="relative min-w-[180px] flex-1"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder={`Search ${cfg.person.toLowerCase()}, invoice, ${cfg.unit.toLowerCase()}…`} value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /></div>
              {!kindFor[tab] && tab !== "statements" && <Select value={statusF} onValueChange={v => { setStatusF(v); setPage(1); }}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent>{["all", "due", "partial", "overdue", "paid", "refunded", "void"].map(s => <SelectItem key={s} value={s} className="capitalize">{s === "all" ? "Status: All" : s}</SelectItem>)}</SelectContent></Select>}
              {checked.length > 0 && <Button size="sm" variant="outline" onClick={() => { data.invoices.filter(i => checked.includes(i.id) && balanceOf(i) > 0).forEach(remind); }}><Send className="mr-1 h-4 w-4" />Remind {checked.length}</Button>}
              <Button variant="outline" size="sm" onClick={() => kindFor[tab] ? csv(tab, ["Receipt", "Invoice", cfg.person, "Amount", "Method", "Reference", "Date"], txns.map(p => { const i = data.invoices.find(x => x.id === p.invoice_id); return [p.receipt_no, i?.invoice_no, i?.party_name, p.amount, p.method, p.reference, p.created_at.slice(0, 10)]; })) : csv("invoices", ["Invoice", cfg.person, cfg.unit, "Type", "Period", "Amount", "Paid", "Due", "Status"], invoices.map(i => [i.invoice_no, i.party_name, i.room_label, i.room_type, `${i.period_start ?? ""} - ${i.period_end ?? ""}`, i.total, i.paid_amount - i.refunded_amount, balanceOf(i), m.st(i)]))}><Download className="mr-1 h-4 w-4" />Export</Button>
            </div>
            {tab === "statements" ? (people.length ? <ul className="divide-y">{people.filter(p => !q || p.toLowerCase().includes(q.toLowerCase())).map(p => { const inv = data.invoices.filter(i => i.party_name === p && i.status !== "void"); return <li key={p} className="flex items-center justify-between gap-2 py-2 text-sm"><span><b>{p}</b> · {inv.length} invoices · due {inr(inv.reduce((s, i) => s + balanceOf(i), 0))}</span><Button size="sm" variant="outline" onClick={() => statement(p)}><FileText className="mr-1 h-4 w-4" />Download Statement</Button></li>; })}</ul> : <p className="py-8 text-center text-sm text-muted-foreground">No statements yet</p>)
            : list.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{data.invoices.length ? "Nothing matches these filters" : cfg.source === "booking" ? "No invoices yet. Use Sync Bookings or Raise Invoice." : `No invoices yet. Use Generate Next Invoices for your ${cfg.people.toLowerCase()}.`}</p>
            : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
              {kindFor[tab] ? <><thead className="text-left text-xs text-muted-foreground"><tr><th className="p-2">Receipt</th><th>Invoice</th><th>{cfg.person}</th><th className="text-right">Amount</th><th>Method</th><th>Reference</th><th>Date</th><th /></tr></thead>
                <tbody>{(txns.slice((page - 1) * PAGE, page * PAGE)).map(p => { const i = data.invoices.find(x => x.id === p.invoice_id); return <tr key={p.id} className="cursor-pointer border-t hover:bg-muted/40" onClick={() => setSel(p.invoice_id)}><td className="p-2 font-medium">{p.receipt_no}</td><td>{i?.invoice_no}</td><td>{i?.party_name}</td><td className="text-right">{inr(p.amount)}</td><td className="capitalize">{p.method}</td><td>{p.reference ?? "—"}</td><td>{p.created_at.slice(0, 10)}</td><td><Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); receipt(p); }}><Receipt className="h-4 w-4" /></Button></td></tr>; })}</tbody></>
              : <><thead className="text-left text-xs text-muted-foreground"><tr><th className="p-2"><Checkbox checked={checked.length > 0 && checked.length === invoices.length} onCheckedChange={v => setChecked(v ? invoices.map(i => i.id) : [])} /></th><th>Invoice</th><th>{cfg.person}</th><th>{cfg.unit}</th><th>Type</th><th>Period</th><th className="text-right">Amount</th><th className="text-right">Paid</th><th className="text-right">Due</th><th>Status</th><th /></tr></thead>
                <tbody>{invoices.slice((page - 1) * PAGE, page * PAGE).map(i => <tr key={i.id} className={`cursor-pointer border-t hover:bg-muted/40 ${sel === i.id ? "bg-primary/5" : ""}`} onClick={() => setSel(i.id)}>
                  <td className="p-2" onClick={e => e.stopPropagation()}><Checkbox checked={checked.includes(i.id)} onCheckedChange={v => setChecked(c => v ? [...c, i.id] : c.filter(x => x !== i.id))} /></td>
                  <td className="font-medium">{i.invoice_no}</td><td>{i.party_name}</td><td>{i.room_label ?? "—"}</td><td>{i.room_type ?? "—"}</td><td className="text-xs">{i.period_start ?? ""}{i.period_end ? ` – ${i.period_end}` : ""}</td>
                  <td className="text-right">{inr(i.total)}</td><td className="text-right">{inr(i.paid_amount - i.refunded_amount)}</td><td className="text-right">{inr(balanceOf(i))}</td><td><Pill s={m.st(i)} /></td>
                  <td onClick={e => e.stopPropagation()}>{balanceOf(i) > 0 && i.status !== "void" && <Button size="sm" variant="outline" onClick={() => openPay(i, "payment")}>Collect</Button>}</td></tr>)}</tbody></>}
            </table></div>}
            {tab !== "statements" && pages > 1 && <div className="mt-3 flex items-center justify-end gap-2 text-xs"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>Page {page} / {pages}<Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</Button></div>}
          </section>
        </>)}
      </div>

      <aside className="w-full shrink-0 space-y-3 xl:w-[340px]">
        {current ? (() => { const hist = data!.payments.filter(p => p.invoice_id === current.id); const s = m!.st(current); return (
          <section className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between"><div><div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">{current.party_name.slice(0, 1).toUpperCase()}</div><h3 className="mt-2 font-semibold">{current.party_name}</h3><p className="text-xs text-muted-foreground">{current.party_phone ?? ""} {current.party_email ?? ""}</p></div><Button size="icon" variant="ghost" onClick={() => setSel(null)}><X className="h-4 w-4" /></Button></div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs"><div className="flex justify-between"><b>{current.invoice_no}</b><Pill s={s} /></div><div className="mt-1">{cfg.unit}: {current.room_label ?? "—"} {current.room_type ? `· ${current.room_type}` : ""}</div><div>Period: {current.period_start ?? "—"}{current.period_end ? ` – ${current.period_end}` : ""} · Due {current.due_date}</div></div>
            <ul className="space-y-1 text-sm">{(current.lines ?? []).map((l, k) => <li key={k} className="flex justify-between"><span>{l.label}</span><span>{inr(l.amount)}</span></li>)}
              {current.discount > 0 && <li className="flex justify-between text-muted-foreground"><span>Discount</span><span>-{inr(current.discount)}</span></li>}
              {current.tax > 0 && <li className="flex justify-between text-muted-foreground"><span>Tax</span><span>{inr(current.tax)}</span></li>}
              {current.adjustments !== 0 && <li className="flex justify-between text-muted-foreground"><span>Adjustments</span><span>{inr(current.adjustments)}</span></li>}
              <li className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span>{inr(current.total)}</span></li>
              <li className="flex justify-between text-emerald-600"><span>Paid</span><span>{inr(current.paid_amount - current.refunded_amount)}</span></li>
              <li className="flex justify-between font-bold text-destructive"><span>Balance due</span><span>{inr(balanceOf(current))}</span></li></ul>
            {current.status !== "void" && <div className="grid grid-cols-2 gap-2">
              <Button size="sm" disabled={balanceOf(current) <= 0} onClick={() => openPay(current, "payment")}><Wallet className="mr-1 h-4 w-4" />Record Payment</Button>
              <Button size="sm" variant="outline" disabled={balanceOf(current) <= 0} onClick={() => remind(current)}><Send className="mr-1 h-4 w-4" />Reminder</Button>
              <Button size="sm" variant="outline" onClick={() => openPay(current, "adjustment")}><SlidersHorizontal className="mr-1 h-4 w-4" />Adjustment</Button>
              <Button size="sm" variant="outline" disabled={current.paid_amount - current.refunded_amount <= 0} onClick={() => openPay(current, "refund")}><RotateCcw className="mr-1 h-4 w-4" />Refund</Button>
              <Button size="sm" variant="outline" onClick={() => printDoc(current.invoice_no, invoiceHtml(current))}><Download className="mr-1 h-4 w-4" />Invoice PDF</Button>
              <Button size="sm" variant="outline" onClick={() => statement(current.party_name)}><FileText className="mr-1 h-4 w-4" />Statement</Button>
              {current.paid_amount === 0 && <Button size="sm" variant="ghost" className="col-span-2 text-destructive" onClick={() => confirm("Cancel this invoice?") && run(() => voidInvoice(current.id), "Invoice cancelled")}><Trash2 className="mr-1 h-4 w-4" />Cancel invoice</Button>}
            </div>}
            <div><h4 className="mb-1 text-sm font-semibold">Payment history</h4>{hist.length ? <ul className="space-y-1 text-xs">{hist.map(p => <li key={p.id} className="flex items-center justify-between gap-2 rounded border p-2"><span><b className="capitalize">{p.kind}</b> {inr(p.amount)} · {p.method}<br /><span className="text-muted-foreground">{p.receipt_no} · {new Date(p.created_at).toLocaleDateString("en-IN")}{p.reference ? ` · ${p.reference}` : ""}</span></span><Button size="icon" variant="ghost" onClick={() => receipt(p)}><Receipt className="h-4 w-4" /></Button></li>)}</ul> : <p className="text-xs text-muted-foreground">No payments yet</p>}</div>
          </section>); })()
        : <section className="rounded-xl border bg-card p-4 text-sm text-muted-foreground"><h3 className="mb-1 font-semibold text-foreground">{cfg.person} payment details</h3>Select an invoice or payment to see charges, history and actions.</section>}
        {data && cfg.source !== "booking" && data.stays.length > 0 && <section className="rounded-xl border bg-card p-4"><h3 className="mb-2 font-semibold">Current {cfg.people}</h3><ul className="max-h-64 space-y-1 overflow-y-auto text-sm">{data.stays.map(s => <li key={s.id} className="flex items-center justify-between gap-2"><span className="truncate">{s.resident_name} <span className="text-xs text-muted-foreground">{s.unit_label ?? ""} · {inr(s.monthly_rent)}</span></span><Button size="sm" variant="ghost" onClick={() => newRaise(s)}>Invoice</Button></li>)}</ul></section>}
      </aside>

      {raise && (() => { const t = invoiceTotals(raise.lines, raise.discount, raise.taxPct); return (
        <Dialog open onOpenChange={() => setRaise(null)}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Raise invoice</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Input className="col-span-2" placeholder={`${cfg.person} name`} value={raise.party_name} onChange={e => setRaise({ ...raise, party_name: e.target.value })} />
            <Input placeholder="Phone" value={raise.party_phone} onChange={e => setRaise({ ...raise, party_phone: e.target.value })} />
            <Input placeholder={cfg.unit} value={raise.room_label} onChange={e => setRaise({ ...raise, room_label: e.target.value })} />
            <label className="text-xs">Period from<Input type="date" value={raise.period_start} onChange={e => setRaise({ ...raise, period_start: e.target.value })} /></label>
            <label className="text-xs">Period to<Input type="date" value={raise.period_end} onChange={e => setRaise({ ...raise, period_end: e.target.value })} /></label>
            <label className="col-span-2 text-xs">Due date<Input type="date" value={raise.due_date} onChange={e => setRaise({ ...raise, due_date: e.target.value })} /></label>
          </div>
          <div className="space-y-2">{raise.lines.map((l, k) => <div key={k} className="flex gap-2">
            <Select value={l.category} onValueChange={v => setRaise({ ...raise, lines: raise.lines.map((x, j) => j === k ? { ...x, category: v, label: cfg.charges.find(c => c[0] === v)?.[1] ?? x.label } : x) })}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent>{cfg.charges.map(([v, lab]) => <SelectItem key={v} value={v}>{lab}</SelectItem>)}</SelectContent></Select>
            <Input placeholder="Label" value={l.label} onChange={e => setRaise({ ...raise, lines: raise.lines.map((x, j) => j === k ? { ...x, label: e.target.value } : x) })} />
            <Input type="number" min={0} className="w-28" value={l.amount} onChange={e => setRaise({ ...raise, lines: raise.lines.map((x, j) => j === k ? { ...x, amount: Number(e.target.value) } : x) })} />
            <Button size="icon" variant="ghost" disabled={raise.lines.length === 1} onClick={() => setRaise({ ...raise, lines: raise.lines.filter((_, j) => j !== k) })}><X className="h-4 w-4" /></Button></div>)}
            <Button size="sm" variant="outline" onClick={() => setRaise({ ...raise, lines: [...raise.lines, { label: cfg.charges[cfg.charges.length - 1][1], category: cfg.charges[cfg.charges.length - 1][0], amount: 0 }] })}><Plus className="mr-1 h-4 w-4" />Add charge</Button></div>
          <div className="grid grid-cols-2 gap-2"><label className="text-xs">Discount (₹)<Input type="number" min={0} value={raise.discount} onChange={e => setRaise({ ...raise, discount: Number(e.target.value) })} /></label><label className="text-xs">Tax (%)<Input type="number" min={0} value={raise.taxPct} onChange={e => setRaise({ ...raise, taxPct: Number(e.target.value) })} /></label></div>
          <p className="text-right text-sm">Subtotal {inr(t.subtotal)} · Tax {inr(t.tax)} · <b>Total {inr(t.total)}</b></p>
          <DialogFooter><Button disabled={busy} onClick={() => run(async () => { if (!raise.party_name.trim()) throw new Error("Name is required"); if (t.total <= 0) throw new Error("Add at least one charge"); if (raise.period_end && raise.period_end < raise.period_start) throw new Error("Period end is before start");
            const inv = await createInvoice({ hotel_id: hotelId, kind: raise.long_stay_id ? "charges" : cfg.source === "booking" ? "booking" : "charges", party_name: raise.party_name.trim(), party_phone: raise.party_phone || null, room_label: raise.room_label || null, long_stay_id: raise.long_stay_id ?? null, period_start: raise.period_start || null, period_end: raise.period_end || null, due_date: raise.due_date, lines: raise.lines.filter(l => l.amount > 0), subtotal: t.subtotal, discount: t.discount, tax: t.tax }); setSel(inv.id); }, "Invoice raised", () => setRaise(null))}>Raise invoice</Button></DialogFooter>
        </DialogContent></Dialog>); })()}

      {pay && <Dialog open onOpenChange={() => setPay(null)}><DialogContent><DialogHeader><DialogTitle className="capitalize">{pay.kind === "payment" ? "Record payment" : pay.kind === "refund" ? "Process refund" : "Add adjustment"} · {pay.invoice.invoice_no}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">{pay.kind === "payment" ? `Balance due ${inr(balanceOf(pay.invoice))}` : pay.kind === "refund" ? `Refundable up to ${inr(pay.invoice.paid_amount - pay.invoice.refunded_amount)}` : "Positive adds a charge (e.g. late fee); negative gives a discount or waiver."}</p>
        <div className="grid grid-cols-2 gap-2"><label className="text-xs">Amount (₹)<Input type="number" value={pay.amount} onChange={e => setPay({ ...pay, amount: Number(e.target.value) })} /></label>
          {pay.kind !== "adjustment" && <label className="text-xs">Method<Select value={pay.method} onValueChange={v => setPay({ ...pay, method: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{METHODS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></label>}
          {pay.kind !== "adjustment" && <Input className="col-span-2" placeholder="Transaction reference / UTR (optional)" value={pay.reference} onChange={e => setPay({ ...pay, reference: e.target.value })} />}
          <Input className="col-span-2" placeholder="Note / reason" value={pay.note} onChange={e => setPay({ ...pay, note: e.target.value })} /></div>
        <DialogFooter><Button disabled={busy} onClick={() => run(() => { if (!pay.amount || (pay.kind !== "adjustment" && pay.amount < 0)) throw new Error("Enter a valid amount"); if (pay.kind === "adjustment" && !pay.note.trim()) throw new Error("Add a reason for the adjustment"); return addPayment({ hotel_id: hotelId, invoice_id: pay.invoice.id, kind: pay.kind, amount: pay.amount, method: pay.method, reference: pay.reference || undefined, note: pay.note || undefined, key: pay.key }); }, pay.kind === "payment" ? "Payment recorded, receipt issued" : pay.kind === "refund" ? "Refund recorded" : "Adjustment added", () => setPay(null))}>Save</Button></DialogFooter>
      </DialogContent></Dialog>}
    </div>
  );
}
