import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Activity, ArrowLeft, ArrowRight, BookOpen, Cable, Check, CheckCircle2, Code2, FileClock, Hotel, Link2, Loader2, Plus, RefreshCw, Settings2, ShieldCheck, TriangleAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import { apiRoot, otaEndpoints } from "@/lib/otaEndpoints";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { integrationKindLabel, integrationRequest, integrationStatusLabel, loadIntegrationOverview, type IntegrationConnection, type IntegrationOverview } from "@/services/hospitality/integrationService";
import { integrationScopes } from "@/lib/integrationRules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import "./integration-workspace.css";

const steps = ["Select provider", "Configure", "Property & Mapping", "Sync & Rules", "Review & Submit"];
const blankSettings = { sync_inventory: true, sync_rates: true, sync_reservations: true, sync_interval_minutes: 15, inventory_master: "jaagax", rates_master: "jaagax", webhook_url: "" };
const date = (value?: string | null) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Never";

export default function PartnerIntegrations() {
  const ctx = usePartnerHotel();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [data, setData] = useState<IntegrationOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [tab, setTab] = useState("connections");
  const [kind, setKind] = useState<"ota" | "pms" | "channel_manager">("pms");
  const [wizard, setWizard] = useState(false);
  const [step, setStep] = useState(0);
  const [connection, setConnection] = useState<IntegrationConnection | null>(null);
  const [providerKey, setProviderKey] = useState("");
  const [direction, setDirection] = useState<"inbound" | "outbound" | "bidirectional">("outbound");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [externalProperty, setExternalProperty] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [roomMap, setRoomMap] = useState<Record<string, string>>({});
  const [rateMap, setRateMap] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState({ ...blankSettings });
  const [testResult, setTestResult] = useState<{ success: boolean; checks: { name: string; ok: boolean; detail: string }[] } | null>(null);

  const load = useCallback(async () => {
    if (!ctx.hotelId) { setLoading(false); return; }
    try { setError(""); setData(await loadIntegrationOverview(ctx.hotelId)); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [ctx.hotelId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!wizard || !connection || !data) return;
    const fresh = data.connections.find(c => c.id === connection.id);
    if (fresh) setConnection(fresh);
  }, [data]); // Keep the active setup synchronized with server review state.

  const providers = useMemo(() => data?.providers.filter(p => p.kind === kind && p.configuration_enabled) ?? [], [data, kind]);
  const provider = data?.providers.find(p => p.key === (connection?.channel ?? providerKey));
  const rooms = useMemo(() => data?.rooms.filter(r => r.hotel_id === ctx.hotelId && r.is_active !== false) ?? [], [data, ctx.hotelId]);
  const rates = useMemo(() => data?.rate_plans.filter(r => r.hotel_id === ctx.hotelId && r.is_active !== false) ?? [], [data, ctx.hotelId]);
  const connections = data?.connections ?? [];
  const completedJobs = (data?.jobs ?? []).filter(j => ["success", "failed"].includes(j.status));
  const successRate = completedJobs.length ? `${Math.round(completedJobs.filter(j => j.status === "success").length / completedJobs.length * 100)}%` : "—";
  const sortedSyncDates = connections.map(c => c.last_sync_at).filter(Boolean).sort();
  const lastSync = sortedSyncDates[sortedSyncDates.length - 1];

  const openWizard = (existing?: IntegrationConnection) => {
    setConnection(existing ?? null); setStep(existing ? 1 : 0); setWizard(true); setTestResult(null);
    const nextKind = existing?.connection_kind ?? kind; setKind(nextKind);
    setProviderKey(existing?.channel ?? ""); setDirection(existing?.direction ?? "outbound"); setEnvironment(existing?.environment ?? "sandbox");
    setExternalProperty(existing?.channel_property_id ?? ""); setEndpoint(existing?.settings?.api_endpoint ?? ""); setWebhookUrl(existing?.settings?.webhook_url ?? "");
    setApiKey(""); setApiSecret("");
    setSettings(existing ? { ...blankSettings, ...existing.settings, webhook_url: existing.settings?.webhook_url ?? "" } : { ...blankSettings });
    setRoomMap(Object.fromEntries((data?.room_mappings ?? []).filter(m => m.connection_id === existing?.id).map(m => [m.room_id, m.external_room_id])));
    setRateMap(Object.fromEntries((data?.rate_mappings ?? []).filter(m => m.connection_id === existing?.id).map(m => [m.rate_plan_id, m.external_rate_plan_id])));
  };

  const run = async (action: string, body: Record<string, unknown>, message?: string) => {
    setBusy(action);
    try { const result = await integrationRequest<any>({ action, ...body }); if (message) toast.success(message); await load(); return result; }
    catch (e) { toast.error((e as Error).message); throw e; }
    finally { setBusy(""); }
  };

  const next = async () => {
    try {
      if (step === 0) { if (!providerKey) return toast.error("Select a provider"); setStep(1); return; }
      if (step === 1) {
        let current = connection;
        if (!current) {
          const created = await run("create", { hotel_id: ctx.hotelId, provider_key: providerKey, connection_kind: kind, direction, environment, external_property_id: externalProperty.trim() });
          current = created.connection; setConnection(current);
        }
        if (current?.channel === "hyperguest") await run("credentials", { connection_id: current.id });
        setStep(2); return;
      }
      if (step === 2) {
        const selectedRooms = Object.entries(roomMap).filter(([, external]) => external.trim()).map(([room_id, external_room_id]) => ({ room_id, external_room_id: external_room_id.trim() }));
        if (!selectedRooms.length) return toast.error("Map at least one room type");
        const selectedRates = Object.entries(rateMap).filter(([, external]) => external.trim()).map(([rate_plan_id, external_rate_plan_id]) => { const rate = rates.find(r => r.id === rate_plan_id); return { rate_plan_id, room_id: rate?.room_id ?? selectedRooms[0].room_id, external_rate_plan_id: external_rate_plan_id.trim() }; });
        await run("mappings", { connection_id: connection?.id, rooms: selectedRooms, rates: selectedRates }, "Property mappings saved"); setStep(3); return;
      }
      if (step === 3) { await run("settings", { connection_id: connection?.id, ...settings, sync_interval_minutes: Number(settings.sync_interval_minutes), webhook_url: settings.webhook_url || null }, "Synchronization rules saved"); setStep(4); return; }
      if (step === 4) { await run("submit", { connection_id: connection?.id }, "Submitted to Global Admin for verification"); setWizard(false); setTab("connections"); }
    } catch { /* The service already displayed the actionable error. */ }
  };

  const test = async () => {
    try { const result = await run("test", { connection_id: connection?.id }); setTestResult(result); if (result.success) toast.success("Real connection checks passed"); else toast.error("One or more connection checks failed"); }
    catch { /* handled */ }
  };

  const sync = async (c: IntegrationConnection, action = "sync") => { try { await run(action, { connection_id: c.id }, action === "sync" ? "Synchronization queued" : "Reconciliation queued"); } catch { /* handled */ } };
  const completeManual = async () => { try { await run("complete_manual_onboarding", {}, "Manual mode selected"); navigate("/partners/dashboard"); } catch { /* handled */ } };

  if (ctx.loading || loading) return <div className="py-24 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  if (error) return <div role="alert" className="py-16 text-center"><h1 className="text-lg font-semibold">Integrations could not be loaded</h1><p className="my-3 text-muted-foreground">{error}</p><Button onClick={load}><RefreshCw className="h-4 w-4" />Retry</Button></div>;
  if (!ctx.hotelId) return <div className="ix-empty">Select a property to manage integrations.</div>;

  return <div className="ix-page">
    <div className="ix-heading"><div><p className="text-primary text-xs font-semibold">Integrations · OTA, PMS & Channel Manager</p><h1>Integration Platform</h1><p>Connect external systems to the same JAAGA X rooms, rates, availability and reservations.</p></div><div className="ix-actions"><Button variant="outline" onClick={() => setTab("docs")}><BookOpen />Integration Guide</Button>{params.get("onboarding") === "1" && <Button variant="outline" onClick={completeManual}>Continue in manual mode</Button>}<Button onClick={() => openWizard()}><Plus />Add Connection</Button></div></div>
    <div className="ix-kpis">{[
      ["Active Connections", connections.filter(c => c.is_active).length], ["Pending Review", connections.filter(c => c.review_status === "pending_review").length],
      ["Mapped Rooms", data?.room_mappings.filter(m => m.sync_enabled).length ?? 0], ["Sync Jobs", data?.jobs.length ?? 0],
      ["Sync Success", successRate], ["Last Sync", lastSync ? date(lastSync) : "Never"],
    ].map(([label, value]) => <div className="ix-kpi" key={String(label)}><small>{label}</small><strong>{value}</strong></div>)}</div>
    <div className="ix-tabs">{[["connections", "Connections"], ["jobs", "Sync Logs"], ["webhooks", "Webhooks"], ["issues", `Reconciliation (${data?.issues.filter(i => i.status === "open").length ?? 0})`], ["docs", "API Documentation"]].map(([key, label]) => <Button key={key} size="sm" variant={tab === key ? "default" : "outline"} onClick={() => setTab(key)}>{label}</Button>)}</div>

    {wizard ? <div className="ix-layout"><main>
      <div className="ix-steps">{steps.map((label, i) => <div key={label} className="contents"><div className={`ix-step ${i <= step ? "is-active" : ""}`}><span>{i < step ? <Check className="h-4 w-4" /> : i + 1}</span>{label}</div>{i < steps.length - 1 && <div className="ix-step-line" />}</div>)}</div>
      <section className="pw-panel">
        {step === 0 && <><div className="pw-panel-title"><h2><Cable />Select a system to connect</h2><div className="flex gap-1">{(["ota", "pms", "channel_manager"] as const).map(k => <Button key={k} size="sm" variant={kind === k ? "default" : "outline"} onClick={() => { setKind(k); setProviderKey(""); }}>{integrationKindLabel(k)}</Button>)}</div></div><div className="ix-provider-grid">{providers.map(p => <button type="button" key={p.key} className={`ix-provider ${providerKey === p.key ? "is-selected" : ""}`} onClick={() => setProviderKey(p.key)}><span className="ix-provider-icon">{p.name.slice(0, 2).toUpperCase()}</span><span><strong>{p.name}</strong><small>{p.description}</small>{!p.live_adapter && <small>Configuration & review; live adapter required for outbound activation</small>}</span></button>)}</div></>}
        {step === 1 && <><div className="pw-panel-title"><h2><Link2 />{provider?.name} connection details</h2></div><div className="ix-form">
          <div><Label>Direction</Label><select className="w-full rounded-md border border-input px-3" value={direction} disabled={!!connection} onChange={e => setDirection(e.target.value as any)}><option value="outbound">JAAGA X → Provider</option><option value="inbound">Provider → JAAGA X</option><option value="bidirectional">Bidirectional</option></select></div>
          <div><Label>Environment</Label><select className="w-full rounded-md border border-input px-3" value={environment} disabled={!!connection} onChange={e => setEnvironment(e.target.value as any)}><option value="sandbox">Sandbox / Test</option><option value="production">Production</option></select></div>
          <div><Label>External property ID</Label><Input value={externalProperty} disabled={!!connection} onChange={e => setExternalProperty(e.target.value)} placeholder="Optional — Global Admin can add it" /></div>
        </div><div className="mt-4 rounded-md border border-border p-3"><p className="text-sm font-semibold">JAAGA X endpoints for this connection</p><p className="text-xs text-muted-foreground">Base URL: <code className="break-all">{apiRoot}</code>. The OTA uses these after Global Admin approves this request and issues JAAGA X credentials for your hotel.</p><div className="mt-2 overflow-x-auto"><table className="w-full text-xs"><tbody>{otaEndpoints.map(([m, path, d]) => <tr key={m + path} className="border-t border-border"><td className="py-1.5 pr-2 font-semibold">{m}</td><td className="pr-2"><code className="break-all">{path}</code></td><td>{d}</td></tr>)}</tbody></table></div></div><div className="ix-notice mt-3"><ShieldCheck className="inline h-4 w-4 mr-2" />You only request the connection. JAAGA X Global Admin enters the provider API endpoint, keys and webhook details for this hotel, tests them, approves the request and provides any JAAGA X credentials to the OTA.</div></>}
        {step === 2 && <><div className="pw-panel-title"><h2><Hotel />Property, room & rate mapping</h2><span className="text-xs">{provider?.name} · {externalProperty}</span></div>{!rooms.length && <p className="ix-empty">Add active room types before mapping this connection.</p>}{rooms.map(room => <div key={room.id}><div className="ix-mapping"><input type="checkbox" aria-label={`Map ${room.room_name || room.room_type}`} checked={Boolean(roomMap[room.id])} onChange={e => setRoomMap(m => { const next = { ...m }; if (e.target.checked) next[room.id] = next[room.id] ?? `ROOM-${room.id.slice(0, 8).toUpperCase()}`; else { delete next[room.id]; for (const rate of rates.filter(r => r.room_id === room.id)) delete rateMap[rate.id]; } return next; })} /><div><strong>{room.room_name || room.room_type}</strong><small className="block">JAAGA X · up to {room.max_occupancy ?? "—"} guests</small></div><div><Input aria-label={`External room ID for ${room.room_name || room.room_type}`} disabled={!roomMap[room.id]} value={roomMap[room.id] ?? ""} onChange={e => setRoomMap(m => ({ ...m, [room.id]: e.target.value }))} placeholder="External room ID" /></div></div>{rates.filter(r => r.room_id === room.id).map(rate => <div className="ix-mapping ix-mapping-rate" key={rate.id}><input type="checkbox" aria-label={`Map rate ${rate.name || rate.rate_plan_name}`} disabled={!roomMap[room.id]} checked={Boolean(rateMap[rate.id])} onChange={e => setRateMap(m => ({ ...m, [rate.id]: e.target.checked ? `RATE-${rate.id.slice(0, 8).toUpperCase()}` : "" }))} /><div><strong>{rate.name || rate.rate_plan_name || rate.rate_plan_code}</strong><small className="block">Rate plan</small></div><div><Input aria-label={`External rate ID for ${rate.name || rate.rate_plan_name}`} disabled={!rateMap[rate.id]} value={rateMap[rate.id] ?? ""} onChange={e => setRateMap(m => ({ ...m, [rate.id]: e.target.value }))} placeholder="External rate plan ID" /></div></div>)}</div>)}</>}
        {step === 3 && <><div className="pw-panel-title"><h2><Settings2 />Synchronization settings</h2></div><div className="ix-checks">{[["sync_inventory", "Inventory & availability"], ["sync_rates", "Rates & pricing"], ["sync_reservations", "Reservations, modifications & cancellations"]].map(([key, label]) => <div className="ix-check" key={key}><span>{label}</span><Switch checked={(settings as any)[key]} onCheckedChange={value => setSettings(s => ({ ...s, [key]: value }))} /></div>)}<div className="ix-check"><span>Sync frequency (minutes)</span><Input className="w-28" type="number" min={5} max={1440} value={settings.sync_interval_minutes} onChange={e => setSettings(s => ({ ...s, sync_interval_minutes: Number(e.target.value) }))} /></div><div className="ix-check"><span>Inventory master</span><select value={settings.inventory_master} onChange={e => setSettings(s => ({ ...s, inventory_master: e.target.value }))}><option value="jaagax">JAAGA X</option><option value="external">External provider</option></select></div><div className="ix-check"><span>Rates master</span><select value={settings.rates_master} onChange={e => setSettings(s => ({ ...s, rates_master: e.target.value }))}><option value="jaagax">JAAGA X</option><option value="external">External provider</option></select></div></div><p className="text-xs text-muted-foreground mt-3">Only one system should control each field. External-master updates affect the shared rate calendar, not a duplicate inventory.</p></>}
        {step === 4 && <><div className="pw-panel-title"><h2><ShieldCheck />Review & submit</h2></div><div className="ix-notice">Global Admin will add the provider endpoints and keys, run the real test, approve and activate this request. Draft, submitted or approved connections cannot write reservations or synchronize live inventory.</div><div className="pw-key"><span>Provider</span><strong>{provider?.name}</strong></div><div className="pw-key"><span>Direction / environment</span><strong>{direction} · {environment}</strong></div><div className="pw-key"><span>External property</span><strong>{externalProperty}</strong></div><div className="pw-key"><span>Mapped rooms / rates</span><strong>{Object.values(roomMap).filter(Boolean).length} / {Object.values(rateMap).filter(Boolean).length}</strong></div>{!provider?.live_adapter && direction !== "inbound" && <p className="text-xs text-muted-foreground mt-3">This request can be reviewed, but outbound activation remains blocked until the provider-specific live adapter and commercial access are approved.</p>}</>}
        <div className="ix-footer"><Button variant="outline" onClick={() => step === 0 ? setWizard(false) : setStep(s => s - 1)}><ArrowLeft />{step === 0 ? "Cancel" : "Back"}</Button><Button disabled={!!busy} onClick={next}>{busy && <Loader2 className="animate-spin" />}{step === 4 ? "Submit for Global Admin Review" : "Save & Continue"}<ArrowRight /></Button></div>
      </section>
      {step > 0 && <div className="ix-sync-grid"><section className="pw-panel"><h2 className="font-bold mb-2">What will be synced?</h2>{[["Room inventory (availability)", settings.sync_inventory], ["Rates & pricing", settings.sync_rates], ["New bookings, modifications & cancellations", settings.sync_reservations]].map(([label, on]) => <div key={String(label)} className="flex items-center gap-2 text-sm py-1">{on ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}{label}</div>)}<p className="text-xs text-muted-foreground mt-2">{Object.values(roomMap).filter(Boolean).length} room types · {Object.values(rateMap).filter(Boolean).length} rate plans mapped · every {settings.sync_interval_minutes} min</p></section><section className="pw-panel"><h2 className="font-bold mb-2">Data flow</h2><div className="ix-flow"><span className="ix-flow-node"><Hotel className="h-5 w-5" />{ctx.hotelName}<small>JAAGA X inventory</small></span><span className="ix-flow-arrow">{direction === "bidirectional" ? "⇄" : direction === "inbound" ? "←" : "→"}</span><span className="ix-flow-node"><Cable className="h-5 w-5" />{provider?.name ?? "Provider"}<small>{integrationKindLabel(kind)}</small></span></div><p className="text-xs text-muted-foreground mt-2">One shared calendar: bookings from {provider?.name ?? "the provider"} reduce the same rooms sold on JAAGA X, preventing overbooking.</p></section></div>}
    </main><aside className="ix-rail"><section className="pw-panel"><div className="pw-panel-title"><h2>Setup Progress</h2><span>{Math.round((step + 1) / steps.length * 100)}%</span></div><div className="ix-progress">{steps.map((label, i) => <div key={label}><CheckCircle2 /><span><strong>{label}</strong><small className="block">{i < step ? "Complete" : i === step ? "Current step" : "Pending"}</small></span></div>)}</div></section><section className="pw-panel"><h2 className="font-bold mb-2">Activation safeguard</h2><p className="text-xs text-muted-foreground">Global Admin adds the provider endpoints and keys, runs a real test and approves before activation. Changing approved mappings returns the connection to draft.</p></section></aside></div> : <>
      {tab === "connections" && <div className="ix-layout"><main><section className="pw-panel"><div className="pw-panel-title"><h2><Cable />Connected Systems</h2><div className="flex gap-1">{(["ota", "pms", "channel_manager"] as const).map(k => <Button key={k} size="sm" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)}>{integrationKindLabel(k)}</Button>)}</div></div>{connections.filter(c => c.connection_kind === kind).map(c => { const p = data?.providers.find(p => p.key === c.channel); const mapped = data?.room_mappings.filter(m => m.connection_id === c.id).length ?? 0; return <article className="ix-connection" key={c.id}><div><h3>{p?.name ?? c.channel}</h3><p>{c.direction} · {c.environment} · {c.channel_property_id}</p></div><div className="ix-fact"><small>Review / Activation</small><strong><span className={`ix-badge ${c.review_status}`}>{integrationStatusLabel(c.review_status)}</span></strong></div><div className="ix-fact"><small>Health / Mapping</small><strong>{c.last_sync_status ?? c.last_test_status ?? "Not tested"} · {mapped} rooms</strong></div><div className="flex flex-wrap gap-2">{["draft", "rejected"].includes(c.review_status) && <Button size="sm" variant="outline" onClick={() => openWizard(c)}>Continue setup</Button>}{c.is_active && <Button size="sm" variant="outline" onClick={() => sync(c)} disabled={!!busy}><RefreshCw />Sync now</Button>}<Button size="sm" variant="ghost" onClick={() => setTab("jobs")}>Logs</Button></div>{c.review_notes && <p className="col-span-full text-xs">Admin note: {c.review_notes}</p>}{c.last_sync_error && <p className="col-span-full text-xs text-destructive">{c.last_sync_error}</p>}</article>; })}{!connections.some(c => c.connection_kind === kind) && <div className="ix-empty"><Cable className="mx-auto mb-3 h-8 w-8" /><p>No {integrationKindLabel(kind)} connections for this property.</p><Button className="mt-3" onClick={() => openWizard()}><Plus />Add your first connection</Button></div>}</section></main><aside className="ix-rail"><section className="pw-panel"><div className="pw-panel-title"><h2>Integration Health</h2></div>{connections.map(c => <div className="ix-test-check" key={c.id}><span>{data?.providers.find(p => p.key === c.channel)?.name}</span><span className="ix-health"><i className={`ix-health-dot ${c.last_sync_status ?? c.last_test_status ?? ""}`} />{c.is_active ? "Active" : integrationStatusLabel(c.review_status)}</span></div>)}{!connections.length && <p className="ix-empty">Health appears after a connection is configured.</p>}</section><section className="pw-panel"><h2 className="font-bold">Provider availability</h2><p className="text-xs text-muted-foreground mt-2">HyperGuest uses the existing live adapter. Other providers require approved API access and a provider-specific adapter before outbound activation.</p></section></aside></div>}
      {tab === "jobs" && <section className="pw-panel"><div className="pw-panel-title"><h2><FileClock />Synchronization Monitoring</h2><Button variant="outline" size="sm" onClick={load}><RefreshCw />Refresh</Button></div>{data?.jobs.map(j => <div className="ix-log" key={j.id}><time>{date(j.created_at)}</time><span>{data?.providers.find(p => p.key === connections.find(c => c.id === j.connection_id)?.channel)?.name} · {j.kind}</span><span><i className={`ix-badge ${j.status}`}>{j.status}</i> · {j.attempts}/{j.max_attempts} attempts</span><span>{j.last_error || (j.completed_at ? `Completed ${date(j.completed_at)}` : `Next ${date(j.next_attempt_at)}`)}</span></div>)}{!data?.jobs.length && <p className="ix-empty">No synchronization jobs yet.</p>}</section>}
      {tab === "webhooks" && <div className="grid gap-3 lg:grid-cols-2"><section className="pw-panel"><h2 className="font-bold mb-2">Incoming events</h2>{data?.webhook_events.map(e => <div className="ix-log !grid-cols-2" key={e.id}><span>{e.event_type}<small className="block">{date(e.received_at)}</small></span><span><i className={`ix-badge ${e.status}`}>{e.status}</i><small className="block">Signature {e.signature_verified ? "verified" : "not verified"} · {e.last_error}</small></span></div>)}{!data?.webhook_events.length && <p className="ix-empty">No signed incoming webhooks received.</p>}</section><section className="pw-panel"><h2 className="font-bold mb-2">Outbound deliveries</h2>{data?.deliveries.map(e => <div className="ix-log !grid-cols-2" key={e.id}><span>{e.event_type}<small className="block">{date(e.created_at)}</small></span><span><i className={`ix-badge ${e.status}`}>{e.status}</i><small className="block">HTTP {e.response_status ?? "—"} · {e.last_error}</small></span></div>)}{!data?.deliveries.length && <p className="ix-empty">No outbound webhook deliveries recorded.</p>}</section></div>}
      {tab === "issues" && <section className="pw-panel"><div className="pw-panel-title"><h2><TriangleAlert />Reconciliation Dashboard</h2></div>{data?.issues.map(issue => { const c = connections.find(c => c.id === issue.connection_id); return <div className="ix-log" key={issue.id}><time>{date(issue.detected_at)}</time><span>{issue.entity_type} · {issue.entity_id}<small className="block">{issue.issue_type}</small></span><span>{issue.details || "Local and remote records differ"}</span><span>{issue.status === "open" ? <Button size="sm" variant="outline" disabled={!c || !!busy} onClick={() => c && run("resolve_issue", { connection_id: c.id, issue_id: issue.id }, "Issue marked resolved")}>Mark resolved</Button> : <i className="ix-badge success">Resolved</i>}</span></div>; })}{!data?.issues.length && <p className="ix-empty">No reconciliation mismatches have been reported.</p>}</section>}
      {tab === "docs" && <div className="ix-layout"><main className="ix-docs"><section className="pw-panel"><div className="pw-panel-title"><h2><Code2 />JAAGA X Partner API</h2></div><p className="text-sm text-muted-foreground">Approved inbound and bidirectional connections use client credentials to obtain a one-hour Bearer token. Every reservation write requires an Idempotency-Key.</p>{[["POST", "/oauth/token — client_id, client_secret, grant_type=client_credentials"], ["GET", "/v1/properties"], ["GET", "/v1/rooms"], ["GET", "/v1/rate-plans"], ["GET", "/v1/availability?from=YYYY-MM-DD&to=YYYY-MM-DD"], ["PUT", "/v1/availability — mapped calendar rows"], ["PUT", "/v1/rates — mapped calendar prices"], ["POST", "/v1/reservations — Idempotency-Key required"], ["GET", "/v1/reservations/{external_booking_id}"], ["PATCH", "/v1/reservations/{external_booking_id} — increment external_version"], ["POST", "/v1/reservations/{external_booking_id}/cancel"]].map(([method, text]) => <div className="ix-endpoint" key={method + text}><strong>{method}</strong><code>{text}</code></div>)}<details className="mt-3 rounded-xl border border-border p-4 text-sm"><summary className="cursor-pointer font-semibold">Reservation request example</summary><pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">{`{
  "external_booking_id": "PMS-10042",
  "external_version": 1,
  "room_id": "JAAGA-X-room-UUID",
  "rate_plan_id": "JAAGA-X-rate-plan-UUID",
  "check_in": "2027-06-10",
  "check_out": "2027-06-12",
  "adults": 2,
  "children": 1,
  "child_ages": [8],
  "num_rooms": 1,
  "guest_name": "Guest Name",
  "guest_email": "guest@example.com",
  "guest_phone": "+91...",
  "currency": "INR"
}`}</pre><p className="mt-3 text-xs leading-5 text-muted-foreground">Creation and modification accept this shape. Cancellation accepts external_version and an optional reason. JAAGA X calculates the authoritative price; client-supplied totals are ignored.</p></details><details className="mt-3 rounded-xl border border-border p-4 text-sm"><summary className="cursor-pointer font-semibold">Availability and rate updates</summary><pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">{`{
  "rows": [{
    "room_id": "JAAGA-X-room-UUID",
    "rate_plan_id": "JAAGA-X-rate-plan-UUID",
    "date": "2027-06-10",
    "available_units": 4,
    "stop_sell": false,
    "price": 5000,
    "currency": "INR"
  }]
}`}</pre><p className="mt-3 text-xs leading-5 text-muted-foreground">Every room must be mapped and synchronization must be enabled. External calendar writes require the corresponding external-master mode.</p></details><div className="ix-notice mt-3">Global Admin provides the JAAGA X client ID, one-time client secret, API URLs and webhook signing secret after activation. Rotating credentials revokes prior client access.</div></section><section className="pw-panel"><h2 className="font-bold">Signed webhooks</h2><p className="text-xs text-muted-foreground mt-2">Send the exact raw request body signature in X-Jaaga-Signature using Base64 HMAC-SHA256. Supported events: reservation.created, reservation.modified, reservation.cancelled, inventory.updated and rates.updated. Duplicate event IDs are safely acknowledged.</p><pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-muted p-4 text-xs text-muted-foreground">{`{
  "event_id": "provider-event-unique-id",
  "event_type": "reservation.created",
  "occurred_at": "2027-01-01T10:00:00Z",
  "data": { "external_booking_id": "PMS-10042", "...": "reservation fields" }
}`}</pre><p className="mt-3 text-xs leading-5 text-muted-foreground">Failed outbound deliveries retry after 1, 5, 15 and 30 minutes. After five failed attempts they remain visible for reconciliation. HTTP 4xx validation errors are not retried.</p><h3 className="font-semibold text-sm mt-4">Available scopes</h3><div className="flex flex-wrap gap-2 mt-2">{integrationScopes.map(scope => <span className="ix-badge" key={scope}>{scope}</span>)}</div></section></main><aside className="ix-rail"><section className="pw-panel"><h2 className="font-bold">Global Admin credential issuance</h2><p className="text-xs text-muted-foreground my-2">After activation, Global Admin opens Hotel Integrations (OTA/PMS), selects the approved permissions and provides the OTA with its JAAGA X client credentials, API endpoints and signed webhook details.</p><p className="text-xs text-muted-foreground">Secrets appear once to Global Admin and are never exposed in this property workspace.</p></section></aside></div>}
    </>}

  </div>;
}
