import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { hyperguestRequest, loadSupplierAdmin } from "@/services/hospitality/hyperguestDiscoveryService";
import { toast } from "sonner";

const IDS = [111139,120655,117810,119668,102148,127194,100621,100622,125400,126856,101610,125492,101230,32571,29212,100388,55617];
export default function HyperGuestMarketplacePanel() {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadSupplierAdmin>> | null>(null);
  const [busy, setBusy] = useState<number | "all" | null>(null);
  const [error, setError] = useState("");
  const load = async () => { try { setData(await loadSupplierAdmin()); setError(""); } catch (e) { setError((e as Error).message); } };
  useEffect(() => { void load(); }, []);
  const sync = async (ids: number[]) => {
    setBusy(ids.length > 1 ? "all" : ids[0]); let failed = 0;
    for (const propertyId of ids) { try { await hyperguestRequest({ action: "sync", propertyId }); } catch (e) { failed++; toast.error(`${propertyId}: ${(e as Error).message}`); } }
    await load(); setBusy(null); if (!failed) toast.success("Supplier hotel content updated");
  };
  const toggle = async (propertyId: number, published: boolean) => { setBusy(propertyId); try { await hyperguestRequest({ action: "publish", propertyId, published }); await load(); } catch(e) { toast.error((e as Error).message); } finally { setBusy(null); } };
  return <section className="space-y-4">
    <div className="flex flex-wrap justify-between items-center gap-3"><h2 className="text-lg font-semibold">HyperGuest Marketplace ({data?.hotels.filter(h => IDS.includes(Number(h.hyperguest_property_id))).length ?? 0}/17)</h2><Button disabled={busy !== null} onClick={() => sync(IDS)}><RefreshCw className={`mr-2 h-4 w-4 ${busy === "all" ? "animate-spin" : ""}`} />Import / sync all</Button></div>
    {error && <div role="alert" className="text-destructive">{error}<Button variant="outline" className="ml-2" onClick={load}>Retry</Button></div>}
    {!data && !error ? <Loader2 className="animate-spin" /> : IDS.map(id => {
      const h = data?.hotels.find(h => Number(h.hyperguest_property_id) === id);
      const last = data?.logs.find(l => Number(l.property_id) === id);
      return <div key={id} className="flex flex-wrap justify-between gap-3 border-b border-border py-3"><div className="min-w-0"><p className="font-medium">{h?.name ?? `Property ${id}`}</p><p className="text-xs text-muted-foreground">{id} · {h?.city ?? "Not imported"}{h?.supplier_synced_at ? ` · ${new Date(h.supplier_synced_at).toLocaleString()}` : ""}</p>{(h?.supplier_sync_error || last?.status === "failed") && <p className="text-xs text-destructive">{h?.supplier_sync_error || last?.message}</p>}</div><div className="flex items-center gap-2"><Badge variant={h?.is_active ? "default" : "secondary"}>{h ? h.is_active ? "Published" : "Hidden" : "Pending"}</Badge><Button size="sm" variant="outline" disabled={busy !== null} onClick={() => sync([id])}>{busy === id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sync"}</Button>{h && <><Button size="sm" variant="outline" disabled={busy !== null} onClick={() => toggle(id, !h.is_active)}>{h.is_active ? "Hide" : "Publish"}</Button><Button asChild size="icon" variant="ghost" title="Open hotel"><a href={`/hotels/hyperguest/${id}?marketplace=1`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button></>}</div></div>;
    })}
    <h3 className="font-semibold">Synchronization history</h3><div className="max-h-80 overflow-auto text-xs">{data?.logs.map(l => <p key={l.id} className="border-b border-border py-2">{new Date(l.created_at).toLocaleString()} · {l.property_id} · <span className={l.status === "failed" ? "text-destructive" : "text-primary"}>{l.status}</span> · {l.message}</p>)}</div>
  </section>;
}