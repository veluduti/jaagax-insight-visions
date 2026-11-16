import { useCallback, useEffect, useState } from "react";
import { loadMarkupAdmin, saveHotelMarkup, markedPrice } from "@/services/hospitality/markupService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

function MarkupEditor({ hotelId, label, current, global, onSaved }: { hotelId: string | null; label: string; current: number | null; global: number; onSaved: () => Promise<void> }) {
  const [value, setValue] = useState(current == null ? "" : String(current));
  const [busy, setBusy] = useState(false);
  useEffect(() => setValue(current == null ? "" : String(current)), [current]);
  const save = async (reset = false) => {
    const percentage = reset ? null : Number(value);
    if (!reset && (!value.trim() || !Number.isFinite(percentage) || Number(percentage) < 0 || Number(percentage) >= 100000)) return toast.error("Enter a valid non-negative percentage");
    setBusy(true);
    try { await saveHotelMarkup(hotelId, percentage); await onSaved(); toast.success(reset ? "Hotel now uses global markup" : "Markup saved; new quotes use updated prices"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not save markup"); }
    finally { setBusy(false); }
  };
  const effective = current ?? global;
  return <div className="flex flex-wrap items-end gap-3">
    <div className="min-w-40 flex-1"><Label htmlFor={`markup-${hotelId ?? "global"}`}>{label}</Label><Input id={`markup-${hotelId ?? "global"}`} type="number" min="0" max="99999.9999" step="0.0001" placeholder={hotelId ? `Global: ${global}%` : "0"} value={value} onChange={e => setValue(e.target.value)} /></div>
    <Button disabled={busy} onClick={() => void save()} className="gap-2"><Save className="h-4 w-4" />Save</Button>
    {hotelId && current != null && <Button variant="outline" disabled={busy} onClick={() => void save(true)} className="gap-2"><RotateCcw className="h-4 w-4" />Use global</Button>}
    <p className="w-full text-sm text-muted-foreground">Effective: {effective}% · Base 1,000 → {markedPrice(1000, effective).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
  </div>;
}

export default function HotelMarkupPanel() {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadMarkupAdmin>> | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const load = useCallback(async () => { setError(""); try { setData(await loadMarkupAdmin()); } catch (e) { setError(e instanceof Error ? e.message : "Could not load markups"); } }, []);
  useEffect(() => { void load(); }, [load]);
  if (error) return <div role="alert" className="space-y-3 text-destructive"><p>{error}</p><Button variant="outline" onClick={() => void load()}>Retry</Button></div>;
  if (!data) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
  const global = Number(data.rules.find(r => r.scope === "global")?.percentage ?? 0);
  const hotels = data.hotels.filter(h => (source === "all" || (h.source_channel === "hyperguest" ? "hyperguest" : "manual") === source) && `${h.name} ${h.city ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="space-y-6">
    <h2 className="text-xl font-semibold">Hotel Price Markups</h2>
    <div className="border-b border-border pb-5"><MarkupEditor hotelId={null} label="Global markup (%) — both inventories" current={global} global={0} onSaved={load} /></div>
    <p className="text-sm text-muted-foreground">Hotel overrides replace the global percentage. Original tariffs and existing bookings stay unchanged. HyperGuest bookings with a markup remain unavailable until margin collection is approved; supplier-prepaid rates remain blocked.</p>
    <div className="flex flex-wrap gap-3"><Input aria-label="Search markup hotels" className="max-w-sm" placeholder="Search hotel or city" value={search} onChange={e => setSearch(e.target.value)} /><div className="flex gap-1">{[["all","All"],["manual","Manual Hotels"],["hyperguest","HyperGuest Hotels"]].map(([key,label]) => <Button key={key} variant={source === key ? "default" : "outline"} onClick={() => setSource(key)}>{label}</Button>)}</div></div>
    <div className="space-y-3">{!hotels.length && <p className="text-muted-foreground">No matching hotels.</p>}{hotels.map(h => {
      const rule = data.rules.find(r => r.hotel_id === h.id);
      return <article key={h.id} className="rounded-lg border border-border bg-card p-4"><div className="mb-3 flex flex-wrap items-center gap-2"><h3 className="font-semibold">{h.name}</h3><Badge variant="secondary">{h.source_channel === "hyperguest" ? "HyperGuest" : "Manual"}</Badge><span className="text-sm text-muted-foreground">{h.city}</span>{!h.is_active && <Badge variant="outline">Unpublished</Badge>}</div><MarkupEditor hotelId={h.id} label="Hotel markup (%)" current={rule ? Number(rule.percentage) : null} global={global} onSaved={load} /></article>;
    })}</div>
    <div className="border-t border-border pt-4"><h3 className="mb-2 font-semibold">Recent pricing changes</h3>{!data.audit.length && <p className="text-sm text-muted-foreground">No changes yet.</p>}{data.audit.map(a => <div key={a.id} className="flex flex-wrap justify-between gap-2 border-b border-border py-2 text-sm"><span>{a.hotel_id ? data.hotels.find(h => h.id === a.hotel_id)?.name ?? "Hotel" : "Global"}: {a.old_percentage == null ? "Inherited / 0%" : `${a.old_percentage}%`} → {a.new_percentage == null ? "Global" : `${a.new_percentage}%`}</span><time>{new Date(a.changed_at).toLocaleString()}</time></div>)}</div>
  </section>;
}