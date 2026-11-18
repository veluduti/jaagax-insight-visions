import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, CheckCircle2, Copy, Eye, KeyRound, Loader2, Play, RefreshCw, ShieldCheck, ShieldX, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { integrationRequest, integrationStatusLabel, loadIntegrationOverview, type IntegrationAccessDetails, type IntegrationConnection, type IntegrationOverview } from "@/services/hospitality/integrationService";
import { integrationScopes } from "@/lib/integrationRules";
import "@/pages/partners/integration-workspace.css";

const apiRoot = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const otaEndpoints: [string, string, string, string][] = [
  ["POST", "/integration-api/oauth/token", "Get an access token with the JAAGA X client ID and secret", "—"],
  ["GET", "/integration-api/v1/properties", "Hotel listing details (name, address, location, policies)", "properties:read"],
  ["GET", "/integration-api/v1/rooms", "Room types of the hotel", "inventory:read"],
  ["GET", "/integration-api/v1/rate-plans", "Rate plans of the hotel", "rates:read"],
  ["GET", "/integration-api/v1/availability?from=YYYY-MM-DD&to=YYYY-MM-DD", "Rooms available per date", "inventory:read"],
  ["GET", "/integration-api/v1/rates?from=YYYY-MM-DD&to=YYYY-MM-DD", "Prices per date", "rates:read"],
  ["PUT", "/integration-api/v1/availability", "Update availability (if allowed)", "inventory:write"],
  ["PUT", "/integration-api/v1/rates", "Update prices (if allowed)", "rates:write"],
  ["POST", "/integration-api/v1/reservations", "Create a booking", "reservations:write"],
  ["GET", "/integration-api/v1/reservations/{id}", "Read a booking", "reservations:read"],
  ["PATCH", "/integration-api/v1/reservations/{id}", "Modify a booking", "reservations:write"],
  ["POST", "/integration-api/v1/reservations/{id}/cancel", "Cancel a booking", "reservations:write"],
  ["POST", "/integration-webhooks/{client_id}", "OTA sends signed booking events to JAAGA X", "signed webhook"],
];

const defaultScopes = ["properties:read", "inventory:read", "rates:read", "reservations:read", "reservations:write"];

function integrationPurpose(connection: IntegrationConnection) {
  if (connection.direction === "inbound") return "The provider sends bookings, modifications and cancellations into JAAGA X.";
  if (connection.direction === "outbound") return "JAAGA X sends property, room, rate and availability updates to the provider.";
  return "JAAGA X sends inventory and rates, while the provider sends bookings and booking changes back.";
}

export default function IntegrationReviewPanel() {
  const [data, setData] = useState<IntegrationOverview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selectedScopes, setSelectedScopes] = useState<string[]>(defaultScopes);
  const [handover, setHandover] = useState<IntegrationAccessDetails | null>(null);
  const [handoverName, setHandoverName] = useState("");
  const [provider, setProvider] = useState<Record<string, { external_property_id: string; api_endpoint: string; api_key: string; api_secret: string; webhook_url: string }>>({});
  const field = (c: IntegrationConnection) => provider[c.id] ?? { external_property_id: c.channel_property_id ?? "", api_endpoint: c.settings?.api_endpoint ?? "", api_key: "", api_secret: "", webhook_url: c.settings?.webhook_url ?? "" };
  const setField = (c: IntegrationConnection, key: string, value: string) => setProvider(p => ({ ...p, [c.id]: { ...field(c), [key]: value } }));
  const saveProvider = async (c: IntegrationConnection) => {
    const f = field(c);
    if (!f.external_property_id.trim()) return toast.error("Enter the OTA's property ID for this hotel");
    if (c.direction !== "inbound" && c.channel !== "hyperguest" && (!f.api_endpoint.trim() || (!f.api_key && c.credentials_status !== "configured"))) return toast.error("Enter the provider API endpoint and API key");
    await act(c, "credentials", { external_property_id: f.external_property_id.trim(), api_endpoint: f.api_endpoint.trim() || undefined, webhook_url: f.webhook_url.trim() || undefined, api_key: f.api_key || undefined, access_token: f.api_key || undefined, api_secret: f.api_secret || undefined });
    setProvider(p => { const n = { ...p }; delete n[c.id]; return n; });
  };

  const load = useCallback(async () => {
    try { setError(""); setData(await loadIntegrationOverview()); }
    catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const act = async (connection: IntegrationConnection, action: string, extra: Record<string, unknown> = {}) => {
    setBusy(`${connection.id}:${action}`);
    try {
      await integrationRequest({ action, connection_id: connection.id, ...extra });
      toast.success(`Connection ${integrationStatusLabel(action)}`);
      await load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(""); }
  };

  const providerName = (connection: IntegrationConnection) => data?.providers.find(p => p.key === connection.channel)?.name ?? connection.channel;

  const viewAccess = async (connection: IntegrationConnection) => {
    setBusy(`${connection.id}:access_details`);
    try {
      const details = await integrationRequest<IntegrationAccessDetails>({ action: "access_details", connection_id: connection.id });
      setHandoverName(providerName(connection));
      setHandover(details);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(""); }
  };

  const issueClient = async (connection: IntegrationConnection) => {
    setBusy(`${connection.id}:issue_client`);
    try {
      const details = await integrationRequest<IntegrationAccessDetails>({ action: "issue_client", connection_id: connection.id, scopes: selectedScopes });
      setHandoverName(providerName(connection));
      setHandover(details);
      toast.success(connection.client_id ? "New credentials issued; previous credentials were revoked" : "JAAGA X API credentials issued");
      await load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(""); }
  };

  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); toast.success("Copied"); }
    catch { toast.error("Select the value and copy it manually"); }
  };

  if (!data && !error) return <Loader2 className="mx-auto my-10 h-7 w-7 animate-spin text-primary" />;
  if (error) return <div role="alert" className="py-8 text-center"><p>{error}</p><Button className="mt-3" onClick={load}>Retry</Button></div>;
  const pending = data?.connections.filter(c => c.review_status === "pending_review") ?? [];
  const others = data?.connections.filter(c => c.review_status !== "pending_review") ?? [];

  const card = (c: IntegrationConnection) => {
    const hotel = data?.hotels.find(h => h.id === c.hotel_id);
    const mappingCount = data?.room_mappings.filter(m => m.connection_id === c.id).length ?? 0;
    const inbound = c.direction !== "outbound";
    return <article key={c.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="font-semibold">{providerName(c)} · {hotel?.name ?? c.hotel_id}</h3><p className="text-xs text-muted-foreground">{c.connection_kind.replace("_", " ").toUpperCase()} · {c.direction} · {c.environment} · External property {c.channel_property_id || "missing"}</p></div>
        <span className={`ix-badge ${c.review_status}`}>{integrationStatusLabel(c.review_status)}</span>
      </div>
      <div className="rounded-md border border-border bg-muted/40 p-3"><p className="text-xs font-semibold">Integration purpose</p><p className="mt-1 text-xs text-muted-foreground">{integrationPurpose(c)}</p></div>
      <div className="flex flex-wrap items-center gap-2 text-xs"><BadgeCheck className="h-4 w-4 text-primary" /> {mappingCount} room mappings <span>·</span> Provider credentials {c.credentials_status}<span>·</span> Test {c.last_test_status || "not run"}</div>
      {c.last_test_details?.checks?.map(check => <div key={check.name} className="flex items-center justify-between gap-3 border-b border-border py-1 text-xs"><span>{check.name} · {check.detail}</span>{check.ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}</div>)}
      {c.review_notes && <p className="text-xs">Review note: {c.review_notes}</p>}
      {!data?.providers.find(p => p.key === c.channel)?.live_adapter && !inbound && <p className="text-xs text-muted-foreground">Configuration can be reviewed, but activation remains blocked until this provider's approved live adapter is available.</p>}
      {c.review_status !== "active" && c.channel !== "hyperguest" && <div className="rounded-md border border-border p-3 space-y-2">
        <p className="text-xs font-semibold">Provider details for this hotel (entered by Global Admin)</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div><Label className="text-xs">OTA property ID</Label><Input value={field(c).external_property_id} onChange={e => setField(c, "external_property_id", e.target.value)} placeholder="Hotel ID in the OTA system" /></div>
          {inbound && c.direction === "inbound" ? null : <>
            <div><Label className="text-xs">Provider API endpoint (HTTPS)</Label><Input type="url" value={field(c).api_endpoint} onChange={e => setField(c, "api_endpoint", e.target.value)} placeholder="https://..." /></div>
            <div><Label className="text-xs">API key / access token</Label><Input type="password" autoComplete="off" value={field(c).api_key} onChange={e => setField(c, "api_key", e.target.value)} placeholder={c.credentials_status === "configured" ? "Saved — leave blank to keep" : "From the OTA"} /></div>
            <div><Label className="text-xs">API secret (if required)</Label><Input type="password" autoComplete="off" value={field(c).api_secret} onChange={e => setField(c, "api_secret", e.target.value)} placeholder="Never shown again" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Provider booking webhook URL (optional)</Label><Input type="url" value={field(c).webhook_url} onChange={e => setField(c, "webhook_url", e.target.value)} placeholder="https://..." /></div>
          </>}
        </div>
        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => saveProvider(c)}>{busy === `${c.id}:credentials` ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}Save provider details</Button>
      </div>}
      <Textarea aria-label={`Review notes for ${providerName(c)}`} placeholder="Verification notes or rejection reason" value={notes[c.id] ?? ""} onChange={e => setNotes(n => ({ ...n, [c.id]: e.target.value }))} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act(c, "test")}>{busy === `${c.id}:test` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}Run real test</Button>
        {c.review_status === "pending_review" && <><Button size="sm" disabled={!!busy} onClick={() => act(c, "review", { decision: "approved", notes: notes[c.id] })}><BadgeCheck className="h-4 w-4" />Approve</Button><Button size="sm" variant="destructive" disabled={!!busy} onClick={() => act(c, "review", { decision: "rejected", notes: notes[c.id] })}><ShieldX className="h-4 w-4" />Reject</Button></>}
        {["approved", "suspended"].includes(c.review_status) && <Button size="sm" disabled={!!busy} onClick={() => act(c, "activate")}>Activate</Button>}
        {c.review_status === "active" && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act(c, "suspend")}>Suspend</Button>}
        {c.is_active && inbound && <>
          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => viewAccess(c)}><Eye className="h-4 w-4" />OTA connection details</Button>
          <Button size="sm" disabled={!!busy} onClick={() => issueClient(c)}>{busy === `${c.id}:issue_client` ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}{c.client_id ? "Rotate JAAGA X credentials" : "Provide JAAGA X credentials"}</Button>
        </>}
      </div>
      {c.is_active && inbound && <p className="text-xs text-muted-foreground">Give these JAAGA X details to the OTA integration team. Client secrets and webhook signing secrets appear only when issued or rotated.</p>}
      {c.is_active && !inbound && <p className="text-xs text-muted-foreground">This outbound-only connection uses the provider's credentials; no JAAGA X client credentials are needed.</p>}
    </article>;
  };

  const detailRows = handover ? [
    ["Environment", handover.environment === "production" ? "Production" : "Sandbox / Test"],
    ["Direction", handover.direction],
    ["OTA external property ID", handover.external_property_id],
    ["JAAGA X property ID", handover.jaagax_property_id],
    ["JAAGA X client ID", handover.client_id],
    ["JAAGA X client secret", handover.client_secret],
    ["OAuth token URL", handover.token_url],
    ["JAAGA X API base URL", handover.api_base_url],
    ["JAAGA X webhook URL", handover.webhook_url],
    ["Webhook signing secret", handover.webhook_secret],
  ].filter((row): row is [string, string] => Boolean(row[1])) : [];

  return <section className="space-y-4">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Integration Review & OTA Access Manager</h2><p className="text-xs text-muted-foreground">Global Admin verifies connections and provides the JAAGA X API details that an OTA uses to connect back.</p></div><Button variant="outline" size="icon" aria-label="Refresh integrations" onClick={load}><RefreshCw className="h-4 w-4" /></Button></div>
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">JAAGA X OTA API endpoints (give these to the OTA)</h3><Button size="sm" variant="outline" onClick={() => copy(otaEndpoints.map(([m, path, d]) => `${m} ${apiRoot}${path}  — ${d}`).join("\n"))}><Copy className="h-4 w-4" />Copy all</Button></div>
      <p className="mt-1 text-xs text-muted-foreground">Base URL: <code className="break-all">{apiRoot}</code>. The OTA first gets a token, then calls the other endpoints with <code>Authorization: Bearer &lt;token&gt;</code>. Each token only sees the one hotel it was issued for, so the OTA needs client credentials per hotel (issued below after approval).</p>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-muted-foreground"><th className="py-1 pr-2">Method</th><th className="pr-2">Endpoint</th><th className="pr-2">Purpose</th><th>Permission</th></tr></thead><tbody>{otaEndpoints.map(([m, path, d, sc]) => <tr key={m + path} className="border-t border-border"><td className="py-1.5 pr-2 font-semibold">{m}</td><td className="pr-2"><code className="break-all">{apiRoot}{path}</code></td><td className="pr-2">{d}</td><td>{sc}</td></tr>)}</tbody></table></div>
    </div>
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" />Details provided by JAAGA X Global Admin</h3>
      <p className="mt-1 text-xs text-muted-foreground">For Provider → JAAGA X or Bidirectional connections, approve and activate the request, select only the permissions required, then provide the client ID, one-time client secret, token URL, API base URL and signed webhook details to the OTA.</p>
      <div className="mt-3"><Label>Permissions for the next issued credential</Label><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">{integrationScopes.map(scope => <label key={scope} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={selectedScopes.includes(scope)} onChange={e => setSelectedScopes(current => e.target.checked ? [...current, scope] : current.filter(item => item !== scope))} />{scope}</label>)}</div><p className="mt-2 text-xs text-muted-foreground">Rotating credentials immediately revokes the previous client and its access tokens.</p></div>
    </div>
    <h3 className="font-medium">Waiting for review ({pending.length})</h3>{pending.map(card)}{!pending.length && <p className="text-sm text-muted-foreground">No submitted connections are waiting.</p>}
    <h3 className="pt-3 font-medium">All connections ({others.length})</h3>{others.map(card)}{!others.length && !pending.length && <p className="text-sm text-muted-foreground">No integration connection requests have been created. A hotel partner first requests a connection from Partner Dashboard → Integrations; it then appears here for you to add provider details, test, approve and activate.</p>}

    <Dialog open={!!handover} onOpenChange={open => { if (!open) setHandover(null); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{handoverName} · JAAGA X connection details</DialogTitle><DialogDescription>Provide these details to the OTA integration team. {handover?.client_secret ? "Copy both secrets now; they cannot be shown again after closing." : "Existing secrets are never displayed again. Rotate credentials if the OTA needs a new copy."}</DialogDescription></DialogHeader>
        {handover && <><div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">The OTA uses the client ID and secret at the token URL, calls the API base URL with the returned Bearer token, and sends signed booking events to the webhook URL.</div>
          {!handover.credentials_issued && <p className="rounded-md border border-border p-3 text-sm">No API credential has been issued yet. Close this window and select <strong>Provide JAAGA X credentials</strong>.</p>}
          <div className="ix-secret">{detailRows.map(([label, value]) => <div key={label}><Label>{label}</Label><div className="relative"><code className="pr-10">{value}</code><Button className="absolute right-1 top-1" size="icon" variant="ghost" aria-label={`Copy ${label}`} onClick={() => copy(value)}><Copy className="h-4 w-4" /></Button></div></div>)}</div>
          <div><Label>Approved API permissions</Label><div className="mt-2 flex flex-wrap gap-2">{handover.scopes.length ? handover.scopes.map(scope => <span key={scope} className="ix-badge">{scope}</span>) : <span className="text-xs text-muted-foreground">No permissions issued yet</span>}</div></div>
          {handover.client_secret && <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">These secrets grant the permissions shown above. Send them only through an approved private channel; do not place them in email, chat, screenshots or browser code.</div>}
        </>}
      </DialogContent>
    </Dialog>
  </section>;
}
