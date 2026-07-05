import { useEffect, useState } from "react";
import NLLayout from "@/features/natural-living/NLLayout";
import { Section } from "@/features/natural-living/ui";
import NLProtectedRoute from "@/features/natural-living/NLProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { useNLAuth } from "@/features/natural-living/useNLAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Sprout, ChevronDown } from "lucide-react";

const sb = supabase as any;

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 6);

function Panel({ title, children, defaultOpen = false }: any) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[hsl(var(--nl-forest)/0.2)] bg-[hsl(var(--nl-cream))]">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between p-4 text-left">
        <span className="nl-serif text-lg">{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-5 border-t border-[hsl(var(--nl-forest)/0.15)]">{children}</div>}
    </div>
  );
}

function FarmCard({ farm, villages, onRefresh }: any) {
  const [plots, setPlots] = useState<any[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);

  const [plotForm, setPlotForm] = useState({ name: "", size_acres: "", soil_type: "", water_source: "" });
  const [cropForm, setCropForm] = useState({ plot_id: "", name: "", variety: "", season: "", price_per_kg: "" });
  const [planForm, setPlanForm] = useState({ name: "", tier: "standard", frequency: "monthly", price: "", included_kg: "" });

  const load = async () => {
    const [{ data: p }, { data: pl }] = await Promise.all([
      sb.from("nl_plots").select("*").eq("farm_id", farm.id).order("created_at"),
      sb.from("nl_subscription_plans").select("*").eq("farm_id", farm.id).order("created_at"),
    ]);
    setPlots(p ?? []); setPlans(pl ?? []);
    const ids = (p ?? []).map((x: any) => x.id);
    if (ids.length) {
      const { data: c } = await sb.from("nl_crops").select("*").in("plot_id", ids).order("created_at");
      setCrops(c ?? []);
    } else setCrops([]);
  };
  useEffect(() => { void load(); }, [farm.id]);

  const addPlot = async () => {
    if (!plotForm.name) return;
    const { error } = await sb.from("nl_plots").insert({ farm_id: farm.id, ...plotForm, size_acres: Number(plotForm.size_acres || 0) });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setPlotForm({ name: "", size_acres: "", soil_type: "", water_source: "" });
    void load();
  };
  const addCrop = async () => {
    if (!cropForm.plot_id || !cropForm.name) return;
    const { error } = await sb.from("nl_crops").insert({ ...cropForm, price_per_kg: cropForm.price_per_kg ? Number(cropForm.price_per_kg) : null });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setCropForm({ plot_id: "", name: "", variety: "", season: "", price_per_kg: "" });
    void load();
  };
  const addPlan = async () => {
    if (!planForm.name || !planForm.price) return;
    const { error } = await sb.from("nl_subscription_plans").insert({
      farm_id: farm.id,
      name: planForm.name,
      tier: planForm.tier,
      frequency: planForm.frequency,
      price: Number(planForm.price),
      included_kg: planForm.included_kg ? Number(planForm.included_kg) : null,
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setPlanForm({ name: "", tier: "standard", frequency: "monthly", price: "", included_kg: "" });
    void load();
  };

  const village = villages.find((v: any) => v.id === farm.village_id);

  return (
    <div className="border border-[hsl(var(--nl-forest)/0.25)] bg-[hsl(var(--nl-cream))] p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="nl-eyebrow mb-1">{farm.status}</div>
          <h3 className="nl-serif text-2xl">{farm.name}</h3>
          <div className="text-xs text-[hsl(var(--nl-muted))] mt-1">
            {farm.total_area_acres} acres {village && `· ${village.name}`} {farm.farming_method && `· ${farm.farming_method}`}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Panel title={`Plots (${plots.length})`}>
          <ul className="space-y-1 mb-4 text-sm">
            {plots.map((p) => (
              <li key={p.id} className="flex justify-between border-b border-[hsl(var(--nl-forest)/0.1)] py-1">
                <span>{p.name} — {p.size_acres} ac</span>
                <span className="text-xs text-[hsl(var(--nl-muted))]">{p.soil_type} · {p.water_source}</span>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            <input placeholder="Name" className="border p-2 text-sm bg-white" value={plotForm.name} onChange={(e) => setPlotForm({ ...plotForm, name: e.target.value })} />
            <input placeholder="Size (acres)" type="number" className="border p-2 text-sm bg-white" value={plotForm.size_acres} onChange={(e) => setPlotForm({ ...plotForm, size_acres: e.target.value })} />
            <input placeholder="Soil type" className="border p-2 text-sm bg-white" value={plotForm.soil_type} onChange={(e) => setPlotForm({ ...plotForm, soil_type: e.target.value })} />
            <input placeholder="Water source" className="border p-2 text-sm bg-white" value={plotForm.water_source} onChange={(e) => setPlotForm({ ...plotForm, water_source: e.target.value })} />
          </div>
          <button onClick={addPlot} className="nl-btn nl-btn-outline"><Plus className="h-3.5 w-3.5" /> Add plot</button>
        </Panel>

        <Panel title={`Crops (${crops.length})`}>
          <ul className="space-y-1 mb-4 text-sm">
            {crops.map((c) => {
              const p = plots.find((x) => x.id === c.plot_id);
              return (
                <li key={c.id} className="flex justify-between border-b border-[hsl(var(--nl-forest)/0.1)] py-1">
                  <span>{c.name}{c.variety && ` · ${c.variety}`} <span className="text-xs text-[hsl(var(--nl-muted))]">({p?.name})</span></span>
                  <span className="text-xs">{c.price_per_kg ? `₹${c.price_per_kg}/kg` : "—"}</span>
                </li>
              );
            })}
          </ul>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
            <select className="border p-2 text-sm bg-white" value={cropForm.plot_id} onChange={(e) => setCropForm({ ...cropForm, plot_id: e.target.value })}>
              <option value="">Plot…</option>
              {plots.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input placeholder="Crop" className="border p-2 text-sm bg-white" value={cropForm.name} onChange={(e) => setCropForm({ ...cropForm, name: e.target.value })} />
            <input placeholder="Variety" className="border p-2 text-sm bg-white" value={cropForm.variety} onChange={(e) => setCropForm({ ...cropForm, variety: e.target.value })} />
            <input placeholder="Season" className="border p-2 text-sm bg-white" value={cropForm.season} onChange={(e) => setCropForm({ ...cropForm, season: e.target.value })} />
            <input placeholder="₹/kg" type="number" className="border p-2 text-sm bg-white" value={cropForm.price_per_kg} onChange={(e) => setCropForm({ ...cropForm, price_per_kg: e.target.value })} />
          </div>
          <button onClick={addCrop} className="nl-btn nl-btn-outline"><Plus className="h-3.5 w-3.5" /> Add crop</button>
        </Panel>

        <Panel title={`Subscription plans (${plans.length})`}>
          <ul className="space-y-1 mb-4 text-sm">
            {plans.map((pl) => (
              <li key={pl.id} className="flex justify-between border-b border-[hsl(var(--nl-forest)/0.1)] py-1">
                <span>{pl.name} <span className="text-xs text-[hsl(var(--nl-muted))]">({pl.tier} · {pl.frequency})</span></span>
                <span className="text-xs">₹{pl.price}</span>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
            <input placeholder="Plan name" className="border p-2 text-sm bg-white" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} />
            <select className="border p-2 text-sm bg-white" value={planForm.tier} onChange={(e) => setPlanForm({ ...planForm, tier: e.target.value })}>
              <option value="essential">Essential</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
            <select className="border p-2 text-sm bg-white" value={planForm.frequency} onChange={(e) => setPlanForm({ ...planForm, frequency: e.target.value })}>
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
            </select>
            <input placeholder="Price ₹" type="number" className="border p-2 text-sm bg-white" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })} />
            <input placeholder="Included kg" type="number" className="border p-2 text-sm bg-white" value={planForm.included_kg} onChange={(e) => setPlanForm({ ...planForm, included_kg: e.target.value })} />
          </div>
          <button onClick={addPlan} className="nl-btn nl-btn-outline"><Plus className="h-3.5 w-3.5" /> Add plan</button>
        </Panel>
      </div>
    </div>
  );
}

function Inner() {
  const { user, profile } = useNLAuth();
  const [farms, setFarms] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newFarm, setNewFarm] = useState({
    name: "", village_id: "", total_area_acres: "", certification: "", farming_method: "Organic", description: "",
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: f }, { data: v }] = await Promise.all([
      sb.from("nl_farms").select("*").eq("owner_user_id", user.id).order("created_at", { ascending: false }),
      sb.from("nl_villages").select("id,name,district_id").order("name"),
    ]);
    setFarms(f ?? []); setVillages(v ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [user?.id]);

  const createFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newFarm.name) return;
    const { error } = await sb.from("nl_farms").insert({
      owner_user_id: user.id,
      name: newFarm.name,
      slug: slugify(newFarm.name),
      village_id: newFarm.village_id || null,
      total_area_acres: Number(newFarm.total_area_acres || 0),
      certification: newFarm.certification || null,
      farming_method: newFarm.farming_method || null,
      description: newFarm.description || null,
      status: "pending",
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Farm submitted", description: "Pending admin approval." });
    setNewFarm({ name: "", village_id: "", total_area_acres: "", certification: "", farming_method: "Organic", description: "" });
    void load();
  };

  const canRegister = profile?.role === "farmer" || profile?.role === "land_owner" || profile?.role === "admin";

  return (
    <NLLayout>
      <Section>
        <div className="nl-eyebrow mb-2">Farmer workspace</div>
        <h1 className="nl-serif text-4xl md:text-5xl mb-8">My farms</h1>

        {!canRegister && (
          <div className="border border-dashed border-[hsl(var(--nl-forest)/0.3)] p-6 mb-8 text-sm text-[hsl(var(--nl-ink)/0.75)]">
            Only Farmer and Land Owner accounts can register farms. Update your role in your profile.
          </div>
        )}

        {canRegister && (
          <form onSubmit={createFarm} className="border border-[hsl(var(--nl-forest)/0.25)] bg-[hsl(var(--nl-cream))] p-6 mb-10 grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 nl-eyebrow">Register a new farm</div>
            <input required placeholder="Farm name" className="border p-3 text-sm bg-white" value={newFarm.name} onChange={(e) => setNewFarm({ ...newFarm, name: e.target.value })} />
            <select className="border p-3 text-sm bg-white" value={newFarm.village_id} onChange={(e) => setNewFarm({ ...newFarm, village_id: e.target.value })}>
              <option value="">Village…</option>
              {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <input placeholder="Total area (acres)" type="number" className="border p-3 text-sm bg-white" value={newFarm.total_area_acres} onChange={(e) => setNewFarm({ ...newFarm, total_area_acres: e.target.value })} />
            <input placeholder="Certification (e.g. PGS India)" className="border p-3 text-sm bg-white" value={newFarm.certification} onChange={(e) => setNewFarm({ ...newFarm, certification: e.target.value })} />
            <select className="border p-3 text-sm bg-white" value={newFarm.farming_method} onChange={(e) => setNewFarm({ ...newFarm, farming_method: e.target.value })}>
              <option>Organic</option><option>Natural</option><option>Biodynamic</option><option>Regenerative</option><option>Conventional</option>
            </select>
            <textarea placeholder="Describe your farm…" rows={3} className="border p-3 text-sm bg-white md:col-span-2" value={newFarm.description} onChange={(e) => setNewFarm({ ...newFarm, description: e.target.value })} />
            <button type="submit" className="nl-btn nl-btn-primary md:col-span-2 justify-center"><Plus className="h-4 w-4" /> Submit farm</button>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(var(--nl-forest))" }} /></div>
        ) : farms.length === 0 ? (
          <div className="border border-dashed border-[hsl(var(--nl-forest)/0.3)] p-12 text-center">
            <Sprout className="h-8 w-8 mx-auto mb-3" style={{ color: "hsl(var(--nl-forest))" }} />
            <p className="text-sm text-[hsl(var(--nl-ink)/0.7)]">You haven't registered a farm yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {farms.map((f) => <FarmCard key={f.id} farm={f} villages={villages} onRefresh={load} />)}
          </div>
        )}
      </Section>
    </NLLayout>
  );
}

export default function NLMyFarms() {
  return <NLProtectedRoute><Inner /></NLProtectedRoute>;
}
