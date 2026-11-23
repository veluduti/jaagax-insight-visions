import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, BarChart, Bar, CartesianGrid } from "recharts";
import { Package, CheckCircle2, AlertTriangle, XCircle, ShoppingCart, FileText, Truck, BarChart3, Plus, Download, Search, Eye, Pencil, Trash2, X, Loader2, Bell, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { useDashboardMode } from "@/hooks/useDashboardMode";
import { MODE_LABEL, modesForTypes } from "@/config/dashboardModes";
import { categoriesForModes, categoryLabel, stockStatus, SUPPLY_CATEGORIES } from "@/config/supplyCategories";
import { loadSupplies, saveItem, deleteItem, recordMovement, saveSupplier, createPurchaseOrder, setPoStatus, receivePurchaseOrder, type SupplyItem, type Supplier, type Movement, type PurchaseOrder } from "@/services/hospitality/suppliesService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Data = Awaited<ReturnType<typeof loadSupplies>>;
const TABS = [["overview", "Overview"], ["register", "Stock Register"], ["orders", "Purchase Orders"], ["grn", "Goods Receipt (GRN)"], ["usage", "Usage & Consumption"], ["alerts", "Reorder & Alerts"], ["suppliers", "Suppliers"]] as const;
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const day = (d: string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const PAGE = 10;
const statusBadge = (i: SupplyItem) => { const s = stockStatus(i); return <Badge variant="outline" className={s === "healthy" ? "border-primary/40 bg-primary/10 text-primary" : s === "low" ? "border-accent bg-accent/30" : "border-destructive/40 bg-destructive/10 text-destructive"}>{s === "healthy" ? "Healthy" : s === "low" ? "Low Stock" : "Out of Stock"}</Badge>; };

export default function PartnerSupplies() {
  const { hotelId } = usePartnerHotel();
  const [types, setTypes] = useState<string[] | null>(null);
  const mode = useDashboardMode(hotelId ?? undefined, types);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "overview";
  const [q, setQ] = useState(""); const [cat, setCat] = useState("all"); const [st, setSt] = useState("all"); const [loc, setLoc] = useState("all"); const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Partial<SupplyItem> | null>(null);
  const [move, setMove] = useState<{ kind: Movement["kind"]; itemId?: string } | null>(null);
  const [po, setPo] = useState<"requested" | "ordered" | null>(null);
  const [sup, setSup] = useState<Partial<Supplier> | null>(null);

  const load = useCallback(async () => {
    if (!hotelId) return;
    try { setError(""); setData(await loadSupplies(hotelId)); } catch (e: any) { setError(e.message || "Could not load inventory"); }
  }, [hotelId]);
  useEffect(() => { setData(null); setDetail(null); setPage(1); void load(); if (hotelId) (supabase as any).from("partner_hotels").select("business_types").eq("id", hotelId).maybeSingle().then((r: any) => setTypes(r.data?.business_types ?? [])); }, [hotelId, load]);
  useEffect(() => { if (!hotelId) return; const ch = supabase.channel(`supplies-${hotelId}`).on("postgres_changes" as any, { event: "*", schema: "public", table: "hotel_supply_items", filter: `hotel_id=eq.${hotelId}` }, () => void load()).subscribe(); return () => { void supabase.removeChannel(ch); }; }, [hotelId, load]);

  const cats = useMemo(() => { const base = categoriesForModes(modesForTypes(types)); const extra = (data?.items ?? []).map(i => i.category_key).filter(k => !base.some(c => c.key === k)); return [...base, ...SUPPLY_CATEGORIES.filter(c => extra.includes(c.key))]; }, [types, data]);
  const items = data?.items ?? [];
  const locations = Array.from(new Set(items.map(i => i.location).filter(Boolean))) as string[];
  const filtered = items.filter(i => (cat === "all" || i.category_key === cat) && (st === "all" || stockStatus(i) === st) && (loc === "all" || i.location === loc) && (!q || `${i.name} ${i.sku ?? ""} ${categoryLabel(i.category_key)}`.toLowerCase().includes(q.toLowerCase())));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const k = useMemo(() => {
    const costOf = (id: string) => Number(items.find(i => i.id === id)?.unit_cost ?? 0);
    const outMonth = (data?.movements ?? []).filter(m => m.kind === "outward" && new Date(m.created_at).getTime() >= monthStart);
    const open = (data?.orders ?? []).filter(o => o.status === "requested" || o.status === "ordered");
    return {
      total: items.length, healthy: items.filter(i => stockStatus(i) === "healthy").length, low: items.filter(i => stockStatus(i) === "low").length, out: items.filter(i => stockStatus(i) === "out").length,
      value: items.reduce((s, i) => s + Number(i.current_stock) * Number(i.unit_cost), 0), open: open.length, openValue: open.reduce((s, o) => s + Number(o.total), 0),
      pending: (data?.orders ?? []).filter(o => o.status === "ordered").length, consumption: outMonth.reduce((s, m) => s + Number(m.quantity) * costOf(m.item_id), 0), outMonth,
    };
  }, [items, data, monthStart]);
  const pct = (n: number) => k.total ? `${((n / k.total) * 100).toFixed(1)}%` : "0%";

  if (!hotelId) return <div className="p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>;
  const selected = items.find(i => i.id === detail) ?? null;

  return (
    <div className="flex gap-4 p-3 md:p-5">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{MODE_LABEL[mode]} / Inventory & Supplies</p>
            <h1 className="text-2xl font-bold">Inventory & Supplies</h1>
            <p className="text-sm text-muted-foreground">Track stock, purchases, usage and reorders for {cats.slice(0, 3).map(c => c.label.toLowerCase()).join(", ")} and more.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditItem({ category_key: cats[0]?.key, unit: "Nos" })}><Plus className="mr-1 h-4 w-4" />Add Item</Button>
            <Button variant="outline" size="sm" disabled={!items.length} onClick={() => setMove({ kind: "outward" })}><Download className="mr-1 h-4 w-4" />Record Usage</Button>
            <Button variant="outline" size="sm" disabled={!items.length} onClick={() => setPo("requested")}><FileText className="mr-1 h-4 w-4" />Raise Purchase Request</Button>
            <Button size="sm" disabled={!items.length} onClick={() => setPo("ordered")}><ShoppingCart className="mr-1 h-4 w-4" />Create Purchase Order</Button>
          </div>
        </div>
        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{error} <Button size="sm" variant="link" onClick={() => void load()}>Retry</Button></div>}
        {!data && !error ? <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-primary" /> : data && (<>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
            {[[Package, k.total, "Total Items"], [CheckCircle2, k.healthy, `Healthy (${pct(k.healthy)})`], [AlertTriangle, k.low, `Low Stock (${pct(k.low)})`], [XCircle, k.out, `Out of Stock (${pct(k.out)})`], [ShoppingCart, inr(k.value), "Inventory Value"], [FileText, k.open, `Open POs (${inr(k.openValue)})`], [Truck, k.pending, "Pending Deliveries"], [BarChart3, inr(k.consumption), "Monthly Consumption"]].map(([I, v, l]: any) => (
              <div key={l} className="flex items-center gap-2 rounded-xl border bg-card p-3"><I className="h-6 w-6 shrink-0 text-primary" /><div className="min-w-0"><div className="text-lg font-bold leading-tight">{v}</div><div className="truncate text-[11px] text-muted-foreground">{l}</div></div></div>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TABS.map(([key, label]) => <Button key={key} size="sm" variant={tab === key ? "default" : "outline"} className="shrink-0" onClick={() => setParams({ tab: key }, { replace: true })}>{label}</Button>)}
          </div>

          {tab === "overview" && <Overview data={data} items={items} cats={cats} k={k} onCat={(c) => { setCat(c); setParams({ tab: "register" }); }} />}
          {(tab === "overview" || tab === "register" || tab === "alerts") && (
            <section className="rounded-xl border bg-card p-3">
              <h2 className="mb-2 font-semibold">{tab === "alerts" ? "Items to reorder" : `Inventory Items (${filtered.length})`}</h2>
              <div className="mb-3 flex flex-wrap gap-2">
                <div className="relative min-w-[200px] flex-1"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Search by item name, SKU or category" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /></div>
                <Pick value={cat} onChange={v => { setCat(v); setPage(1); }} label="Category" options={cats.map(c => [c.key, c.label])} />
                {tab !== "alerts" && <Pick value={st} onChange={v => { setSt(v); setPage(1); }} label="Status" options={[["healthy", "Healthy"], ["low", "Low Stock"], ["out", "Out of Stock"]]} />}
                <Pick value={loc} onChange={v => { setLoc(v); setPage(1); }} label="Location" options={locations.map(l => [l, l])} />
              </div>
              <ItemTable rows={(tab === "alerts" ? filtered.filter(i => stockStatus(i) !== "healthy") : filtered).slice((page - 1) * PAGE, page * PAGE)} onView={setDetail} onEdit={setEditItem}
                onDelete={async (i) => { if (!confirm(`Delete ${i.name}?`)) return; try { await deleteItem(i.id); toast.success("Item deleted"); if (detail === i.id) setDetail(null); void load(); } catch (e: any) { toast.error(e.message); } }}
                empty={items.length ? "No items match these filters." : "No supplies yet. Add your first item to start tracking stock."} />
              <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>Page {page} of {pages}</span>
                <div className="flex gap-1"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button><Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</Button></div>
              </div>
            </section>
          )}
          {(tab === "orders" || tab === "grn") && <Orders orders={data.orders.filter(o => tab === "grn" ? o.status === "ordered" || o.status === "received" : true)} suppliers={data.suppliers} items={items} grn={tab === "grn"}
            act={async (fn, msg) => { try { await fn(); toast.success(msg); void load(); } catch (e: any) { toast.error(e.message); } }} />}
          {tab === "usage" && <MovementLog movements={data.movements} items={items} />}
          {tab === "suppliers" && <Suppliers suppliers={data.suppliers} items={items} onAdd={() => setSup({ category_keys: [] })} onEdit={setSup} />}
        </>)}
      </div>

      {selected && data && <DetailPanel item={selected} data={data} onClose={() => setDetail(null)} onAction={(kind) => kind === "po" ? setPo("ordered") : kind === "edit" ? setEditItem(selected) : setMove({ kind, itemId: selected.id })} />}

      {editItem && <ItemDialog item={editItem} cats={cats} suppliers={data?.suppliers ?? []} onClose={() => setEditItem(null)} onSave={async (v) => { try { await saveItem(hotelId, v); toast.success("Item saved"); setEditItem(null); void load(); } catch (e: any) { toast.error(e.message?.includes("duplicate") ? "That SKU is already used" : e.message); } }} />}
      {move && <MoveDialog move={move} items={items} onClose={() => setMove(null)} onSave={async (itemId, kind, qty, cost, note) => { try { await recordMovement(hotelId, itemId, kind, qty, cost, note); toast.success("Stock updated"); setMove(null); void load(); } catch (e: any) { toast.error(e.message); } }} />}
      {po && <PoDialog status={po} items={items} suppliers={data?.suppliers ?? []} preselect={selected?.id} onClose={() => setPo(null)} onSave={async (s, lines, exp) => { try { await createPurchaseOrder(hotelId, s, lines, po, exp); toast.success(po === "ordered" ? "Purchase order created" : "Purchase request raised"); setPo(null); void load(); } catch (e: any) { toast.error(e.message); } }} />}
      {sup && <SupplierDialog s={sup} cats={cats} onClose={() => setSup(null)} onSave={async (v) => { try { await saveSupplier(hotelId, v); toast.success("Supplier saved"); setSup(null); void load(); } catch (e: any) { toast.error(e.message); } }} />}
    </div>
  );
}

function Pick({ value, onChange, label, options }: { value: string; onChange: (v: string) => void; label: string; options: string[][] }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{label}: All</SelectItem>{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>;
}

function Overview({ data, items, cats, k, onCat }: { data: Data; items: SupplyItem[]; cats: ReturnType<typeof categoriesForModes>; k: any; onCat: (c: string) => void }) {
  const pie = cats.map(c => ({ name: c.label, key: c.key, color: c.color, value: items.filter(i => i.category_key === c.key).length })).filter(p => p.value);
  const days = Array.from({ length: 30 }, (_, i) => { const d = new Date(Date.now() - (29 - i) * 864e5); return d.toISOString().slice(0, 10); });
  const line = days.map(d => ({ d: d.slice(8) + "/" + d.slice(5, 7), Inward: 0, Outward: 0 }));
  data.movements.forEach(m => { const idx = days.indexOf(m.created_at.slice(0, 10)); if (idx >= 0 && m.kind !== "adjust") line[idx][m.kind === "inward" ? "Inward" : "Outward"] += Number(m.quantity); });
  const top = Object.entries(k.outMonth.reduce((a: Record<string, number>, m: Movement) => ({ ...a, [m.item_id]: (a[m.item_id] ?? 0) + Number(m.quantity) }), {})).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5) as [string, number][];
  const max = top[0]?.[1] || 1;
  return (<>
    <div className="grid gap-3 lg:grid-cols-3">
      <section className="rounded-xl border bg-card p-3"><h3 className="mb-2 font-semibold">Stock Status by Category</h3>
        {pie.length ? <div className="flex items-center gap-2"><div className="h-36 w-36 shrink-0"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="value" innerRadius={40} outerRadius={65}>{pie.map(p => <Cell key={p.key} fill={p.color} />)}</Pie></PieChart></ResponsiveContainer></div>
          <ul className="flex-1 space-y-1 text-xs">{pie.map(p => <li key={p.key} className="flex justify-between gap-2"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}</span><span>{Math.round((p.value / items.length) * 100)}%</span></li>)}</ul></div>
          : <p className="py-8 text-center text-sm text-muted-foreground">No items yet</p>}
      </section>
      <section className="rounded-xl border bg-card p-3"><h3 className="mb-2 font-semibold">Stock Movement (Last 30 Days)</h3>
        <div className="h-40"><ResponsiveContainer><LineChart data={line}><XAxis dataKey="d" fontSize={10} interval={5} /><YAxis fontSize={10} width={30} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Line dataKey="Inward" stroke="hsl(var(--primary))" dot={false} /><Line dataKey="Outward" stroke="hsl(210 85% 55%)" dot={false} /></LineChart></ResponsiveContainer></div>
      </section>
      <section className="rounded-xl border bg-card p-3"><h3 className="mb-2 font-semibold">Top Consumed Items (This Month)</h3>
        {top.length ? <ul className="space-y-2 text-xs">{top.map(([id, qty]) => { const it = items.find(i => i.id === id); return <li key={id} className="flex items-center gap-2"><span className="w-28 truncate">{it?.name ?? "Item"}</span><div className="h-2 flex-1 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${(qty / max) * 100}%` }} /></div><span className="w-14 text-right">{qty} {it?.unit}</span></li>; })}</ul>
          : <p className="py-8 text-center text-sm text-muted-foreground">No usage recorded this month</p>}
      </section>
    </div>
    <section><h3 className="mb-2 font-semibold">Inventory Categories</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">{cats.map(c => <button key={c.key} onClick={() => onCat(c.key)} className="rounded-xl border bg-card p-3 text-left hover:border-primary"><div className="text-sm font-medium">{c.label}</div><div className="text-xs text-muted-foreground">{items.filter(i => i.category_key === c.key).length} items</div></button>)}</div>
    </section>
  </>);
}

function ItemTable({ rows, onView, onEdit, onDelete, empty }: { rows: SupplyItem[]; onView: (id: string) => void; onEdit: (i: SupplyItem) => void; onDelete: (i: SupplyItem) => void; empty: string }) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  return <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr>{["Item Name", "Category", "SKU", "Location", "Current Stock", "Min.", "Reorder", "Unit", "Status", "Last Purchase", ""].map(h => <th key={h} className="whitespace-nowrap px-2 py-2">{h}</th>)}</tr></thead>
    <tbody>{rows.map(i => <tr key={i.id} className="border-t"><td className="px-2 py-2 font-medium">{i.name}</td><td className="px-2"><Badge variant="secondary">{categoryLabel(i.category_key)}</Badge></td><td className="px-2">{i.sku ?? "—"}</td><td className="px-2">{i.location ?? "—"}</td><td className={`px-2 ${stockStatus(i) === "out" ? "text-destructive" : ""}`}>{Number(i.current_stock)}</td><td className="px-2">{Number(i.min_level)}</td><td className="px-2">{Number(i.reorder_level)}</td><td className="px-2">{i.unit}</td><td className="px-2">{statusBadge(i)}</td><td className="whitespace-nowrap px-2">{day(i.last_purchase_at)}</td>
      <td className="whitespace-nowrap px-2"><Button size="icon" variant="ghost" aria-label="View" onClick={() => onView(i.id)}><Eye className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Edit" onClick={() => onEdit(i)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Delete" onClick={() => onDelete(i)}><Trash2 className="h-4 w-4" /></Button></td></tr>)}</tbody></table></div>;
}

function DetailPanel({ item, data, onClose, onAction }: { item: SupplyItem; data: Data; onClose: () => void; onAction: (k: Movement["kind"] | "po" | "edit") => void }) {
  const mv = data.movements.filter(m => m.item_id === item.id);
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - (5 - i)); return { key: d.toISOString().slice(0, 7), m: d.toLocaleString("en-IN", { month: "short" }), qty: 0 }; });
  mv.filter(m => m.kind === "outward").forEach(m => { const x = months.find(mm => mm.key === m.created_at.slice(0, 7)); if (x) x.qty += Number(m.quantity); });
  const supplier = data.suppliers.find(s => s.id === item.supplier_id);
  const avg = Math.round(months.reduce((s, m) => s + m.qty, 0) / 6);
  return (
    <aside className="fixed inset-0 z-40 overflow-y-auto bg-background p-4 lg:static lg:z-auto lg:w-80 lg:shrink-0 lg:rounded-xl lg:border lg:bg-card">
      <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Item Details – {item.name}</h2><Button size="icon" variant="ghost" aria-label="Close" onClick={onClose}><X className="h-4 w-4" /></Button></div>
      <div className="mb-3">{statusBadge(item)}</div>
      <dl className="grid grid-cols-2 gap-y-1 text-sm">{[["SKU", item.sku ?? "—"], ["Category", categoryLabel(item.category_key)], ["Current Stock", `${Number(item.current_stock)} ${item.unit}`], ["Min. Stock", Number(item.min_level)], ["Reorder Level", Number(item.reorder_level)], ["Location", item.location ?? "—"], ["Avg. Consumption", `${avg} ${item.unit} / month`], ["Last Purchase", day(item.last_purchase_at)], ["Unit Cost", inr(Number(item.unit_cost))], ["Current Value", inr(Number(item.unit_cost) * Number(item.current_stock))], ["Supplier", supplier?.name ?? "—"]].map(([a, b]) => <><dt className="text-muted-foreground">{a}</dt><dd className="font-medium">{b}</dd></>)}</dl>
      <h3 className="mb-1 mt-4 font-semibold">Stock Movement</h3>
      {mv.length ? <table className="w-full text-xs"><tbody>{mv.slice(0, 6).map(m => <tr key={m.id} className="border-t"><td className="py-1">{day(m.created_at)}</td><td>{m.kind === "inward" ? `Inward${m.reference ? ` (${m.reference})` : ""}` : m.kind === "outward" ? "Outward (Usage)" : "Adjustment"}</td><td className={m.kind === "inward" ? "text-primary" : m.kind === "outward" ? "text-destructive" : ""}>{m.kind === "inward" ? "+" : m.kind === "outward" ? "−" : "="}{Number(m.quantity)}</td><td className="text-right">{m.balance_after ?? ""}</td></tr>)}</tbody></table> : <p className="text-xs text-muted-foreground">No movements yet.</p>}
      <h3 className="mb-1 mt-4 font-semibold">Usage Trend</h3>
      <div className="h-32"><ResponsiveContainer><BarChart data={months}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="m" fontSize={10} /><YAxis fontSize={10} width={30} /><Tooltip /><Bar dataKey="qty" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
      <h3 className="mb-2 mt-4 font-semibold">Quick Actions</h3>
      <div className="grid grid-cols-3 gap-2">{([["outward", "Record Usage", Download], ["inward", "Add Stock", Plus], ["po", "Create PO", ShoppingCart], ["adjust", "Adjust Stock", SlidersHorizontal], ["edit", "Set Alert", Bell]] as const).map(([k, l, I]) => <Button key={k} variant="outline" className="h-auto flex-col gap-1 py-2 text-[11px]" onClick={() => onAction(k)}><I className="h-4 w-4" />{l}</Button>)}</div>
    </aside>
  );
}

function Orders({ orders, suppliers, items, grn, act }: { orders: PurchaseOrder[]; suppliers: Supplier[]; items: SupplyItem[]; grn: boolean; act: (fn: () => Promise<void>, msg: string) => void }) {
  if (!orders.length) return <p className="rounded-xl border bg-card py-8 text-center text-sm text-muted-foreground">{grn ? "No ordered deliveries waiting to be received." : "No purchase requests or orders yet."}</p>;
  return <div className="space-y-2">{orders.map(o => <div key={o.id} className="rounded-xl border bg-card p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><b>{o.po_number}</b> · {suppliers.find(s => s.id === o.supplier_id)?.name ?? "No supplier"} · {inr(Number(o.total))}<div className="text-xs text-muted-foreground">Created {day(o.created_at)}{o.expected_at ? ` · Expected ${day(o.expected_at)}` : ""}{o.received_at ? ` · Received ${day(o.received_at)}` : ""}</div></div>
    <div className="flex items-center gap-2"><Badge variant="outline" className="capitalize">{o.status}</Badge>
      {o.status === "requested" && <Button size="sm" variant="outline" onClick={() => act(() => setPoStatus(o.id, "ordered"), "Order placed")}>Approve & Order</Button>}
      {o.status === "ordered" && <Button size="sm" onClick={() => act(() => receivePurchaseOrder(o.id), "Goods received into stock")}>Receive Goods</Button>}
      {(o.status === "requested" || o.status === "ordered") && <Button size="sm" variant="ghost" onClick={() => act(() => setPoStatus(o.id, "cancelled"), "Order cancelled")}>Cancel</Button>}</div></div>
    <ul className="mt-2 text-xs text-muted-foreground">{o.lines.map((l, i) => { const it = items.find(x => x.id === l.item_id); return <li key={i}>{it?.name ?? "Removed item"} — {l.qty} {it?.unit} × {inr(l.unit_cost)}</li>; })}</ul></div>)}</div>;
}

function MovementLog({ movements, items }: { movements: Movement[]; items: SupplyItem[] }) {
  if (!movements.length) return <p className="rounded-xl border bg-card py-8 text-center text-sm text-muted-foreground">No stock movements recorded yet.</p>;
  return <div className="overflow-x-auto rounded-xl border bg-card p-3"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Date</th><th>Item</th><th>Type</th><th>Quantity</th><th>Balance</th><th>Note</th></tr></thead><tbody>{movements.slice(0, 200).map(m => { const it = items.find(i => i.id === m.item_id); return <tr key={m.id} className="border-t"><td className="py-1">{day(m.created_at)}</td><td>{it?.name}</td><td className="capitalize">{m.kind === "outward" ? "Usage" : m.kind}</td><td>{Number(m.quantity)} {it?.unit}</td><td>{m.balance_after}</td><td className="text-muted-foreground">{m.reference ?? m.note ?? ""}</td></tr>; })}</tbody></table></div>;
}

function Suppliers({ suppliers, items, onAdd, onEdit }: { suppliers: Supplier[]; items: SupplyItem[]; onAdd: () => void; onEdit: (s: Supplier) => void }) {
  return <section className="rounded-xl border bg-card p-3"><div className="mb-2 flex justify-between"><h2 className="font-semibold">Suppliers ({suppliers.length})</h2><Button size="sm" onClick={onAdd}><Plus className="mr-1 h-4 w-4" />Add Supplier</Button></div>
    {suppliers.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{suppliers.map(s => <button key={s.id} onClick={() => onEdit(s)} className="rounded-lg border p-3 text-left text-sm hover:border-primary"><b>{s.name}</b><div className="text-xs text-muted-foreground">{[s.phone, s.email].filter(Boolean).join(" · ") || "No contact"}</div><div className="mt-1 text-xs">{items.filter(i => i.supplier_id === s.id).length} items · {s.category_keys.map(categoryLabel).join(", ")}</div></button>)}</div> : <p className="py-6 text-center text-sm text-muted-foreground">No suppliers yet.</p>}</section>;
}

function ItemDialog({ item, cats, suppliers, onClose, onSave }: { item: Partial<SupplyItem>; cats: ReturnType<typeof categoriesForModes>; suppliers: Supplier[]; onClose: () => void; onSave: (v: Partial<SupplyItem>) => Promise<void> }) {
  const [v, setV] = useState(item); const [busy, setBusy] = useState(false);
  const f = (k: keyof SupplyItem, num = false) => (e: any) => setV(p => ({ ...p, [k]: num ? Number(e.target.value) : e.target.value }));
  return <Dialog open onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>{item.id ? "Edit item" : "Add item"}</DialogTitle></DialogHeader>
    <div className="grid grid-cols-2 gap-2 text-sm">
      <label className="col-span-2">Name<Input value={v.name ?? ""} onChange={f("name")} /></label>
      <label>Category<Select value={v.category_key} onValueChange={c => setV(p => ({ ...p, category_key: c }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{cats.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent></Select></label>
      <label>SKU<Input value={v.sku ?? ""} onChange={f("sku")} /></label>
      <label>Location<Input value={v.location ?? ""} onChange={f("location")} placeholder="Main Store" /></label>
      <label>Unit<Input value={v.unit ?? ""} onChange={f("unit")} placeholder="kg, L, Nos" /></label>
      {!item.id && <label>Opening stock<Input type="number" min={0} value={v.current_stock ?? ""} onChange={f("current_stock", true)} /></label>}
      <label>Unit cost (₹)<Input type="number" min={0} value={v.unit_cost ?? ""} onChange={f("unit_cost", true)} /></label>
      <label>Min. level<Input type="number" min={0} value={v.min_level ?? ""} onChange={f("min_level", true)} /></label>
      <label>Reorder level<Input type="number" min={0} value={v.reorder_level ?? ""} onChange={f("reorder_level", true)} /></label>
      <label className="col-span-2">Supplier<Select value={v.supplier_id ?? "none"} onValueChange={s => setV(p => ({ ...p, supplier_id: s === "none" ? null : s }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></label>
    </div>
    <DialogFooter><Button disabled={busy} onClick={async () => { setBusy(true); await onSave({ ...v, sku: v.sku || null }); setBusy(false); }}>{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save</Button></DialogFooter></DialogContent></Dialog>;
}

function MoveDialog({ move, items, onClose, onSave }: { move: { kind: Movement["kind"]; itemId?: string }; items: SupplyItem[]; onClose: () => void; onSave: (id: string, k: Movement["kind"], q: number, c: number | null, n: string) => Promise<void> }) {
  const [id, setId] = useState(move.itemId ?? items[0]?.id); const [qty, setQty] = useState(""); const [cost, setCost] = useState(""); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false);
  const it = items.find(i => i.id === id);
  return <Dialog open onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>{move.kind === "outward" ? "Record usage" : move.kind === "inward" ? "Add stock" : "Adjust stock (physical count)"}</DialogTitle></DialogHeader>
    <div className="space-y-2 text-sm"><Select value={id} onValueChange={setId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({Number(i.current_stock)} {i.unit})</SelectItem>)}</SelectContent></Select>
      <Input type="number" min={0} placeholder={move.kind === "adjust" ? `Counted stock (${it?.unit})` : `Quantity (${it?.unit})`} value={qty} onChange={e => setQty(e.target.value)} />
      {move.kind === "inward" && <Input type="number" min={0} placeholder="Unit cost ₹ (optional)" value={cost} onChange={e => setCost(e.target.value)} />}
      <Input placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} /></div>
    <DialogFooter><Button disabled={busy || !id || qty === ""} onClick={async () => { setBusy(true); await onSave(id!, move.kind, Number(qty), cost ? Number(cost) : null, note); setBusy(false); }}>Save</Button></DialogFooter></DialogContent></Dialog>;
}

function PoDialog({ status, items, suppliers, preselect, onClose, onSave }: { status: string; items: SupplyItem[]; suppliers: Supplier[]; preselect?: string; onClose: () => void; onSave: (s: string | null, l: PurchaseOrder["lines"], e?: string) => Promise<void> }) {
  const first = items.find(i => i.id === preselect) ?? items.find(i => stockStatus(i) !== "healthy") ?? items[0];
  const [s, setS] = useState<string>(first?.supplier_id ?? "none"); const [exp, setExp] = useState(""); const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState([{ item_id: first?.id ?? "", qty: Math.max(0, Number(first?.reorder_level ?? 0) * 2 - Number(first?.current_stock ?? 0)), unit_cost: Number(first?.unit_cost ?? 0) }]);
  const upd = (i: number, p: any) => setLines(ls => ls.map((l, j) => j === i ? { ...l, ...p } : l));
  return <Dialog open onOpenChange={onClose}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{status === "ordered" ? "Create purchase order" : "Raise purchase request"}</DialogTitle></DialogHeader>
    <div className="space-y-2 text-sm"><Select value={s} onValueChange={setS}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No supplier</SelectItem>{suppliers.map(x => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select>
      {lines.map((l, i) => <div key={i} className="flex gap-2"><Select value={l.item_id} onValueChange={v => upd(i, { item_id: v, unit_cost: Number(items.find(x => x.id === v)?.unit_cost ?? 0) })}><SelectTrigger className="flex-1"><SelectValue /></SelectTrigger><SelectContent>{items.map(x => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select><Input className="w-20" type="number" min={0} value={l.qty} onChange={e => upd(i, { qty: Number(e.target.value) })} /><Input className="w-24" type="number" min={0} value={l.unit_cost} onChange={e => upd(i, { unit_cost: Number(e.target.value) })} /></div>)}
      <Button size="sm" variant="outline" onClick={() => setLines(ls => [...ls, { item_id: items[0].id, qty: 1, unit_cost: Number(items[0].unit_cost) }])}><Plus className="mr-1 h-4 w-4" />Add line</Button>
      <label className="block">Expected delivery<Input type="date" value={exp} onChange={e => setExp(e.target.value)} /></label>
      <p className="font-medium">Total {inr(lines.reduce((t, l) => t + l.qty * l.unit_cost, 0))}</p></div>
    <DialogFooter><Button disabled={busy} onClick={async () => { setBusy(true); await onSave(s === "none" ? null : s, lines, exp); setBusy(false); }}>Save</Button></DialogFooter></DialogContent></Dialog>;
}

function SupplierDialog({ s, cats, onClose, onSave }: { s: Partial<Supplier>; cats: ReturnType<typeof categoriesForModes>; onClose: () => void; onSave: (v: Partial<Supplier>) => Promise<void> }) {
  const [v, setV] = useState(s);
  return <Dialog open onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>{s.id ? "Edit supplier" : "Add supplier"}</DialogTitle></DialogHeader>
    <div className="space-y-2 text-sm"><Input placeholder="Name" value={v.name ?? ""} onChange={e => setV({ ...v, name: e.target.value })} /><Input placeholder="Phone" value={v.phone ?? ""} onChange={e => setV({ ...v, phone: e.target.value })} /><Input placeholder="Email" type="email" value={v.email ?? ""} onChange={e => setV({ ...v, email: e.target.value })} />
      <div className="flex flex-wrap gap-1">{cats.map(c => { const on = v.category_keys?.includes(c.key); return <Button key={c.key} size="sm" variant={on ? "default" : "outline"} onClick={() => setV({ ...v, category_keys: on ? v.category_keys!.filter(x => x !== c.key) : [...(v.category_keys ?? []), c.key] })}>{c.label}</Button>; })}</div></div>
    <DialogFooter><Button onClick={() => void onSave(v)}>Save</Button></DialogFooter></DialogContent></Dialog>;
}
