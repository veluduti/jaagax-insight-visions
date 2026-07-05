import { useEffect, useMemo, useState } from "react";
import NLLayout from "@/features/natural-living/NLLayout";
import NLProtectedRoute from "@/features/natural-living/NLProtectedRoute";
import { Section, Eyebrow, H1, Lede } from "@/features/natural-living/ui";
import { supabase } from "@/integrations/supabase/client";
import { useNLAuth } from "@/features/natural-living/useNLAuth";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, Sprout, ListTodo, Users, CalendarCheck, Boxes,
  Plus, Trash2, ArrowUp, ArrowDown, Check, AlertTriangle,
} from "lucide-react";

const sb = supabase as any;

type Tab = "overview" | "tasks" | "workers" | "attendance" | "inventory";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "overview",   label: "Overview",   icon: Sprout },
  { key: "tasks",      label: "Tasks",      icon: ListTodo },
  { key: "workers",    label: "Workers",    icon: Users },
  { key: "attendance", label: "Attendance", icon: CalendarCheck },
  { key: "inventory",  label: "Inventory",  icon: Boxes },
];

/* -------------------------------- Overview -------------------------------- */
function Overview({ farmId }: { farmId: string }) {
  const [stats, setStats] = useState({ tasksOpen: 0, workers: 0, presentToday: 0, lowStock: 0, monthWages: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = new Date(); monthStart.setDate(1);
      const [{ data: t }, { data: w }, { data: a }, { data: inv }, { data: wages }] = await Promise.all([
        sb.from("nl_farm_tasks").select("id,status").eq("farm_id", farmId),
        sb.from("nl_farm_workers").select("id").eq("farm_id", farmId).eq("is_active", true),
        sb.from("nl_worker_attendance").select("id,status").eq("farm_id", farmId).eq("attendance_date", today),
        sb.from("nl_farm_inventory").select("id,quantity,reorder_level").eq("farm_id", farmId),
        sb.from("nl_worker_attendance").select("wage_paid").eq("farm_id", farmId).gte("attendance_date", monthStart.toISOString().slice(0, 10)),
      ]);
      setStats({
        tasksOpen: (t ?? []).filter((x: any) => x.status !== "completed").length,
        workers: (w ?? []).length,
        presentToday: (a ?? []).filter((x: any) => x.status === "present" || x.status === "half_day").length,
        lowStock: (inv ?? []).filter((x: any) => Number(x.quantity) <= Number(x.reorder_level)).length,
        monthWages: (wages ?? []).reduce((s: number, r: any) => s + Number(r.wage_paid || 0), 0),
      });
      setLoading(false);
    })();
  }, [farmId]);

  if (loading) return <div className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin inline" /></div>;

  const items = [
    { label: "Open tasks", value: stats.tasksOpen },
    { label: "Active workers", value: stats.workers },
    { label: "Present today", value: stats.presentToday },
    { label: "Low-stock items", value: stats.lowStock },
    { label: "Wages this month", value: "₹" + stats.monthWages.toLocaleString("en-IN") },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
      {items.map((i) => (
        <div key={i.label} className="p-6 border border-[hsl(var(--nl-forest)/0.2)] bg-[hsl(var(--nl-cream-deep))]">
          <div className="text-xs uppercase tracking-widest text-[hsl(var(--nl-muted))]">{i.label}</div>
          <div className="mt-3 nl-serif text-3xl">{i.value}</div>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------- Tasks --------------------------------- */
function Tasks({ farmId, userId }: { farmId: string; userId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", category: "general", priority: "medium", due_date: "" });

  const load = async () => {
    setLoading(true);
    const { data } = await sb.from("nl_farm_tasks").select("*").eq("farm_id", farmId).order("created_at", { ascending: false });
    setRows(data ?? []); setLoading(false);
  };
  useEffect(() => { void load(); }, [farmId]);

  const add = async () => {
    if (!form.title.trim()) return toast({ title: "Add a task title" });
    const { error } = await sb.from("nl_farm_tasks").insert({
      farm_id: farmId, created_by: userId, title: form.title,
      category: form.category, priority: form.priority,
      due_date: form.due_date || null,
    });
    if (error) return toast({ title: "Could not add task", description: error.message, variant: "destructive" });
    setForm({ title: "", category: "general", priority: "medium", due_date: "" });
    await load();
  };

  const setStatus = async (id: string, status: string) => {
    await sb.from("nl_farm_tasks").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", id);
    await load();
  };
  const remove = async (id: string) => { await sb.from("nl_farm_tasks").delete().eq("id", id); await load(); };

  return (
    <div className="space-y-6">
      <div className="p-5 border border-[hsl(var(--nl-forest)/0.2)] bg-[hsl(var(--nl-cream-deep))]">
        <div className="grid gap-3 md:grid-cols-5">
          <input className="nl-input md:col-span-2" placeholder="Task title (e.g. Prune tomato plants)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="nl-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {["general","planting","irrigation","harvest","pest","packaging","delivery","maintenance"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="nl-input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {["low","medium","high","urgent"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="nl-input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
        </div>
        <button className="nl-btn nl-btn-primary mt-3" onClick={add}><Plus className="h-4 w-4 mr-2" />Add task</button>
      </div>

      {loading ? <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin inline" /></div> :
       rows.length === 0 ? <p className="text-sm text-[hsl(var(--nl-muted))]">No tasks yet.</p> : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-4 p-4 border border-[hsl(var(--nl-forest)/0.2)] bg-[hsl(var(--nl-cream))]">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="nl-serif text-lg">{r.title}</span>
                  <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 border border-[hsl(var(--nl-forest)/0.3)]">{r.category}</span>
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${r.priority === 'urgent' || r.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-[hsl(var(--nl-forest)/0.1)]'}`}>{r.priority}</span>
                </div>
                <div className="text-xs text-[hsl(var(--nl-muted))] mt-1">
                  Due {r.due_date ?? "—"} · Status: {r.status}
                </div>
              </div>
              <div className="flex gap-2">
                {r.status !== "completed" ? (
                  <button className="nl-btn nl-btn-outline" onClick={() => setStatus(r.id, "completed")}><Check className="h-4 w-4" /></button>
                ) : (
                  <button className="nl-btn nl-btn-outline" onClick={() => setStatus(r.id, "pending")}>Re-open</button>
                )}
                <button className="nl-btn nl-btn-outline" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Workers -------------------------------- */
function Workers({ farmId, onRefresh }: { farmId: string; onRefresh?: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", phone: "", role: "labourer", daily_wage: "" });

  const load = async () => {
    setLoading(true);
    const { data } = await sb.from("nl_farm_workers").select("*").eq("farm_id", farmId).order("created_at", { ascending: false });
    setRows(data ?? []); setLoading(false);
  };
  useEffect(() => { void load(); }, [farmId]);

  const add = async () => {
    if (!form.name.trim()) return toast({ title: "Add worker name" });
    const { error } = await sb.from("nl_farm_workers").insert({
      farm_id: farmId, name: form.name, phone: form.phone || null,
      role: form.role, daily_wage: Number(form.daily_wage || 0),
    });
    if (error) return toast({ title: "Could not add worker", description: error.message, variant: "destructive" });
    setForm({ name: "", phone: "", role: "labourer", daily_wage: "" });
    await load(); onRefresh?.();
  };

  const toggle = async (r: any) => { await sb.from("nl_farm_workers").update({ is_active: !r.is_active }).eq("id", r.id); await load(); };
  const remove = async (id: string) => { await sb.from("nl_farm_workers").delete().eq("id", id); await load(); };

  return (
    <div className="space-y-6">
      <div className="p-5 border border-[hsl(var(--nl-forest)/0.2)] bg-[hsl(var(--nl-cream-deep))]">
        <div className="grid gap-3 md:grid-cols-5">
          <input className="nl-input md:col-span-2" placeholder="Worker full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="nl-input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <select className="nl-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {["labourer","supervisor","irrigation","harvester","packer","driver"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="nl-input" type="number" placeholder="Daily wage (₹)" value={form.daily_wage} onChange={(e) => setForm({ ...form, daily_wage: e.target.value })} />
        </div>
        <button className="nl-btn nl-btn-primary mt-3" onClick={add}><Plus className="h-4 w-4 mr-2" />Add worker</button>
      </div>

      {loading ? <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin inline" /></div> :
       rows.length === 0 ? <p className="text-sm text-[hsl(var(--nl-muted))]">No workers yet.</p> : (
        <div className="overflow-x-auto border border-[hsl(var(--nl-forest)/0.2)]">
          <table className="w-full text-sm">
            <thead className="bg-[hsl(var(--nl-cream-deep))] text-left text-xs uppercase tracking-widest">
              <tr>
                {["Name","Phone","Role","Daily wage","Status","Actions"].map(h => <th key={h} className="p-3">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[hsl(var(--nl-forest)/0.15)]">
                  <td className="p-3 nl-serif text-base">{r.name}</td>
                  <td className="p-3">{r.phone || "—"}</td>
                  <td className="p-3">{r.role}</td>
                  <td className="p-3">₹{Number(r.daily_wage).toLocaleString("en-IN")}</td>
                  <td className="p-3">{r.is_active ? "Active" : "Inactive"}</td>
                  <td className="p-3 flex gap-2">
                    <button className="nl-btn nl-btn-outline" onClick={() => toggle(r)}>{r.is_active ? "Deactivate" : "Activate"}</button>
                    <button className="nl-btn nl-btn-outline" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Attendance ------------------------------ */
function Attendance({ farmId }: { farmId: string }) {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [workers, setWorkers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: w }, { data: a }] = await Promise.all([
      sb.from("nl_farm_workers").select("*").eq("farm_id", farmId).eq("is_active", true).order("name"),
      sb.from("nl_worker_attendance").select("*").eq("farm_id", farmId).eq("attendance_date", date),
    ]);
    setWorkers(w ?? []);
    const map: any = {}; (a ?? []).forEach((r: any) => (map[r.worker_id] = r));
    setAttendance(map); setLoading(false);
  };
  useEffect(() => { void load(); }, [farmId, date]);

  const mark = async (worker: any, status: string) => {
    const wage = status === "present" ? Number(worker.daily_wage) :
                 status === "half_day" ? Number(worker.daily_wage) / 2 : 0;
    const existing = attendance[worker.id];
    if (existing) {
      await sb.from("nl_worker_attendance").update({ status, wage_paid: wage }).eq("id", existing.id);
    } else {
      await sb.from("nl_worker_attendance").insert({
        worker_id: worker.id, farm_id: farmId, attendance_date: date, status, wage_paid: wage,
      });
    }
    await load();
  };

  const total = Object.values(attendance).reduce((s: number, r: any) => s + Number(r.wage_paid || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 p-5 border border-[hsl(var(--nl-forest)/0.2)] bg-[hsl(var(--nl-cream-deep))]">
        <label className="text-xs uppercase tracking-widest text-[hsl(var(--nl-muted))]">Date</label>
        <input className="nl-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="ml-auto text-sm">Wages payable: <span className="nl-serif text-xl">₹{total.toLocaleString("en-IN")}</span></div>
      </div>
      {loading ? <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin inline" /></div> :
       workers.length === 0 ? <p className="text-sm text-[hsl(var(--nl-muted))]">Add active workers to mark attendance.</p> : (
        <div className="space-y-2">
          {workers.map((w) => {
            const rec = attendance[w.id];
            return (
              <div key={w.id} className="flex items-center justify-between gap-4 p-4 border border-[hsl(var(--nl-forest)/0.2)] bg-[hsl(var(--nl-cream))]">
                <div>
                  <div className="nl-serif text-lg">{w.name}</div>
                  <div className="text-xs text-[hsl(var(--nl-muted))]">{w.role} · ₹{Number(w.daily_wage).toLocaleString("en-IN")}/day</div>
                </div>
                <div className="flex items-center gap-2">
                  {["present","half_day","absent"].map((s) => (
                    <button key={s}
                      className={`nl-btn ${rec?.status === s ? "nl-btn-primary" : "nl-btn-outline"}`}
                      onClick={() => mark(w, s)}>
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Inventory ------------------------------ */
function Inventory({ farmId, userId }: { farmId: string; userId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ item_name: "", category: "seeds", quantity: "", unit: "kg", reorder_level: "", unit_cost: "", supplier: "" });
  const [moveFor, setMoveFor] = useState<any | null>(null);
  const [moveForm, setMoveForm] = useState({ movement_type: "in", quantity: "", cost: "", reason: "" });

  const load = async () => {
    setLoading(true);
    const { data } = await sb.from("nl_farm_inventory").select("*").eq("farm_id", farmId).order("item_name");
    setRows(data ?? []); setLoading(false);
  };
  useEffect(() => { void load(); }, [farmId]);

  const add = async () => {
    if (!form.item_name.trim()) return toast({ title: "Add an item name" });
    const { error } = await sb.from("nl_farm_inventory").insert({
      farm_id: farmId, item_name: form.item_name, category: form.category,
      quantity: Number(form.quantity || 0), unit: form.unit,
      reorder_level: Number(form.reorder_level || 0), unit_cost: Number(form.unit_cost || 0),
      supplier: form.supplier || null,
    });
    if (error) return toast({ title: "Could not add item", description: error.message, variant: "destructive" });
    setForm({ item_name: "", category: "seeds", quantity: "", unit: "kg", reorder_level: "", unit_cost: "", supplier: "" });
    await load();
  };

  const commitMovement = async () => {
    if (!moveFor) return;
    const q = Number(moveForm.quantity || 0);
    if (!q) return toast({ title: "Enter a quantity" });
    const newQty = moveForm.movement_type === "in" ? Number(moveFor.quantity) + q : Number(moveFor.quantity) - q;
    if (newQty < 0) return toast({ title: "Not enough stock", variant: "destructive" });
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      sb.from("nl_inventory_movements").insert({
        inventory_id: moveFor.id, farm_id: farmId, movement_type: moveForm.movement_type,
        quantity: q, cost: Number(moveForm.cost || 0), reason: moveForm.reason || null, performed_by: userId,
      }),
      sb.from("nl_farm_inventory").update({ quantity: newQty }).eq("id", moveFor.id),
    ]);
    if (e1 || e2) return toast({ title: "Could not record", description: (e1 || e2)?.message, variant: "destructive" });
    setMoveFor(null); setMoveForm({ movement_type: "in", quantity: "", cost: "", reason: "" });
    await load();
  };

  const remove = async (id: string) => { await sb.from("nl_farm_inventory").delete().eq("id", id); await load(); };

  return (
    <div className="space-y-6">
      <div className="p-5 border border-[hsl(var(--nl-forest)/0.2)] bg-[hsl(var(--nl-cream-deep))]">
        <div className="grid gap-3 md:grid-cols-4">
          <input className="nl-input md:col-span-2" placeholder="Item name (e.g. Neem cake)" value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
          <select className="nl-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {["seeds","fertilizer","pesticide","tools","equipment","packaging","other"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="nl-input" type="number" placeholder="Opening qty" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <input className="nl-input" placeholder="Unit (kg, L, pcs)" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          <input className="nl-input" type="number" placeholder="Reorder level" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} />
          <input className="nl-input" type="number" placeholder="Unit cost (₹)" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
          <input className="nl-input md:col-span-2" placeholder="Supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
        </div>
        <button className="nl-btn nl-btn-primary mt-3" onClick={add}><Plus className="h-4 w-4 mr-2" />Add item</button>
      </div>

      {loading ? <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin inline" /></div> :
       rows.length === 0 ? <p className="text-sm text-[hsl(var(--nl-muted))]">No inventory items yet.</p> : (
        <div className="space-y-3">
          {rows.map((r) => {
            const low = Number(r.quantity) <= Number(r.reorder_level);
            return (
              <div key={r.id} className="p-4 border border-[hsl(var(--nl-forest)/0.2)] bg-[hsl(var(--nl-cream))]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="nl-serif text-lg">{r.item_name}</span>
                      <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 border border-[hsl(var(--nl-forest)/0.3)]">{r.category}</span>
                      {low && (
                        <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> low stock
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[hsl(var(--nl-muted))] mt-1">
                      {r.quantity} {r.unit} · reorder at {r.reorder_level} {r.unit} · ₹{Number(r.unit_cost).toLocaleString("en-IN")}/{r.unit}
                      {r.supplier ? ` · ${r.supplier}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="nl-btn nl-btn-outline" onClick={() => { setMoveFor(r); setMoveForm({ movement_type: "in", quantity: "", cost: "", reason: "" }); }}>
                      <ArrowUp className="h-4 w-4 mr-1" /> Stock in
                    </button>
                    <button className="nl-btn nl-btn-outline" onClick={() => { setMoveFor(r); setMoveForm({ movement_type: "out", quantity: "", cost: "", reason: "" }); }}>
                      <ArrowDown className="h-4 w-4 mr-1" /> Stock out
                    </button>
                    <button className="nl-btn nl-btn-outline" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>

                {moveFor?.id === r.id && (
                  <div className="mt-4 p-4 border border-[hsl(var(--nl-forest)/0.15)] bg-[hsl(var(--nl-cream-deep))] grid gap-3 md:grid-cols-4">
                    <input className="nl-input" type="number" placeholder={`Quantity (${r.unit})`} value={moveForm.quantity} onChange={(e) => setMoveForm({ ...moveForm, quantity: e.target.value })} />
                    <input className="nl-input" type="number" placeholder="Cost (₹)" value={moveForm.cost} onChange={(e) => setMoveForm({ ...moveForm, cost: e.target.value })} />
                    <input className="nl-input md:col-span-2" placeholder="Reason / note" value={moveForm.reason} onChange={(e) => setMoveForm({ ...moveForm, reason: e.target.value })} />
                    <div className="md:col-span-4 flex gap-2">
                      <button className="nl-btn nl-btn-primary" onClick={commitMovement}>Record {moveForm.movement_type === "in" ? "stock-in" : "stock-out"}</button>
                      <button className="nl-btn nl-btn-outline" onClick={() => setMoveFor(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Page ---------------------------------- */
function ManagementInner() {
  const { user } = useNLAuth();
  const [farms, setFarms] = useState<any[]>([]);
  const [farmId, setFarmId] = useState<string>("");
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // farms the user owns
      const { data: owned } = await sb.from("nl_farms").select("id,name").eq("owner_user_id", user.id).order("created_at");
      // farms the user manages
      const { data: managed } = await sb.from("nl_farm_managers").select("farm_id, nl_farms(id,name)").eq("manager_id", user.id).eq("is_active", true);
      const managedFarms = (managed ?? []).map((m: any) => m.nl_farms).filter(Boolean);
      const all = [...(owned ?? []), ...managedFarms];
      const dedup = Array.from(new Map(all.map((f: any) => [f.id, f])).values());
      setFarms(dedup);
      setFarmId(dedup[0]?.id ?? "");
      setLoading(false);
    })();
  }, [user]);

  const CurrentTab = useMemo(() => {
    if (!farmId || !user) return null;
    switch (tab) {
      case "overview":   return <Overview farmId={farmId} />;
      case "tasks":      return <Tasks farmId={farmId} userId={user.id} />;
      case "workers":    return <Workers farmId={farmId} />;
      case "attendance": return <Attendance farmId={farmId} />;
      case "inventory":  return <Inventory farmId={farmId} userId={user.id} />;
    }
  }, [tab, farmId, user]);

  return (
    <Section>
      <div className="mb-10">
        <Eyebrow>Volume 6 · Farm Management</Eyebrow>
        <H1 className="mt-4">Run the day, <span style={{ fontStyle: "italic" }}>every day.</span></H1>
        <Lede className="mt-4 max-w-2xl">Tasks, workers, attendance and inventory for every farm you look after.</Lede>
      </div>

      {loading ? <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin inline" /></div> :
       farms.length === 0 ? (
        <div className="p-8 border border-[hsl(var(--nl-forest)/0.2)] bg-[hsl(var(--nl-cream-deep))]">
          <p className="text-sm">You don't manage any farms yet. Register a farm from <a className="underline" href="/natural-living/my-farms">My Farms</a>, or ask an owner to add you as a manager.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 items-center mb-6">
            <label className="text-xs uppercase tracking-widest text-[hsl(var(--nl-muted))]">Farm</label>
            <select className="nl-input" value={farmId} onChange={(e) => setFarmId(e.target.value)}>
              {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-[hsl(var(--nl-forest)/0.2)] mb-8">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-4 py-3 text-sm inline-flex items-center gap-2 border-b-2 -mb-px transition-colors ${active ? "border-[hsl(var(--nl-forest))] text-[hsl(var(--nl-forest))]" : "border-transparent text-[hsl(var(--nl-muted))] hover:text-[hsl(var(--nl-forest))]"}`}>
                  <Icon className="h-4 w-4" />{t.label}
                </button>
              );
            })}
          </div>

          {CurrentTab}
        </>
      )}
    </Section>
  );
}

export default function NLFarmManagement() {
  return (
    <NLProtectedRoute requireOnboarded>
      <NLLayout>
        <ManagementInner />
      </NLLayout>
    </NLProtectedRoute>
  );
}
