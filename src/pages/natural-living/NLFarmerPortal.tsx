import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import NLLayout from "@/features/natural-living/NLLayout";
import { Section } from "@/features/natural-living/ui";
import NLProtectedRoute from "@/features/natural-living/NLProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { useNLAuth } from "@/features/natural-living/useNLAuth";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, Sprout, Package, CalendarDays, Wallet, TrendingUp, Bot,
  Plus, Send, IndianRupee, ShoppingBasket, Leaf,
} from "lucide-react";

const sb = supabase as any;
type TabKey = "overview" | "orders" | "calendar" | "expenses" | "harvest" | "assistant";

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "overview", label: "Overview", icon: TrendingUp },
  { key: "orders", label: "Orders", icon: Package },
  { key: "calendar", label: "Crop Calendar", icon: CalendarDays },
  { key: "expenses", label: "Expenses", icon: Wallet },
  { key: "harvest", label: "Harvest", icon: ShoppingBasket },
  { key: "assistant", label: "AI Assistant", icon: Bot },
];

function useFarms(userId?: string) {
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const { data } = await sb.from("nl_farms").select("*").eq("owner_user_id", userId).order("created_at", { ascending: false });
      setFarms(data ?? []);
      setLoading(false);
    })();
  }, [userId]);
  return { farms, loading };
}

/* ---------- Overview ---------- */
function OverviewTab({ farmId }: { farmId: string }) {
  const [stats, setStats] = useState({ subs: 0, revenue: 0, expenses: 0, harvestKg: 0, plots: 0, crops: 0 });
  useEffect(() => {
    (async () => {
      const [{ data: subs }, { data: exp }, { data: har }, { data: plots }] = await Promise.all([
        sb.from("nl_subscriptions").select("amount_paid,status").eq("farm_id", farmId),
        sb.from("nl_farm_expenses").select("amount").eq("farm_id", farmId),
        sb.from("nl_farm_harvests").select("quantity_kg,total_revenue").eq("farm_id", farmId),
        sb.from("nl_plots").select("id").eq("farm_id", farmId),
      ]);
      const plotIds = (plots ?? []).map((p: any) => p.id);
      let crops = 0;
      if (plotIds.length) {
        const { count } = await sb.from("nl_crops").select("id", { count: "exact", head: true }).in("plot_id", plotIds);
        crops = count ?? 0;
      }
      setStats({
        subs: (subs ?? []).filter((s: any) => s.status === "active").length,
        revenue: (subs ?? []).reduce((a: number, s: any) => a + (s.amount_paid ?? 0), 0)
          + (har ?? []).reduce((a: number, h: any) => a + (h.total_revenue ?? 0), 0),
        expenses: (exp ?? []).reduce((a: number, e: any) => a + Number(e.amount ?? 0), 0),
        harvestKg: (har ?? []).reduce((a: number, h: any) => a + Number(h.quantity_kg ?? 0), 0),
        plots: (plots ?? []).length,
        crops,
      });
    })();
  }, [farmId]);

  const tiles = [
    { label: "Active subscribers", value: stats.subs, icon: Package },
    { label: "Total revenue", value: `₹${stats.revenue.toLocaleString()}`, icon: IndianRupee },
    { label: "Total expenses", value: `₹${stats.expenses.toLocaleString()}`, icon: Wallet },
    { label: "Harvest to date", value: `${stats.harvestKg} kg`, icon: ShoppingBasket },
    { label: "Plots", value: stats.plots, icon: Leaf },
    { label: "Crops", value: stats.crops, icon: Sprout },
  ];
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <div key={t.label} className="border border-[hsl(var(--nl-forest)/0.2)] bg-[hsl(var(--nl-cream))] p-5">
            <div className="flex items-center gap-2 text-[hsl(var(--nl-forest))] mb-3"><Icon className="h-4 w-4" /><span className="text-xs uppercase tracking-widest">{t.label}</span></div>
            <div className="nl-serif text-3xl">{t.value}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Orders ---------- */
function OrdersTab({ farmId }: { farmId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await sb
        .from("nl_subscriptions")
        .select("*, plan:nl_subscription_plans(name,tier,frequency,price)")
        .eq("farm_id", farmId)
        .order("created_at", { ascending: false });
      setRows(data ?? []);
      setLoading(false);
    })();
  }, [farmId]);
  if (loading) return <Loader2 className="h-5 w-5 animate-spin" />;
  if (rows.length === 0) return <p className="text-sm text-[hsl(var(--nl-muted))]">No subscribers yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-widest text-[hsl(var(--nl-muted))]">
          <tr><th className="py-2">Plan</th><th>City</th><th>Since</th><th>Amount</th><th>Status</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-[hsl(var(--nl-forest)/0.1)]">
              <td className="py-3">{r.plan?.name} <span className="text-xs text-[hsl(var(--nl-muted))]">({r.plan?.frequency})</span></td>
              <td>{r.delivery_city ?? "—"}</td>
              <td>{new Date(r.starts_on).toLocaleDateString()}</td>
              <td>₹{Number(r.amount_paid ?? 0).toLocaleString()}</td>
              <td className={r.status === "active" ? "text-[hsl(var(--nl-forest))]" : "text-[hsl(var(--nl-muted))]"}>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Crop Calendar ---------- */
function CalendarTab({ farmId }: { farmId: string }) {
  const [crops, setCrops] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data: plots } = await sb.from("nl_plots").select("id,name").eq("farm_id", farmId);
      const ids = (plots ?? []).map((p: any) => p.id);
      if (!ids.length) return setCrops([]);
      const { data } = await sb.from("nl_crops").select("*").in("plot_id", ids).order("expected_harvest_at");
      const named = (data ?? []).map((c: any) => ({ ...c, plot_name: plots?.find((p: any) => p.id === c.plot_id)?.name }));
      setCrops(named);
    })();
  }, [farmId]);
  if (crops.length === 0) return <p className="text-sm text-[hsl(var(--nl-muted))]">No crops planted yet. Add them under My Farms.</p>;
  const today = new Date();
  return (
    <div className="space-y-3">
      {crops.map((c) => {
        const harvest = c.expected_harvest_at ? new Date(c.expected_harvest_at) : null;
        const days = harvest ? Math.ceil((harvest.getTime() - today.getTime()) / 86400000) : null;
        return (
          <div key={c.id} className="border border-[hsl(var(--nl-forest)/0.2)] bg-[hsl(var(--nl-cream))] p-5 flex justify-between items-center">
            <div>
              <h4 className="nl-serif text-xl">{c.name} {c.variety && <span className="text-sm text-[hsl(var(--nl-muted))]">· {c.variety}</span>}</h4>
              <div className="text-xs text-[hsl(var(--nl-muted))] mt-1">
                {c.plot_name} · {c.season ?? "—"} · Status: {c.status}
              </div>
              <div className="text-xs mt-1">
                {c.planted_at ? `Planted ${c.planted_at}` : "Not planted"} · {c.expected_harvest_at ? `Harvest ${c.expected_harvest_at}` : "No harvest date"}
              </div>
            </div>
            {days !== null && (
              <div className="text-right">
                <div className="nl-serif text-2xl" style={{ color: days < 0 ? "hsl(var(--nl-muted))" : "hsl(var(--nl-forest))" }}>
                  {days < 0 ? "past" : `${days}d`}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-[hsl(var(--nl-muted))]">to harvest</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Expenses ---------- */
function ExpensesTab({ farmId }: { farmId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ category: "Seeds", amount: "", description: "", spent_on: new Date().toISOString().slice(0, 10) });

  const load = async () => {
    const { data } = await sb.from("nl_farm_expenses").select("*").eq("farm_id", farmId).order("spent_on", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { void load(); }, [farmId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("nl_farm_expenses").insert({ farm_id: farmId, ...form, amount: Number(form.amount || 0) });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setForm({ category: "Seeds", amount: "", description: "", spent_on: new Date().toISOString().slice(0, 10) });
    void load();
  };

  const remove = async (id: string) => {
    await sb.from("nl_farm_expenses").delete().eq("id", id);
    void load();
  };

  const total = rows.reduce((a, r) => a + Number(r.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="grid md:grid-cols-5 gap-2 border border-[hsl(var(--nl-forest)/0.2)] p-4 bg-[hsl(var(--nl-cream))]">
        <select className="border p-2 text-sm bg-white" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          <option>Seeds</option><option>Labour</option><option>Fertilizer</option><option>Irrigation</option><option>Fuel</option><option>Tools</option><option>Other</option>
        </select>
        <input type="number" placeholder="Amount ₹" className="border p-2 text-sm bg-white" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        <input type="date" className="border p-2 text-sm bg-white" value={form.spent_on} onChange={(e) => setForm({ ...form, spent_on: e.target.value })} />
        <input placeholder="Notes" className="border p-2 text-sm bg-white md:col-span-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button className="nl-btn nl-btn-primary justify-center"><Plus className="h-4 w-4" /> Add</button>
      </form>
      <div className="text-sm">Total expenses: <span className="nl-serif text-2xl" style={{ color: "hsl(var(--nl-forest))" }}>₹{total.toLocaleString()}</span></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-widest text-[hsl(var(--nl-muted))]">
            <tr><th className="py-2">Date</th><th>Category</th><th>Amount</th><th>Notes</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[hsl(var(--nl-forest)/0.1)]">
                <td className="py-2">{r.spent_on}</td>
                <td>{r.category}</td>
                <td>₹{Number(r.amount).toLocaleString()}</td>
                <td className="text-[hsl(var(--nl-muted))]">{r.description}</td>
                <td className="text-right"><button onClick={() => remove(r.id)} className="text-xs text-[hsl(var(--nl-muted))] hover:text-destructive">Delete</button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="py-4 text-sm text-[hsl(var(--nl-muted))]">No expenses yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Harvest ---------- */
function HarvestTab({ farmId }: { farmId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [form, setForm] = useState({ crop_id: "", quantity_kg: "", quality_grade: "A", price_per_kg: "", harvest_date: new Date().toISOString().slice(0, 10), notes: "" });

  const load = async () => {
    const [{ data: h }, { data: plots }] = await Promise.all([
      sb.from("nl_farm_harvests").select("*").eq("farm_id", farmId).order("harvest_date", { ascending: false }),
      sb.from("nl_plots").select("id").eq("farm_id", farmId),
    ]);
    setRows(h ?? []);
    const ids = (plots ?? []).map((p: any) => p.id);
    if (ids.length) {
      const { data: c } = await sb.from("nl_crops").select("id,name,plot_id").in("plot_id", ids);
      setCrops(c ?? []);
    }
  };
  useEffect(() => { void load(); }, [farmId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const crop = crops.find((c) => c.id === form.crop_id);
    const qty = Number(form.quantity_kg || 0);
    const price = form.price_per_kg ? Number(form.price_per_kg) : null;
    const { error } = await sb.from("nl_farm_harvests").insert({
      farm_id: farmId,
      crop_id: form.crop_id || null,
      plot_id: crop?.plot_id ?? null,
      quantity_kg: qty,
      quality_grade: form.quality_grade,
      price_per_kg: price,
      total_revenue: price ? price * qty : null,
      harvest_date: form.harvest_date,
      notes: form.notes,
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setForm({ crop_id: "", quantity_kg: "", quality_grade: "A", price_per_kg: "", harvest_date: new Date().toISOString().slice(0, 10), notes: "" });
    void load();
  };

  const totalKg = rows.reduce((a, r) => a + Number(r.quantity_kg ?? 0), 0);
  const totalRev = rows.reduce((a, r) => a + Number(r.total_revenue ?? 0), 0);

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="grid md:grid-cols-6 gap-2 border border-[hsl(var(--nl-forest)/0.2)] p-4 bg-[hsl(var(--nl-cream))]">
        <select required className="border p-2 text-sm bg-white" value={form.crop_id} onChange={(e) => setForm({ ...form, crop_id: e.target.value })}>
          <option value="">Crop…</option>
          {crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input required type="number" placeholder="Qty (kg)" className="border p-2 text-sm bg-white" value={form.quantity_kg} onChange={(e) => setForm({ ...form, quantity_kg: e.target.value })} />
        <select className="border p-2 text-sm bg-white" value={form.quality_grade} onChange={(e) => setForm({ ...form, quality_grade: e.target.value })}>
          <option>A</option><option>B</option><option>C</option>
        </select>
        <input type="number" placeholder="₹/kg" className="border p-2 text-sm bg-white" value={form.price_per_kg} onChange={(e) => setForm({ ...form, price_per_kg: e.target.value })} />
        <input type="date" className="border p-2 text-sm bg-white" value={form.harvest_date} onChange={(e) => setForm({ ...form, harvest_date: e.target.value })} />
        <button className="nl-btn nl-btn-primary justify-center"><Plus className="h-4 w-4" /> Log</button>
      </form>
      <div className="grid grid-cols-2 gap-4">
        <div className="border p-4 bg-[hsl(var(--nl-cream))]"><div className="text-xs uppercase tracking-widest text-[hsl(var(--nl-muted))]">Total harvest</div><div className="nl-serif text-2xl" style={{ color: "hsl(var(--nl-forest))" }}>{totalKg} kg</div></div>
        <div className="border p-4 bg-[hsl(var(--nl-cream))]"><div className="text-xs uppercase tracking-widest text-[hsl(var(--nl-muted))]">Harvest revenue</div><div className="nl-serif text-2xl" style={{ color: "hsl(var(--nl-forest))" }}>₹{totalRev.toLocaleString()}</div></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-widest text-[hsl(var(--nl-muted))]">
            <tr><th className="py-2">Date</th><th>Crop</th><th>Qty</th><th>Grade</th><th>₹/kg</th><th>Revenue</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[hsl(var(--nl-forest)/0.1)]">
                <td className="py-2">{r.harvest_date}</td>
                <td>{crops.find((c) => c.id === r.crop_id)?.name ?? "—"}</td>
                <td>{r.quantity_kg} kg</td>
                <td>{r.quality_grade}</td>
                <td>{r.price_per_kg ? `₹${r.price_per_kg}` : "—"}</td>
                <td>{r.total_revenue ? `₹${Number(r.total_revenue).toLocaleString()}` : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="py-4 text-sm text-[hsl(var(--nl-muted))]">No harvest logged yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- AI Assistant ---------- */
function AssistantTab({ farm }: { farm: any }) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: `Namaste! I'm your farming assistant. Ask me about crops, pests, soil, irrigation, seasons, or market prices for ${farm.name}.` },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || busy) return;
    const user = { role: "user" as const, content: input.trim() };
    setMessages((m) => [...m, user]);
    setInput("");
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("nl-farmer-assistant", {
      body: {
        messages: [...messages, user].map((m) => ({ role: m.role, content: m.content })),
        context: {
          farm: farm.name,
          area_acres: farm.total_area_acres,
          method: farm.farming_method,
          certification: farm.certification,
        },
      },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: "AI error", description: (error?.message) || (data as any)?.error || "Try again", variant: "destructive" });
      return;
    }
    setMessages((m) => [...m, { role: "assistant", content: (data as any).reply || "…" }]);
  };

  return (
    <div className="border border-[hsl(var(--nl-forest)/0.2)] bg-[hsl(var(--nl-cream))] flex flex-col h-[60vh]">
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-4 py-3 text-sm whitespace-pre-wrap ${m.role === "user"
              ? "bg-[hsl(var(--nl-forest))] text-[hsl(var(--nl-cream))]"
              : "bg-white border border-[hsl(var(--nl-forest)/0.15)]"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && <div className="text-xs text-[hsl(var(--nl-muted))] flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> thinking…</div>}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-[hsl(var(--nl-forest)/0.15)] p-3 flex gap-2">
        <input
          className="flex-1 border p-2 text-sm bg-white"
          placeholder="Ask about your crops, pests, weather…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          disabled={busy}
        />
        <button onClick={send} disabled={busy || !input.trim()} className="nl-btn nl-btn-primary"><Send className="h-4 w-4" /> Send</button>
      </div>
    </div>
  );
}

/* ---------- Portal shell ---------- */
function Inner() {
  const { user } = useNLAuth();
  const { farms, loading } = useFarms(user?.id);
  const [farmId, setFarmId] = useState<string>("");
  const [tab, setTab] = useState<TabKey>("overview");

  useEffect(() => { if (!farmId && farms[0]) setFarmId(farms[0].id); }, [farms, farmId]);
  const farm = useMemo(() => farms.find((f) => f.id === farmId), [farms, farmId]);

  return (
    <NLLayout>
      <Section>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="nl-eyebrow mb-2">Farmer Portal</div>
            <h1 className="nl-serif text-4xl md:text-5xl">Run your farm.</h1>
          </div>
          <div className="flex gap-2 items-center">
            {farms.length > 0 && (
              <select value={farmId} onChange={(e) => setFarmId(e.target.value)} className="border p-2 text-sm bg-white">
                {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            )}
            <Link to="/natural-living/my-farms" className="nl-btn nl-btn-outline">Manage farms</Link>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(var(--nl-forest))" }} /></div>
        ) : farms.length === 0 ? (
          <div className="border border-dashed border-[hsl(var(--nl-forest)/0.3)] p-12 text-center">
            <Sprout className="h-8 w-8 mx-auto mb-3" style={{ color: "hsl(var(--nl-forest))" }} />
            <p className="text-sm text-[hsl(var(--nl-ink)/0.7)] mb-4">Register a farm first to open the portal.</p>
            <Link to="/natural-living/my-farms" className="nl-btn nl-btn-primary">Register farm</Link>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1 border-b border-[hsl(var(--nl-forest)/0.2)] mb-6">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors ${active
                      ? "border-[hsl(var(--nl-forest))] text-[hsl(var(--nl-forest))]"
                      : "border-transparent text-[hsl(var(--nl-ink)/0.7)] hover:text-[hsl(var(--nl-forest))]"}`}>
                    <Icon className="h-4 w-4" /> {t.label}
                  </button>
                );
              })}
            </div>

            {farm && tab === "overview" && <OverviewTab farmId={farm.id} />}
            {farm && tab === "orders" && <OrdersTab farmId={farm.id} />}
            {farm && tab === "calendar" && <CalendarTab farmId={farm.id} />}
            {farm && tab === "expenses" && <ExpensesTab farmId={farm.id} />}
            {farm && tab === "harvest" && <HarvestTab farmId={farm.id} />}
            {farm && tab === "assistant" && <AssistantTab farm={farm} />}
          </>
        )}
      </Section>
    </NLLayout>
  );
}

export default function NLFarmerPortal() {
  return <NLProtectedRoute><Inner /></NLProtectedRoute>;
}
