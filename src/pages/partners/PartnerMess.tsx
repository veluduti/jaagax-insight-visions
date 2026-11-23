import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { Utensils, Users, UtensilsCrossed, IndianRupee, AlertCircle, ClipboardList, Star, Plus, Search, Download, Loader2, CheckCircle2, XCircle, Minus, QrCode, Package, Settings2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { useDashboardMode } from "@/hooks/useDashboardMode";
import { MODE_LABEL } from "@/config/dashboardModes";
import { DINING, MEALS, mealLabel, proratedAmount, isServing } from "@/config/diningModes";
import { loadDining, savePlan, saveMenu, saveSub, saveRequest, markAttendance, recordGuestMeal, recordPayment, recordIngredientUse, type MealPlan, type Menu, type Sub, type MealRequest } from "@/services/hospitality/diningService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Data = Awaited<ReturnType<typeof loadDining>>;
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const today = () => new Date().toISOString().slice(0, 10);
const PAGE = 10;
const TAB_MOD: Record<string, string> = { menus: "menus", plans: "plans", subscriptions: "subscriptions", attendance: "attendance", requests: "requests", inventory: "inventory", reports: "reports" };
const TAB_LABEL: [string, string][] = [["overview", "Overview"], ["menus", "Menus & Schedule"], ["plans", "Meal Plans"], ["subscriptions", "Subscriptions"], ["attendance", "Attendance"], ["requests", "Orders & Requests"], ["inventory", "Inventory"], ["reports", "Reports"]];
const csv = (name: string, head: string[], rows: any[][]) => { const body = [head, ...rows].map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" })); a.download = `${name}-${today()}.csv`; a.click(); };

export default function PartnerMess() {
  const { hotelId } = usePartnerHotel();
  const [hotel, setHotel] = useState<{ name: string; business_types: string[]; images?: string[] | null } | null>(null);
  const mode = useDashboardMode(hotelId ?? undefined, hotel?.business_types ?? null);
  const cfg = DINING[mode];
  const [data, setData] = useState<Data | null>(null); const [error, setError] = useState("");
  const [params, setParams] = useSearchParams(); const tab = params.get("tab") || "overview";
  const [day, setDay] = useState(today()); const [q, setQ] = useState(""); const [planF, setPlanF] = useState("all"); const [page, setPage] = useState(1);
  const [plan, setPlan] = useState<Partial<MealPlan> | null>(null); const [menu, setMenu] = useState<Partial<Menu> | null>(null);
  const [sub, setSub] = useState<Partial<Sub> | null>(null); const [req, setReq] = useState<Partial<MealRequest> | null>(null);
  const [pay, setPay] = useState<{ subscription_id?: string; amount?: number; method: string } | null>(null);
  const [use, setUse] = useState<{ item_id?: string; qty?: number; meal: string } | null>(null);
  const [guest, setGuest] = useState<{ name: string; meal: string } | null>(null);

  const load = useCallback(async () => { if (!hotelId) return; try { setError(""); setData(await loadDining(hotelId)); } catch (e: any) { setError(e.message || "Could not load dining"); } }, [hotelId]);
  useEffect(() => { setData(null); void load(); if (hotelId) (supabase as any).from("partner_hotels").select("name,business_types,images").eq("id", hotelId).maybeSingle().then((r: any) => setHotel(r.data)); }, [hotelId, load]);
  useEffect(() => { if (!hotelId) return; const ch = supabase.channel(`mess-${hotelId}`); ["hotel_meal_subscriptions", "hotel_meal_attendance", "hotel_meal_requests", "hotel_meal_payments", "hotel_meal_plans", "hotel_meal_menus"].forEach(t => ch.on("postgres_changes" as any, { event: "*", schema: "public", table: t, filter: `hotel_id=eq.${hotelId}` }, () => void load())); ch.subscribe(); return () => { void supabase.removeChannel(ch); }; }, [hotelId, load]);
  const act = async (fn: () => Promise<unknown>, msg: string, close?: () => void) => { try { await fn(); toast.success(msg); close?.(); void load(); } catch (e: any) { toast.error(e.message); } };

  const m = useMemo(() => {
    if (!data) return null;
    const month = today().slice(0, 7) + "-01";
    const live = data.subs.filter(s => isServing(s, day));
    const att = data.attendance.filter(a => a.served_on === day);
    const planOf = (s: Sub) => data.plans.find(p => p.id === s.plan_id);
    const monthRev = data.payments.filter(p => p.paid_on >= month).reduce((s, p) => s + Number(p.amount), 0) + data.requests.filter(r => r.for_date >= month && r.status === "served").reduce((s, r) => s + Number(r.amount), 0);
    const billed = live.filter(s => planOf(s)?.period === "month").reduce((s, x) => s + proratedAmount(Number(x.price || planOf(x)?.price || 0), x.start_date, month), 0);
    const paidSubs = data.payments.filter(p => p.paid_on >= month && p.subscription_id).reduce((s, p) => s + Number(p.amount), 0);
    const rated = data.requests.filter(r => r.rating);
    const people = Math.max(data.residents.length, data.subs.filter(s => s.status !== "cancelled").length);
    const trend = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i); const k = d.toISOString().slice(0, 7); return { m: d.toLocaleString("en-IN", { month: "short" }), Revenue: data.payments.filter(p => p.paid_on.startsWith(k)).reduce((s, p) => s + Number(p.amount), 0) }; });
    return { live, att, planOf, monthRev, outstanding: Math.max(0, billed - paidSubs), billed, rating: rated.length ? (rated.reduce((s, r) => s + Number(r.rating), 0) / rated.length).toFixed(1) : "—", ratedN: rated.length, people, trend, reqToday: data.requests.filter(r => r.for_date === day).length };
  }, [data, day]);

  if (!hotelId) return <div className="p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>;
  const has = (k: string) => k === "overview" || cfg.modules.includes(TAB_MOD[k] as any);
  const mealsFor = (d: string) => { const wd = new Date(d + "T00:00:00").getDay(); return MEALS.map(([k, l]) => ({ k, l, menu: data?.menus.find(x => x.meal === k && x.menu_date === d) ?? data?.menus.find(x => x.meal === k && x.weekday === wd && !x.menu_date) })).filter(x => x.menu); };
  const rows = (m?.live ?? []).filter(s => (planF === "all" || s.plan_id === planF) && (!q || `${s.person_name} ${s.room_label}`.toLowerCase().includes(q.toLowerCase())));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));

  return (
    <div className="flex flex-col gap-4 p-3 md:p-5 xl:flex-row">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs text-muted-foreground">{MODE_LABEL[mode]} / {cfg.title}</p><h1 className="text-2xl font-bold">{cfg.title}</h1>
            <p className="text-sm text-muted-foreground">Manage meal plans, menus, subscriptions, attendance, orders and billing.</p></div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setMenu({ meal: "breakfast", menu_date: day, items: [] })}><Plus className="mr-1 h-4 w-4" />Create Menu</Button>
            <Button variant="outline" size="sm" onClick={() => setParams({ tab: "plans" })}><Settings2 className="mr-1 h-4 w-4" />Manage Plans</Button>
            <Button variant="outline" size="sm" onClick={() => setGuest({ name: "", meal: "lunch" })}><Star className="mr-1 h-4 w-4" />Record Meal</Button>
            {cfg.modules.includes("subscriptions") && <Button size="sm" disabled={!data?.plans.length} title={data?.plans.length ? "" : "Add a meal plan first"} onClick={() => setSub({ plan_id: data?.plans[0]?.id, diet: "veg", status: "active", start_date: today() })}><Plus className="mr-1 h-4 w-4" />Add Subscription</Button>}
          </div>
        </div>
        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{error} <Button size="sm" variant="link" onClick={() => void load()}>Retry</Button></div>}
        {!data && !error ? <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-primary" /> : data && m && (<>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
            {[[Users, m.people, `Total ${cfg.people}`], [Utensils, m.live.length, `Subscribed${m.people ? ` (${((m.live.length / m.people) * 100).toFixed(1)}%)` : ""}`], [UtensilsCrossed, m.att.filter(a => a.status === "attended").length, "Meals Served (Day)"], [IndianRupee, inr(m.monthRev), `${cfg.revenueLabel} (Month)`], [AlertCircle, inr(m.outstanding), "Outstanding"], [ClipboardList, m.reqToday, "Meal Requests (Day)"], [Star, m.rating, `Rating (${m.ratedN})`]].map(([I, v, l]: any) => (
              <div key={l} className="flex items-center gap-2 rounded-xl border bg-card p-3"><I className="h-6 w-6 shrink-0 text-primary" /><div className="min-w-0"><div className="text-lg font-bold leading-tight">{v}</div><div className="truncate text-[11px] text-muted-foreground">{l}</div></div></div>))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">{TAB_LABEL.filter(([k]) => has(k)).map(([k, l]) => <Button key={k} size="sm" variant={tab === k ? "default" : "outline"} className="shrink-0" onClick={() => setParams({ tab: k }, { replace: true })}>{l}</Button>)}</div>

          {tab === "overview" && <>
            <div className="grid gap-3 lg:grid-cols-3">
              <section className="rounded-xl border bg-card p-3"><h3 className="mb-2 font-semibold">Subscription Status</h3>
                {m.people ? <div className="flex items-center gap-2"><div className="h-32 w-32 shrink-0"><ResponsiveContainer><PieChart><Pie data={[{ v: m.live.length }, { v: Math.max(0, m.people - m.live.length) }]} dataKey="v" innerRadius={38} outerRadius={60}><Cell fill="hsl(142 70% 45%)" /><Cell fill="hsl(var(--muted))" /></Pie></PieChart></ResponsiveContainer></div>
                  <ul className="space-y-1 text-xs"><li>Subscribed: <b>{m.live.length}</b></li><li>Not subscribed: <b>{Math.max(0, m.people - m.live.length)}</b></li><li>Paused: <b>{data.subs.filter(s => s.status === "paused").length}</b></li></ul></div> : <p className="py-8 text-center text-sm text-muted-foreground">No {cfg.people.toLowerCase()} yet</p>}</section>
              <section className="rounded-xl border bg-card p-3"><h3 className="mb-2 font-semibold">Meal Attendance – {day}</h3>
                {mealsFor(day).length || m.att.length ? <ul className="space-y-3 text-sm">{MEALS.map(([k, l]) => { const served = m.att.filter(a => a.meal === k && a.status === "attended").length; const denom = m.live.filter(s => m.planOf(s)?.meals.includes(k)).length; if (!denom && !served) return null; return <li key={k}><div className="flex justify-between"><span>{l}</span><span>{served} / {denom}</span></div><div className="h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${denom ? Math.min(100, (served / denom) * 100) : 0}%` }} /></div></li>; })}</ul> : <p className="py-8 text-center text-sm text-muted-foreground">No meals recorded</p>}</section>
              <section className="rounded-xl border bg-card p-3"><h3 className="mb-2 font-semibold">Monthly Revenue Trend</h3>
                <div className="h-36"><ResponsiveContainer><LineChart data={m.trend}><XAxis dataKey="m" fontSize={10} /><YAxis fontSize={10} width={40} /><Tooltip formatter={(v: any) => inr(v)} /><Line dataKey="Revenue" stroke="hsl(var(--primary))" /></LineChart></ResponsiveContainer></div></section>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <MenuCards meals={mealsFor(day)} day={day} />
              <PlanSummary data={data} />
            </div>
          </>}

          {(tab === "overview" || tab === "attendance" || tab === "subscriptions") && cfg.modules.includes("subscriptions") && (
            <section className="rounded-xl border bg-card p-3">
              <div className="mb-3 flex flex-wrap gap-2">
                <div className="relative min-w-[180px] flex-1"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Search name, room, bed…" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /></div>
                <Input type="date" className="w-[160px]" value={day} onChange={e => setDay(e.target.value || today())} />
                <Select value={planF} onValueChange={v => { setPlanF(v); setPage(1); }}><SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Plan: All</SelectItem>{data.plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
                <Button variant="outline" size="sm" onClick={() => csv("meal-attendance", ["Name", "Room", "Plan", ...MEALS.map(x => x[1]), "Price"], rows.map(s => [s.person_name, s.room_label, m.planOf(s)?.name, ...MEALS.map(([k]) => m.att.find(a => a.subscription_id === s.id && a.meal === k)?.status ?? ""), s.price]))}><Download className="mr-1 h-4 w-4" />Export</Button>
              </div>
              {rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr>{["Name", "Room / Bed", "Plan", ...MEALS.map(x => x[1]), "Status", "Monthly", ""].map(h => <th key={h} className="whitespace-nowrap px-2 py-2">{h}</th>)}</tr></thead>
                <tbody>{rows.slice((page - 1) * PAGE, page * PAGE).map(s => { const p = m.planOf(s); const mine = m.att.filter(a => a.subscription_id === s.id); const inc = MEALS.filter(([k]) => p?.meals.includes(k)); const got = mine.filter(a => a.status === "attended").length; return <tr key={s.id} className="border-t">
                  <td className="px-2 py-2 font-medium">{s.person_name}<div className="text-[10px] uppercase text-muted-foreground">{s.diet.replace("_", "-")}</div></td><td className="px-2">{s.room_label ?? "—"}</td><td className="px-2">{p?.name ?? "—"}</td>
                  {MEALS.map(([k]) => { const a = mine.find(x => x.meal === k); if (!p?.meals.includes(k)) return <td key={k} className="px-2"><Minus className="h-4 w-4 text-muted-foreground" /></td>;
                    return <td key={k} className="px-2"><button aria-label={`Toggle ${k}`} onClick={() => act(() => markAttendance(hotelId, s, k, day, a?.status === "attended" ? "missed" : "attended"), "Attendance saved")}>{a?.status === "attended" ? <CheckCircle2 className="h-5 w-5 text-primary" /> : a ? <XCircle className="h-5 w-5 text-destructive" /> : <span className="inline-block h-5 w-5 rounded-full border" />}</button></td>; })}
                  <td className="px-2"><Badge variant={got === inc.length && inc.length ? "default" : mine.some(a => a.status === "missed") ? "destructive" : "secondary"}>{mine.length ? `Attended (${got}/${inc.length})` : "Pending"}</Badge></td>
                  <td className="px-2">{inr(Number(s.price || p?.price || 0))}</td>
                  <td className="whitespace-nowrap px-2"><Button size="sm" variant="ghost" onClick={() => setSub(s)}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="ghost" onClick={() => setPay({ subscription_id: s.id, amount: Number(s.price || p?.price || 0), method: "upi" })}>Pay</Button></td></tr>; })}</tbody></table></div>
                : <p className="py-8 text-center text-sm text-muted-foreground">{data.subs.length ? "No subscriptions match these filters." : "No meal subscriptions yet."}</p>}
              <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground"><span>Showing {rows.length ? (page - 1) * PAGE + 1 : 0}–{Math.min(page * PAGE, rows.length)} of {rows.length}</span>
                <div className="flex gap-1"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button><Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</Button></div></div>
            </section>)}

          {tab === "menus" && <section className="rounded-xl border bg-card p-3"><div className="mb-2 flex justify-between"><h2 className="font-semibold">Menus & Schedule ({data.menus.length})</h2><Button size="sm" onClick={() => setMenu({ meal: "breakfast", weekday: 1, items: [] })}><Plus className="mr-1 h-4 w-4" />Create Menu</Button></div>
            {data.menus.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{[...data.menus].sort((a, b) => (a.menu_date ?? String(a.weekday)).localeCompare(b.menu_date ?? String(b.weekday))).map(x => <button key={x.id} onClick={() => setMenu(x)} className="rounded-lg border p-3 text-left text-sm hover:border-primary"><b>{mealLabel(x.meal)}</b> · {x.menu_date ?? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][x.weekday ?? 0] + " (weekly)"}{x.is_special && <Badge className="ml-1">Special</Badge>}<div className="text-xs text-muted-foreground">{x.start_time?.slice(0, 5) ?? ""}{x.end_time ? ` – ${x.end_time.slice(0, 5)}` : ""}</div><div className="mt-1 text-xs">{x.items.join(", ")}</div></button>)}</div> : <p className="py-6 text-center text-sm text-muted-foreground">No menus yet.</p>}</section>}

          {tab === "plans" && <section className="rounded-xl border bg-card p-3"><div className="mb-2 flex justify-between"><h2 className="font-semibold">Meal Plans</h2><Button size="sm" onClick={() => setPlan({ meals: ["breakfast", "lunch", "dinner"], period: "month", diet: "both", is_active: true, price: 0 })}><Plus className="mr-1 h-4 w-4" />Add Meal Plan</Button></div><PlanSummary data={data} onEdit={setPlan} /></section>}

          {tab === "requests" && <section className="rounded-xl border bg-card p-3"><div className="mb-2 flex justify-between"><h2 className="font-semibold">Orders & Requests ({data.requests.length})</h2><Button size="sm" onClick={() => setReq({ kind: cfg.requestKinds[0][0], meal: "lunch", for_date: day, quantity: 1, amount: 0 })}><Plus className="mr-1 h-4 w-4" />Add Meal Request</Button></div>
            {data.requests.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr>{["Name", "Room", "Type", "Meal", "Date", "Qty", "Amount", "Status", ""].map(h => <th key={h} className="px-2 py-2">{h}</th>)}</tr></thead><tbody>{data.requests.map(r => <tr key={r.id} className="border-t"><td className="px-2 py-2">{r.person_name}</td><td className="px-2">{r.room_label ?? "—"}</td><td className="px-2">{cfg.requestKinds.find(k => k[0] === r.kind)?.[1] ?? r.kind.replace(/_/g, " ")}</td><td className="px-2">{r.meal ? mealLabel(r.meal) : "—"}</td><td className="px-2">{r.for_date}</td><td className="px-2">{r.quantity}</td><td className="px-2">{inr(Number(r.amount))}</td><td className="px-2"><Badge variant="secondary" className="capitalize">{r.status}</Badge></td>
              <td className="whitespace-nowrap px-2">{r.status === "pending" && <><Button size="sm" variant="ghost" onClick={() => act(() => saveRequest(hotelId, { id: r.id, person_name: r.person_name, status: "approved" }), "Approved")}>Approve</Button><Button size="sm" variant="ghost" onClick={() => act(() => saveRequest(hotelId, { id: r.id, person_name: r.person_name, status: "rejected" }), "Rejected")}>Reject</Button></>}{r.status === "approved" && <Button size="sm" variant="ghost" onClick={() => act(() => saveRequest(hotelId, { id: r.id, person_name: r.person_name, status: "served" }), "Marked served")}>Served</Button>}{r.status === "served" && !r.rating && [3, 4, 5].map(n => <Button key={n} size="sm" variant="ghost" onClick={() => act(() => saveRequest(hotelId, { id: r.id, person_name: r.person_name, rating: n }), "Rating saved")}>{n}★</Button>)}</td></tr>)}</tbody></table></div> : <p className="py-6 text-center text-sm text-muted-foreground">No meal requests yet.</p>}</section>}

          {tab === "inventory" && <section className="rounded-xl border bg-card p-3"><div className="mb-2 flex justify-between"><h2 className="font-semibold">Kitchen Stock</h2><Button size="sm" disabled={!data.items.length} onClick={() => setUse({ meal: "lunch" })}><Package className="mr-1 h-4 w-4" />Record Ingredient Use</Button></div>
            <p className="mb-2 text-xs text-muted-foreground">Usage is saved to Inventory & Supplies, so stock is counted once.</p>
            {data.items.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr>{["Item", "In stock", "Unit cost", "Value"].map(h => <th key={h} className="px-2 py-2">{h}</th>)}</tr></thead><tbody>{data.items.map(i => <tr key={i.id} className="border-t"><td className="px-2 py-2">{i.name}</td><td className="px-2">{i.current_stock} {i.unit}</td><td className="px-2">{inr(Number(i.unit_cost))}</td><td className="px-2">{inr(Number(i.current_stock) * Number(i.unit_cost))}</td></tr>)}</tbody></table></div> : <p className="py-6 text-center text-sm text-muted-foreground">No stock items yet. Add them in Inventory & Supplies.</p>}</section>}

          {tab === "reports" && <section className="rounded-xl border bg-card p-4 text-sm"><h2 className="mb-2 font-semibold">Reports</h2>
            <p className="mb-3">This month billed: <b>{inr(m.billed)}</b> · Collected: <b>{inr(m.monthRev)}</b> · Outstanding: <b>{inr(m.outstanding)}</b> · Guest meals: <b>{data.attendance.filter(a => a.is_guest_meal).length}</b></p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => csv("meal-subscriptions", ["Name", "Room", "Plan", "Status", "Start", "Paused until", "Price"], data.subs.map(s => [s.person_name, s.room_label, m.planOf(s)?.name, s.status, s.start_date, s.paused_until, s.price]))}><Download className="mr-1 h-4 w-4" />Subscriptions</Button>
              <Button size="sm" variant="outline" onClick={() => csv("meal-payments", ["Date", "Name", "Amount", "Method", "Period"], data.payments.map(p => [p.paid_on, data.subs.find(s => s.id === p.subscription_id)?.person_name, p.amount, p.method, p.period]))}><Download className="mr-1 h-4 w-4" />Payments</Button>
              <Button size="sm" variant="outline" onClick={() => csv("meal-attendance-log", ["Date", "Name", "Meal", "Status", "Guest meal"], data.attendance.map(a => [a.served_on, a.person_name, a.meal, a.status, a.is_guest_meal ? "yes" : ""]))}><Download className="mr-1 h-4 w-4" />Attendance</Button></div></section>}
        </>)}
      </div>

      {data && m && <aside className="space-y-3 xl:w-80 xl:shrink-0">
        <section className="rounded-xl border bg-card p-3">{hotel?.images?.[0] && <img src={hotel.images[0]} alt="" className="mb-2 h-28 w-full rounded-lg object-cover" />}<h3 className="font-bold">{cfg.title}</h3><p className="text-sm text-muted-foreground">{hotel?.name}</p>
          <Badge className="mt-1">{data.plans.some(p => p.is_active) ? "Active" : "Not set up"}</Badge></section>
        <section className="rounded-xl border bg-card p-3"><h3 className="mb-2 font-semibold">Today's Menu Overview</h3>
          {mealsFor(today()).length ? mealsFor(today()).map(x => <div key={x.k} className="flex justify-between border-t py-1.5 text-sm"><span><b>{x.l}</b><div className="text-xs text-muted-foreground">{x.menu!.start_time?.slice(0, 5)}{x.menu!.end_time ? ` – ${x.menu!.end_time.slice(0, 5)}` : ""}</div></span><span>{data.attendance.filter(a => a.served_on === today() && a.meal === x.k && a.status === "attended").length} served</span></div>) : <p className="text-sm text-muted-foreground">No menu set for today.</p>}</section>
        <section className="rounded-xl border bg-card p-3"><h3 className="mb-2 font-semibold">Plan Configuration</h3>
          {data.plans.map(p => <div key={p.id} className="flex items-center justify-between border-t py-1.5 text-sm"><span>{p.name}</span><span className="flex items-center gap-1"><Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Off"}</Badge>{inr(Number(p.price))}/{p.period}<Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setPlan(p)}><Pencil className="h-3 w-3" /></Button></span></div>)}
          <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => setPlan({ meals: ["breakfast", "lunch", "dinner"], period: "month", diet: "both", is_active: true, price: 0 })}><Plus className="mr-1 h-4 w-4" />Add Meal Plan</Button></section>
        <section className="rounded-xl border bg-card p-3"><h3 className="mb-2 font-semibold">Quick Actions</h3><div className="grid grid-cols-3 gap-2">
          {[[ClipboardList, "Create Menu", () => setMenu({ meal: "breakfast", menu_date: today(), items: [] })], [CheckCircle2, "Mark Attendance", () => setParams({ tab: "attendance" })], [UtensilsCrossed, "Add Meal Request", () => setReq({ kind: cfg.requestKinds[0][0], meal: "lunch", for_date: today(), quantity: 1, amount: 0 })], [IndianRupee, "Record Payment", () => setPay({ method: "upi" })], [Settings2, "Update Plan", () => setParams({ tab: "plans" })], [QrCode, "Meal QR", () => { navigator.clipboard?.writeText(`${location.origin}/partners/mess?tab=attendance&date=${today()}`); toast.success("Attendance link copied"); }]].map(([I, l, fn]: any) => <Button key={l} variant="outline" className="h-auto flex-col gap-1 py-2 text-[11px]" onClick={fn}><I className="h-5 w-5 text-primary" />{l}</Button>)}</div></section>
      </aside>}

      {plan && <Dlg title={plan.id ? "Update plan" : "Add meal plan"} onClose={() => setPlan(null)} onSave={() => act(() => savePlan(hotelId, plan), "Plan saved", () => setPlan(null))}>
        <Input placeholder="Plan name (e.g. Full Plan – 3 meals)" value={plan.name ?? ""} onChange={e => setPlan({ ...plan, name: e.target.value })} />
        <div className="flex flex-wrap gap-1">{MEALS.map(([k, l]) => { const on = plan.meals?.includes(k); return <Button key={k} size="sm" variant={on ? "default" : "outline"} onClick={() => setPlan({ ...plan, meals: on ? plan.meals!.filter(x => x !== k) : [...(plan.meals ?? []), k] })}>{l}</Button>; })}</div>
        <div className="grid grid-cols-3 gap-2"><Input type="number" min={0} placeholder="Price" value={plan.price ?? ""} onChange={e => setPlan({ ...plan, price: Number(e.target.value) })} />
          <Opt v={plan.period!} set={v => setPlan({ ...plan, period: v })} o={[["month", "Per month"], ["day", "Per day"], ["meal", "Per meal"], ["stay", "Per stay"]]} />
          <Opt v={plan.diet!} set={v => setPlan({ ...plan, diet: v })} o={[["both", "Veg & non-veg"], ["veg", "Veg only"], ["non_veg", "Non-veg"]]} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!plan.is_active} onChange={e => setPlan({ ...plan, is_active: e.target.checked })} />Active</label></Dlg>}
      {menu && <Dlg title={menu.id ? "Edit menu" : "Create menu"} onClose={() => setMenu(null)} onSave={() => act(() => saveMenu(hotelId, menu), "Menu saved", () => setMenu(null))}>
        <div className="grid grid-cols-2 gap-2"><Opt v={menu.meal!} set={v => setMenu({ ...menu, meal: v })} o={MEALS.map(x => [...x])} />
          <Opt v={menu.menu_date ? "date" : "weekly"} set={v => setMenu(v === "date" ? { ...menu, menu_date: today(), weekday: null } : { ...menu, menu_date: null, weekday: 1 })} o={[["date", "One date"], ["weekly", "Every week"]]} />
          {menu.menu_date ? <Input type="date" value={menu.menu_date} onChange={e => setMenu({ ...menu, menu_date: e.target.value })} /> : <Opt v={String(menu.weekday ?? 1)} set={v => setMenu({ ...menu, weekday: Number(v) })} o={["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => [String(i), d])} />}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!menu.is_special} onChange={e => setMenu({ ...menu, is_special: e.target.checked })} />Special meal</label>
          <Input type="time" value={menu.start_time?.slice(0, 5) ?? ""} onChange={e => setMenu({ ...menu, start_time: e.target.value })} /><Input type="time" value={menu.end_time?.slice(0, 5) ?? ""} onChange={e => setMenu({ ...menu, end_time: e.target.value })} /></div>
        <Input placeholder="Dishes, separated by commas" value={(menu.items ?? []).join(", ")} onChange={e => setMenu({ ...menu, items: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} /></Dlg>}
      {sub && data && <Dlg title={sub.id ? "Update subscription" : "Add subscription"} onClose={() => setSub(null)} onSave={() => act(() => saveSub(hotelId, { ...sub, price: sub.price ?? data.plans.find(p => p.id === sub.plan_id)?.price ?? 0 }), "Subscription saved", () => setSub(null))}>
        {!sub.id && data.residents.length > 0 && <Opt v={sub.long_stay_id ?? "none"} set={v => { const r = data.residents.find(x => x.id === v); setSub({ ...sub, long_stay_id: r?.id ?? null, person_name: r?.resident_name ?? sub.person_name, room_label: r?.unit_label ?? sub.room_label }); }} o={[["none", `Pick from ${cfg.people.toLowerCase()}`], ...data.residents.map(r => [r.id, `${r.resident_name}${r.unit_label ? ` · ${r.unit_label}` : ""}`])]} />}
        <div className="grid grid-cols-2 gap-2"><Input placeholder="Name" value={sub.person_name ?? ""} onChange={e => setSub({ ...sub, person_name: e.target.value })} /><Input placeholder="Room / bed" value={sub.room_label ?? ""} onChange={e => setSub({ ...sub, room_label: e.target.value })} />
          <Opt v={sub.plan_id!} set={v => setSub({ ...sub, plan_id: v, price: data.plans.find(p => p.id === v)?.price })} o={data.plans.map(p => [p.id, p.name])} />
          <Opt v={sub.diet!} set={v => setSub({ ...sub, diet: v })} o={[["veg", "Veg"], ["non_veg", "Non-veg"], ["jain", "Jain"], ["vegan", "Vegan"]]} />
          <label className="text-xs">Start<Input type="date" value={sub.start_date ?? ""} onChange={e => setSub({ ...sub, start_date: e.target.value })} /></label>
          <label className="text-xs">Price<Input type="number" min={0} value={sub.price ?? ""} onChange={e => setSub({ ...sub, price: Number(e.target.value) })} /></label>
          <Opt v={sub.status!} set={v => setSub({ ...sub, status: v })} o={[["active", "Active"], ["paused", "Paused"], ["cancelled", "Cancelled"]]} />
          {sub.status === "paused" && <label className="text-xs">Paused until<Input type="date" value={sub.paused_until ?? ""} onChange={e => setSub({ ...sub, paused_until: e.target.value })} /></label>}
          <label className="text-xs">Meal credits<Input type="number" min={0} value={sub.meal_credits ?? 0} onChange={e => setSub({ ...sub, meal_credits: Number(e.target.value) })} /></label></div>
        {sub.start_date && <p className="text-xs text-muted-foreground">This month's bill (prorated): {inr(proratedAmount(Number(sub.price ?? 0), sub.start_date, today().slice(0, 7) + "-01"))}</p>}</Dlg>}
      {req && <Dlg title="Add meal request" onClose={() => setReq(null)} onSave={() => act(() => saveRequest(hotelId, req), "Request added", () => setReq(null))}>
        <div className="grid grid-cols-2 gap-2"><Input placeholder="Name" value={req.person_name ?? ""} onChange={e => setReq({ ...req, person_name: e.target.value })} /><Input placeholder="Room" value={req.room_label ?? ""} onChange={e => setReq({ ...req, room_label: e.target.value })} />
          <Opt v={req.kind!} set={v => setReq({ ...req, kind: v })} o={cfg.requestKinds} /><Opt v={req.meal!} set={v => setReq({ ...req, meal: v })} o={MEALS.map(x => [...x])} />
          <Input type="date" value={req.for_date} onChange={e => setReq({ ...req, for_date: e.target.value })} /><Input type="number" min={1} value={req.quantity} onChange={e => setReq({ ...req, quantity: Number(e.target.value) })} />
          <label className="col-span-2 text-xs">Amount (₹)<Input type="number" min={0} value={req.amount} onChange={e => setReq({ ...req, amount: Number(e.target.value) })} /></label></div>
        <Input placeholder="Notes / dietary needs" value={req.notes ?? ""} onChange={e => setReq({ ...req, notes: e.target.value })} /></Dlg>}
      {pay && data && <Dlg title="Record payment" onClose={() => setPay(null)} onSave={() => act(() => recordPayment(hotelId, { ...pay, period: today().slice(0, 7) }), "Payment recorded", () => setPay(null))}>
        <Opt v={pay.subscription_id ?? "none"} set={v => setPay({ ...pay, subscription_id: v === "none" ? undefined : v, amount: Number(data.subs.find(s => s.id === v)?.price ?? pay.amount) })} o={[["none", "Walk-in / not linked"], ...data.subs.map(s => [s.id, s.person_name])]} />
        <div className="grid grid-cols-2 gap-2"><Input type="number" min={1} placeholder="Amount" value={pay.amount ?? ""} onChange={e => setPay({ ...pay, amount: Number(e.target.value) })} /><Opt v={pay.method} set={v => setPay({ ...pay, method: v })} o={[["upi", "UPI"], ["cash", "Cash"], ["card", "Card"], ["bank", "Bank transfer"], ["rent", "Added to rent"]]} /></div></Dlg>}
      {use && data && <Dlg title="Record ingredient use" onClose={() => setUse(null)} onSave={() => act(() => { if (!use.item_id) throw new Error("Choose an item"); return recordIngredientUse(hotelId, use.item_id, Number(use.qty), mealLabel(use.meal)); }, "Stock updated", () => setUse(null))}>
        <Opt v={use.item_id ?? ""} set={v => setUse({ ...use, item_id: v })} o={data.items.map(i => [i.id, `${i.name} (${i.current_stock} ${i.unit})`])} />
        <div className="grid grid-cols-2 gap-2"><Input type="number" min={0} placeholder="Quantity used" value={use.qty ?? ""} onChange={e => setUse({ ...use, qty: Number(e.target.value) })} /><Opt v={use.meal} set={v => setUse({ ...use, meal: v })} o={MEALS.map(x => [...x])} /></div></Dlg>}
      {guest && <Dlg title="Record guest / walk-in meal" onClose={() => setGuest(null)} onSave={() => act(() => { if (!guest.name.trim()) throw new Error("Name is required"); return recordGuestMeal(hotelId, guest.name.trim(), guest.meal, day); }, "Meal recorded", () => setGuest(null))}>
        <Input placeholder="Name" value={guest.name} onChange={e => setGuest({ ...guest, name: e.target.value })} /><Opt v={guest.meal} set={v => setGuest({ ...guest, meal: v })} o={MEALS.map(x => [...x])} /></Dlg>}
    </div>
  );
}

function MenuCards({ meals, day }: { meals: { k: string; l: string; menu?: Menu }[]; day: string }) {
  return <section className="rounded-xl border bg-card p-3"><h3 className="mb-2 font-semibold">Menu – {new Date(day + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}</h3>
    {meals.length ? <div className="grid gap-2 sm:grid-cols-3">{meals.map(x => <div key={x.k} className="rounded-lg bg-muted/60 p-3 text-sm"><b>{x.l}</b><div className="text-[11px] text-muted-foreground">{x.menu!.start_time?.slice(0, 5)}{x.menu!.end_time ? ` – ${x.menu!.end_time.slice(0, 5)}` : ""}</div><ul className="mt-1 list-disc pl-4 text-xs">{x.menu!.items.map(i => <li key={i}>{i}</li>)}</ul></div>)}</div> : <p className="py-6 text-center text-sm text-muted-foreground">No menu set for this day.</p>}</section>;
}
function PlanSummary({ data, onEdit }: { data: Data; onEdit?: (p: MealPlan) => void }) {
  const live = data.subs.filter(s => s.status === "active");
  return <section className="rounded-xl border bg-card p-3"><h3 className="mb-2 font-semibold">Meal Plan Summary</h3>
    {data.plans.length ? <table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1">Plan</th><th>Price</th><th>Subscribers</th><th>Revenue</th>{onEdit && <th />}</tr></thead><tbody>{data.plans.map(p => { const n = live.filter(s => s.plan_id === p.id); return <tr key={p.id} className="border-t"><td className="py-1.5">{p.name}<div className="text-[10px] text-muted-foreground">{p.meals.map(mealLabel).join(" + ")}</div></td><td>{inr(Number(p.price))}/{p.period}</td><td>{n.length}</td><td>{inr(n.reduce((s, x) => s + Number(x.price || p.price), 0))}</td>{onEdit && <td><Button size="sm" variant="ghost" onClick={() => onEdit(p)}>Edit</Button></td>}</tr>; })}</tbody></table> : <p className="py-6 text-center text-sm text-muted-foreground">No meal plans yet.</p>}</section>;
}
function Opt({ v, set, o }: { v: string; set: (v: string) => void; o: (string[] | readonly string[])[] }) {
  return <Select value={v} onValueChange={set}><SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger><SelectContent>{o.map(([a, b]) => <SelectItem key={a} value={a}>{b}</SelectItem>)}</SelectContent></Select>;
}
function Dlg({ title, onClose, onSave, children }: { title: string; onClose: () => void; onSave: () => void; children: React.ReactNode }) {
  return <Dialog open onOpenChange={onClose}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader><div className="space-y-2">{children}</div><DialogFooter><Button onClick={onSave}>Save</Button></DialogFooter></DialogContent></Dialog>;
}
