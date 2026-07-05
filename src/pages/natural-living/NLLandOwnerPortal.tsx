import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import NLLayout from "@/features/natural-living/NLLayout";
import { Section } from "@/features/natural-living/ui";
import NLProtectedRoute from "@/features/natural-living/NLProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { useNLAuth } from "@/features/natural-living/useNLAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, MapPin, Users, TrendingUp, Handshake, IndianRupee, LandPlot } from "lucide-react";

const sb = supabase as any;
type TabKey = "overview" | "parcels" | "partnerships" | "reports";

function OverviewTab({ userId }: { userId: string }) {
  const [stats, setStats] = useState({ parcels: 0, acres: 0, active: 0, lease: 0 });
  useEffect(() => {
    (async () => {
      const { data: parcels } = await sb.from("nl_land_parcels").select("id,area_acres").eq("owner_user_id", userId);
      const ids = (parcels ?? []).map((p: any) => p.id);
      let active = 0, lease = 0;
      if (ids.length) {
        const { data: parts } = await sb.from("nl_land_partnerships").select("status,monthly_lease").in("parcel_id", ids);
        active = (parts ?? []).filter((p: any) => p.status === "active").length;
        lease = (parts ?? []).filter((p: any) => p.status === "active").reduce((a: number, p: any) => a + Number(p.monthly_lease ?? 0), 0);
      }
      setStats({
        parcels: (parcels ?? []).length,
        acres: (parcels ?? []).reduce((a: number, p: any) => a + Number(p.area_acres ?? 0), 0),
        active, lease,
      });
    })();
  }, [userId]);

  const tiles = [
    { label: "Land parcels", value: stats.parcels, icon: LandPlot },
    { label: "Total acres", value: stats.acres, icon: MapPin },
    { label: "Active partnerships", value: stats.active, icon: Handshake },
    { label: "Monthly lease income", value: `₹${stats.lease.toLocaleString()}`, icon: IndianRupee },
  ];
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

function ParcelsTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "", village_id: "", area_acres: "", soil_type: "", water_source: "", description: "",
  });
  const load = async () => {
    const [{ data }, { data: v }] = await Promise.all([
      sb.from("nl_land_parcels").select("*").eq("owner_user_id", userId).order("created_at", { ascending: false }),
      sb.from("nl_villages").select("id,name").order("name"),
    ]);
    setRows(data ?? []); setVillages(v ?? []);
  };
  useEffect(() => { void load(); }, [userId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("nl_land_parcels").insert({
      owner_user_id: userId,
      name: form.name,
      village_id: form.village_id || null,
      area_acres: Number(form.area_acres || 0),
      soil_type: form.soil_type || null,
      water_source: form.water_source || null,
      description: form.description || null,
      status: "available",
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setForm({ name: "", village_id: "", area_acres: "", soil_type: "", water_source: "", description: "" });
    void load();
  };

  const changeStatus = async (id: string, status: string) => {
    await sb.from("nl_land_parcels").update({ status }).eq("id", id);
    void load();
  };
  const remove = async (id: string) => {
    await sb.from("nl_land_parcels").delete().eq("id", id);
    void load();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="grid md:grid-cols-3 gap-2 border border-[hsl(var(--nl-forest)/0.2)] p-4 bg-[hsl(var(--nl-cream))]">
        <input required placeholder="Parcel name" className="border p-2 text-sm bg-white" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <select className="border p-2 text-sm bg-white" value={form.village_id} onChange={(e) => setForm({ ...form, village_id: e.target.value })}>
          <option value="">Village…</option>
          {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <input required type="number" placeholder="Area (acres)" className="border p-2 text-sm bg-white" value={form.area_acres} onChange={(e) => setForm({ ...form, area_acres: e.target.value })} />
        <input placeholder="Soil type" className="border p-2 text-sm bg-white" value={form.soil_type} onChange={(e) => setForm({ ...form, soil_type: e.target.value })} />
        <input placeholder="Water source" className="border p-2 text-sm bg-white" value={form.water_source} onChange={(e) => setForm({ ...form, water_source: e.target.value })} />
        <button className="nl-btn nl-btn-primary justify-center"><Plus className="h-4 w-4" /> Add parcel</button>
        <textarea placeholder="Notes / description" rows={2} className="border p-2 text-sm bg-white md:col-span-3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-[hsl(var(--nl-muted))]">No parcels yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="border border-[hsl(var(--nl-forest)/0.2)] bg-[hsl(var(--nl-cream))] p-5 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-[hsl(var(--nl-forest))] mb-1"><LandPlot className="h-4 w-4" /><span className="text-xs uppercase tracking-widest">{r.status}</span></div>
                <h3 className="nl-serif text-xl">{r.name}</h3>
                <div className="text-xs text-[hsl(var(--nl-muted))] mt-1">
                  {r.area_acres} acres · {r.soil_type ?? "—"} soil · {r.water_source ?? "—"}
                </div>
                {r.description && <p className="text-sm text-[hsl(var(--nl-ink)/0.75)] mt-2">{r.description}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={r.status} onChange={(e) => changeStatus(r.id, e.target.value)} className="border p-2 text-xs bg-white">
                  <option value="available">Available</option>
                  <option value="partnered">Partnered</option>
                  <option value="unavailable">Unavailable</option>
                </select>
                <button onClick={() => remove(r.id)} className="text-xs text-[hsl(var(--nl-muted))] hover:text-destructive">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PartnershipsTab({ userId }: { userId: string }) {
  const [parcels, setParcels] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [form, setForm] = useState({ parcel_id: "", farmer_user_id: "", revenue_share_pct: "", monthly_lease: "", starts_on: new Date().toISOString().slice(0, 10), notes: "" });

  const load = async () => {
    const { data: p } = await sb.from("nl_land_parcels").select("id,name").eq("owner_user_id", userId);
    setParcels(p ?? []);
    const ids = (p ?? []).map((x: any) => x.id);
    if (!ids.length) return setRows([]);
    const { data } = await sb.from("nl_land_partnerships").select("*").in("parcel_id", ids).order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { void load(); }, [userId]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    // Resolve farmer by email via nl_profiles + auth join: use profiles table since we don't expose auth.users.
    // We rely on nl_profiles: users must have signed up already.
    const { data: prof } = await sb.from("profiles").select("id").eq("email", form.farmer_email.trim().toLowerCase()).maybeSingle();
    const farmer_user_id = prof?.id;
    if (!farmer_user_id) {
      toast({ title: "Farmer not found", description: "That email hasn't signed up yet. Ask them to join Natural Living first.", variant: "destructive" });
      return;
    }
    const { error } = await sb.from("nl_land_partnerships").insert({
      parcel_id: form.parcel_id,
      farmer_user_id,
      revenue_share_pct: Number(form.revenue_share_pct || 0),
      monthly_lease: Number(form.monthly_lease || 0),
      starts_on: form.starts_on,
      notes: form.notes || null,
      status: "pending",
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Invitation sent", description: "The farmer will see this in their portal." });
    setForm({ parcel_id: "", farmer_email: "", revenue_share_pct: "", monthly_lease: "", starts_on: new Date().toISOString().slice(0, 10), notes: "" });
    void load();
  };

  const setStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "ended") patch.ends_on = new Date().toISOString().slice(0, 10);
    await sb.from("nl_land_partnerships").update(patch).eq("id", id);
    void load();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={invite} className="grid md:grid-cols-3 gap-2 border border-[hsl(var(--nl-forest)/0.2)] p-4 bg-[hsl(var(--nl-cream))]">
        <select required className="border p-2 text-sm bg-white" value={form.parcel_id} onChange={(e) => setForm({ ...form, parcel_id: e.target.value })}>
          <option value="">Parcel…</option>
          {parcels.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input required type="email" placeholder="Farmer email" className="border p-2 text-sm bg-white" value={form.farmer_email} onChange={(e) => setForm({ ...form, farmer_email: e.target.value })} />
        <input type="date" className="border p-2 text-sm bg-white" value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} />
        <input type="number" step="0.1" placeholder="Revenue share %" className="border p-2 text-sm bg-white" value={form.revenue_share_pct} onChange={(e) => setForm({ ...form, revenue_share_pct: e.target.value })} />
        <input type="number" placeholder="Monthly lease ₹" className="border p-2 text-sm bg-white" value={form.monthly_lease} onChange={(e) => setForm({ ...form, monthly_lease: e.target.value })} />
        <button className="nl-btn nl-btn-primary justify-center"><Handshake className="h-4 w-4" /> Invite farmer</button>
        <textarea placeholder="Notes" rows={2} className="border p-2 text-sm bg-white md:col-span-3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-[hsl(var(--nl-muted))]">No partnerships yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-[hsl(var(--nl-muted))]">
              <tr><th className="py-2">Parcel</th><th>Farmer</th><th>Since</th><th>Share</th><th>Lease</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[hsl(var(--nl-forest)/0.1)]">
                  <td className="py-3">{parcels.find((p) => p.id === r.parcel_id)?.name ?? "—"}</td>
                  <td className="text-xs">{r.farmer_user_id.slice(0, 8)}…</td>
                  <td>{r.starts_on}</td>
                  <td>{r.revenue_share_pct}%</td>
                  <td>₹{Number(r.monthly_lease ?? 0).toLocaleString()}</td>
                  <td className={r.status === "active" ? "text-[hsl(var(--nl-forest))]" : "text-[hsl(var(--nl-muted))]"}>{r.status}</td>
                  <td className="text-right">
                    <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)} className="border p-1 text-xs bg-white">
                      <option value="pending">pending</option>
                      <option value="active">active</option>
                      <option value="ended">ended</option>
                    </select>
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

function ReportsTab({ userId }: { userId: string }) {
  const [data, setData] = useState<{ months: string[]; leaseByMonth: Record<string, number>; parcelStatus: Record<string, number> }>({
    months: [], leaseByMonth: {}, parcelStatus: {},
  });
  useEffect(() => {
    (async () => {
      const { data: parcels } = await sb.from("nl_land_parcels").select("id,status").eq("owner_user_id", userId);
      const ids = (parcels ?? []).map((p: any) => p.id);
      const parcelStatus: Record<string, number> = {};
      (parcels ?? []).forEach((p: any) => (parcelStatus[p.status] = (parcelStatus[p.status] ?? 0) + 1));
      let leaseByMonth: Record<string, number> = {};
      if (ids.length) {
        const { data: parts } = await sb.from("nl_land_partnerships").select("monthly_lease,starts_on,status").in("parcel_id", ids);
        (parts ?? []).filter((p: any) => p.status === "active").forEach((p: any) => {
          const m = (p.starts_on ?? "").slice(0, 7);
          leaseByMonth[m] = (leaseByMonth[m] ?? 0) + Number(p.monthly_lease ?? 0);
        });
      }
      const months = Object.keys(leaseByMonth).sort();
      setData({ months, leaseByMonth, parcelStatus });
    })();
  }, [userId]);

  const maxLease = Math.max(1, ...Object.values(data.leaseByMonth));

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="border border-[hsl(var(--nl-forest)/0.2)] bg-[hsl(var(--nl-cream))] p-5">
        <div className="flex items-center gap-2 text-[hsl(var(--nl-forest))] mb-3"><TrendingUp className="h-4 w-4" /><span className="text-xs uppercase tracking-widest">Lease income by month</span></div>
        {data.months.length === 0 ? (
          <p className="text-sm text-[hsl(var(--nl-muted))]">No active partnerships to chart.</p>
        ) : (
          <div className="space-y-2">
            {data.months.map((m) => (
              <div key={m}>
                <div className="flex justify-between text-xs mb-1"><span>{m}</span><span>₹{data.leaseByMonth[m].toLocaleString()}</span></div>
                <div className="h-2 bg-[hsl(var(--nl-cream-deep))]">
                  <div className="h-2" style={{ width: `${(data.leaseByMonth[m] / maxLease) * 100}%`, background: "hsl(var(--nl-forest))" }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border border-[hsl(var(--nl-forest)/0.2)] bg-[hsl(var(--nl-cream))] p-5">
        <div className="flex items-center gap-2 text-[hsl(var(--nl-forest))] mb-3"><LandPlot className="h-4 w-4" /><span className="text-xs uppercase tracking-widest">Parcels by status</span></div>
        {Object.keys(data.parcelStatus).length === 0 ? (
          <p className="text-sm text-[hsl(var(--nl-muted))]">No parcels yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {Object.entries(data.parcelStatus).map(([k, v]) => (
              <li key={k} className="flex justify-between border-t border-[hsl(var(--nl-forest)/0.1)] py-2">
                <span className="capitalize">{k}</span><span className="nl-serif">{v}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "overview", label: "Overview", icon: TrendingUp },
  { key: "parcels", label: "My Land", icon: LandPlot },
  { key: "partnerships", label: "Partnerships", icon: Users },
  { key: "reports", label: "Reports", icon: TrendingUp },
];

function Inner() {
  const { user, profile } = useNLAuth();
  const [tab, setTab] = useState<TabKey>("overview");
  const allowed = profile?.role === "land_owner" || profile?.role === "admin";

  if (!user) return null;

  return (
    <NLLayout>
      <Section>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="nl-eyebrow mb-2">Land Owner Portal</div>
            <h1 className="nl-serif text-4xl md:text-5xl">Your land. Your legacy.</h1>
          </div>
          <Link to="/natural-living/dashboard" className="nl-btn nl-btn-outline">Dashboard</Link>
        </div>

        {!allowed ? (
          <div className="border border-dashed border-[hsl(var(--nl-forest)/0.3)] p-8 text-sm text-[hsl(var(--nl-ink)/0.75)]">
            The Land Owner portal is only available to Land Owner accounts. Update your role in your profile.
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

            {tab === "overview" && <OverviewTab userId={user.id} />}
            {tab === "parcels" && <ParcelsTab userId={user.id} />}
            {tab === "partnerships" && <PartnershipsTab userId={user.id} />}
            {tab === "reports" && <ReportsTab userId={user.id} />}
          </>
        )}
      </Section>
    </NLLayout>
  );
}

export default function NLLandOwnerPortal() {
  return <NLProtectedRoute requireOnboarded><Inner /></NLProtectedRoute>;
}
