import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, CheckCircle2, Loader2, Play, RefreshCw, ShieldX, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { integrationRequest, integrationStatusLabel, loadIntegrationOverview, type IntegrationConnection, type IntegrationOverview } from "@/services/hospitality/integrationService";

export default function IntegrationReviewPanel() {
  const [data, setData] = useState<IntegrationOverview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const load = useCallback(async () => { try { setError(""); setData(await loadIntegrationOverview()); } catch (e) { setError((e as Error).message); } }, []);
  useEffect(() => { void load(); }, [load]);
  const act = async (connection: IntegrationConnection, action: string, extra: Record<string, unknown> = {}) => {
    setBusy(`${connection.id}:${action}`);
    try { await integrationRequest({ action, connection_id: connection.id, ...extra }); toast.success(`Connection ${integrationStatusLabel(action)}`); await load(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(""); }
  };
  if (!data && !error) return <Loader2 className="mx-auto my-10 h-7 w-7 animate-spin text-primary" />;
  if (error) return <div role="alert" className="py-8 text-center"><p>{error}</p><Button className="mt-3" onClick={load}>Retry</Button></div>;
  const pending = data?.connections.filter(c => c.review_status === "pending_review") ?? [];
  const others = data?.connections.filter(c => c.review_status !== "pending_review") ?? [];
  const card = (c: IntegrationConnection) => {
    const provider = data?.providers.find(p => p.key === c.channel);
    const hotel = data?.hotels.find(h => h.id === c.hotel_id);
    const mappingCount = data?.room_mappings.filter(m => m.connection_id === c.id).length ?? 0;
    return <article key={c.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{provider?.name ?? c.channel} · {hotel?.name ?? c.hotel_id}</h3><p className="text-xs text-muted-foreground">{c.connection_kind.replace("_", " ").toUpperCase()} · {c.direction} · {c.environment} · External property {c.channel_property_id || "missing"}</p></div><span className={`ix-badge ${c.review_status}`}>{integrationStatusLabel(c.review_status)}</span></div>
      <div className="flex flex-wrap gap-2 text-xs"><BadgeCheck className="h-4 w-4 text-primary" /> {mappingCount} room mappings <span>·</span> Credentials {c.credentials_status}<span>·</span> Test {c.last_test_status || "not run"}</div>
      {c.last_test_details?.checks?.map(check => <div key={check.name} className="flex items-center justify-between gap-3 text-xs border-b border-border py-1"><span>{check.name} · {check.detail}</span>{check.ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}</div>)}
      {c.review_notes && <p className="text-xs">Review note: {c.review_notes}</p>}
      {!provider?.live_adapter && c.direction !== "inbound" && <p className="text-xs text-muted-foreground">Configuration can be reviewed, but activation remains blocked until this provider's approved live adapter is available.</p>}
      <Textarea aria-label={`Review notes for ${provider?.name ?? c.channel}`} placeholder="Verification notes or rejection reason" value={notes[c.id] ?? ""} onChange={e => setNotes(n => ({ ...n, [c.id]: e.target.value }))} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act(c, "test")}>{busy === `${c.id}:test` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}Run real test</Button>
        {c.review_status === "pending_review" && <><Button size="sm" disabled={!!busy} onClick={() => act(c, "review", { decision: "approved", notes: notes[c.id] })}><BadgeCheck className="h-4 w-4" />Approve</Button><Button size="sm" variant="destructive" disabled={!!busy} onClick={() => act(c, "review", { decision: "rejected", notes: notes[c.id] })}><ShieldX className="h-4 w-4" />Reject</Button></>}
        {["approved", "suspended"].includes(c.review_status) && <Button size="sm" disabled={!!busy} onClick={() => act(c, "activate")}>Activate</Button>}
        {c.review_status === "active" && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act(c, "suspend")}>Suspend</Button>}
      </div>
    </article>;
  };
  return <section className="space-y-4"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Integration Review & Activation</h2><p className="text-xs text-muted-foreground">Global Admin verification is required before any connection can synchronize or accept API writes.</p></div><Button variant="outline" size="icon" aria-label="Refresh integrations" onClick={load}><RefreshCw className="h-4 w-4" /></Button></div>
    <h3 className="font-medium">Waiting for review ({pending.length})</h3>{pending.map(card)}{!pending.length && <p className="text-sm text-muted-foreground">No submitted connections are waiting.</p>}
    <h3 className="font-medium pt-3">All connections ({others.length})</h3>{others.map(card)}{!others.length && !pending.length && <p className="text-sm text-muted-foreground">No integration connection requests have been created.</p>}
  </section>;
}
