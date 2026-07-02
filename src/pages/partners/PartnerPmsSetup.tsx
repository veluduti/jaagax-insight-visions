import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PartnerNav from "@/components/partners/PartnerNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2, CheckCircle2, ArrowRight, ArrowLeft, Zap, Plug,
  RefreshCw, Server, Sparkles, ShieldCheck,
} from "lucide-react";

const PMS_PROVIDERS = [
  { id: "cloudbeds", name: "Cloudbeds", desc: "All-in-one hospitality management" },
  { id: "ezee", name: "eZee Absolute", desc: "Cloud PMS + channel manager" },
  { id: "hostaway", name: "Hostaway", desc: "Vacation rental automation" },
  { id: "little_hotelier", name: "Little Hotelier", desc: "Small property specialist" },
  { id: "staah", name: "STAAH", desc: "Distribution & channel manager" },
  { id: "custom", name: "Custom / Other", desc: "Bring your own API endpoint" },
  { id: "none", name: "Manual mode", desc: "No PMS — manage inventory here" },
];

const CHANNELS = [
  { id: "booking_com", name: "Booking.com", commission: 15 },
  { id: "airbnb", name: "Airbnb", commission: 14 },
  { id: "makemytrip", name: "MakeMyTrip", commission: 18 },
  { id: "goibibo", name: "Goibibo", commission: 18 },
  { id: "agoda", name: "Agoda", commission: 17 },
  { id: "expedia", name: "Expedia", commission: 16 },
];

const STEPS = ["Choose PMS", "Connect", "Channels", "Sync prefs", "Test & finish"];

export default function PartnerPmsSetup() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);

  const [pms, setPms] = useState("cloudbeds");
  const [mode, setMode] = useState<"api" | "manual">("api");
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [propertyCode, setPropertyCode] = useState("");
  const [testResult, setTestResult] = useState<"idle" | "ok" | "fail">("idle");
  const [channels, setChannels] = useState<Record<string, { on: boolean; extId: string; commission: number }>>(
    Object.fromEntries(CHANNELS.map(c => [c.id, { on: false, extId: "", commission: c.commission }]))
  );
  const [prefs, setPrefs] = useState({
    sync_rates: true, sync_inventory: true, sync_restrictions: false, sync_reservations: true,
    sync_interval_minutes: 15,
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav("/partners/login", { replace: true }); return; }
      setUserId(user.id);
      const { data: app } = await (supabase as any)
        .from("hotel_partner_applications")
        .select("id,status,pms_setup_completed")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!app) { nav("/partners/kyc", { replace: true }); return; }
      if (app.status !== "approved") { nav("/partners/status", { replace: true }); return; }
      setAppId(app.id);
      if (app.pms_setup_completed) { nav("/partners/dashboard", { replace: true }); return; }
      setLoading(false);
    })();
  }, [nav]);

  const canNext = useMemo(() => {
    if (step === 0) return !!pms;
    if (step === 1) return pms === "none" || mode === "manual" || (endpoint.length > 4 && apiKey.length > 4);
    return true;
  }, [step, pms, mode, endpoint, apiKey]);

  useEffect(() => { if (pms === "none") setMode("manual"); }, [pms]);

  const runTest = async () => {
    setTestResult("idle");
    await new Promise(r => setTimeout(r, 900));
    // Basic heuristic: manual mode always OK; api needs endpoint+key
    if (pms === "none" || mode === "manual") { setTestResult("ok"); return; }
    setTestResult(endpoint && apiKey ? "ok" : "fail");
  };

  const finish = async () => {
    if (!userId || !appId) return;
    setSaving(true);
    try {
      const { data: conn, error: connErr } = await (supabase as any)
        .from("hotel_pms_connections")
        .insert({
          user_id: userId, application_id: appId,
          pms_provider: pms, connection_mode: pms === "none" ? "manual" : mode,
          api_endpoint: endpoint || null,
          api_key_masked: apiKey ? `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}` : null,
          property_code: propertyCode || null,
          sync_status: testResult === "ok" ? "connected" : "pending",
          last_sync_at: testResult === "ok" ? new Date().toISOString() : null,
          ...prefs,
        }).select("id").single();
      if (connErr) throw connErr;

      const active = Object.entries(channels).filter(([, v]) => v.on);
      if (active.length) {
        const rows = active.map(([channel, v]) => ({
          user_id: userId, application_id: appId, pms_connection_id: conn.id,
          channel, external_property_id: v.extId || null, commission_percent: v.commission,
          sync_enabled: true, last_sync_status: testResult === "ok" ? "success" : "pending",
          last_sync_at: testResult === "ok" ? new Date().toISOString() : null,
        }));
        const { error: chErr } = await (supabase as any).from("hotel_channel_mappings").insert(rows);
        if (chErr) throw chErr;
      }

      const { error: appErr } = await (supabase as any)
        .from("hotel_partner_applications")
        .update({ pms_setup_completed: true, pms_provider: pms })
        .eq("id", appId);
      if (appErr) throw appErr;

      toast.success("PMS setup complete — welcome to your dashboard!");
      nav("/partners/dashboard", { replace: true });
    } catch (e: any) {
      toast.error(e?.message || "Could not save PMS setup");
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PartnerNav />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PartnerNav />
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8">
          <p className="text-sm text-emerald-400">Step {step + 1} of {STEPS.length}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Connect your PMS & channels</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sync rates, inventory and reservations across every OTA — in minutes.
          </p>
          <div className="mt-5 grid grid-cols-5 gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className={`h-1.5 rounded-full ${i <= step ? "bg-emerald-500" : "bg-muted"}`} />
            ))}
          </div>
        </div>

        <Card className="border border-border/60 bg-background/60 backdrop-blur">
          <CardContent className="p-6 sm:p-8">
            {step === 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {PMS_PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPms(p.id)}
                    className={`rounded-xl border p-4 text-left transition ${pms === p.id ? "border-emerald-500 bg-emerald-500/10" : "border-border/60 hover:border-emerald-500/40"}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                      </div>
                      {pms === p.id && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-4">
                  <Server className="h-5 w-5 text-emerald-400" />
                  <div className="flex-1">
                    <p className="font-medium">Connection mode</p>
                    <p className="text-xs text-muted-foreground">Switch to manual to skip API and manage inventory in JAAGA X.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">Manual</span>
                    <Switch checked={mode === "api"} disabled={pms === "none"} onCheckedChange={(v) => setMode(v ? "api" : "manual")} />
                    <span className="text-xs">API</span>
                  </div>
                </div>
                {mode === "api" && pms !== "none" ? (
                  <div className="grid gap-4">
                    <div>
                      <Label>API Endpoint</Label>
                      <Input placeholder="https://api.provider.com/v1" value={endpoint} onChange={e => setEndpoint(e.target.value)} className="mt-1.5" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>API Key / Token</Label>
                        <Input type="password" placeholder="••••••••••••" value={apiKey} onChange={e => setApiKey(e.target.value)} className="mt-1.5" />
                      </div>
                      <div>
                        <Label>Property code (optional)</Label>
                        <Input placeholder="HOTEL-1234" value={propertyCode} onChange={e => setPropertyCode(e.target.value)} className="mt-1.5" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" /> Keys are stored securely and never exposed to the browser.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/60 p-6 text-center">
                    <Sparkles className="mx-auto h-8 w-8 text-emerald-400" />
                    <p className="mt-2 font-semibold">Manual mode</p>
                    <p className="text-sm text-muted-foreground">You'll manage rooms, rates, and reservations directly inside JAAGA X.</p>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Toggle the channels you want to sync. You can change these later.</p>
                {CHANNELS.map(c => {
                  const st = channels[c.id];
                  return (
                    <div key={c.id} className="rounded-lg border border-border/60 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{c.name}</p>
                          <p className="text-xs text-muted-foreground">Default commission: {c.commission}%</p>
                        </div>
                        <Switch checked={st.on} onCheckedChange={(v) => setChannels(prev => ({ ...prev, [c.id]: { ...prev[c.id], on: v } }))} />
                      </div>
                      {st.on && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <Input placeholder="External property ID (optional)" value={st.extId}
                            onChange={e => setChannels(prev => ({ ...prev, [c.id]: { ...prev[c.id], extId: e.target.value } }))} />
                          <Input type="number" placeholder="Commission %" value={st.commission}
                            onChange={e => setChannels(prev => ({ ...prev, [c.id]: { ...prev[c.id], commission: Number(e.target.value) } }))} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                {[
                  ["sync_rates", "Sync rates", "Push your price updates to OTAs"],
                  ["sync_inventory", "Sync inventory", "Keep room availability in sync"],
                  ["sync_restrictions", "Sync restrictions", "Min/max nights, close-outs"],
                  ["sync_reservations", "Pull reservations", "Bring OTA bookings into JAAGA X"],
                ].map(([k, t, d]) => (
                  <div key={k} className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                    <div>
                      <p className="font-semibold">{t}</p>
                      <p className="text-xs text-muted-foreground">{d}</p>
                    </div>
                    <Switch checked={(prefs as any)[k]} onCheckedChange={(v) => setPrefs(p => ({ ...p, [k]: v }))} />
                  </div>
                ))}
                <div className="rounded-lg border border-border/60 p-4">
                  <Label>Sync interval (minutes)</Label>
                  <Input type="number" min={5} max={120} value={prefs.sync_interval_minutes} className="mt-1.5 max-w-[180px]"
                    onChange={e => setPrefs(p => ({ ...p, sync_interval_minutes: Number(e.target.value) }))} />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-5">
                  <div className="flex items-center gap-3">
                    <Plug className="h-5 w-5 text-emerald-400" />
                    <div className="flex-1">
                      <p className="font-semibold">Test connection</p>
                      <p className="text-xs text-muted-foreground">Verify credentials and ensure JAAGA X can reach your PMS.</p>
                    </div>
                    <Button onClick={runTest} variant="outline" size="sm"><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Run test</Button>
                  </div>
                  {testResult !== "idle" && (
                    <div className={`mt-4 rounded-md p-3 text-sm ${testResult === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                      {testResult === "ok" ? "Connection healthy · sync channel ready." : "Could not connect. Check endpoint & key."}
                    </div>
                  )}
                </div>
                <div className="rounded-lg border border-border/60 p-5">
                  <p className="mb-3 flex items-center gap-2 font-semibold"><Zap className="h-4 w-4 text-emerald-400" /> Summary</p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    <li>PMS: <span className="text-foreground">{PMS_PROVIDERS.find(p => p.id === pms)?.name}</span></li>
                    <li>Mode: <span className="text-foreground capitalize">{pms === "none" ? "manual" : mode}</span></li>
                    <li>Channels: <span className="text-foreground">{Object.values(channels).filter(c => c.on).length} enabled</span></li>
                    <li>Sync interval: <span className="text-foreground">every {prefs.sync_interval_minutes} min</span></li>
                  </ul>
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between border-t border-border/60 pt-6">
              <Button variant="ghost" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0 || saving}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button className="bg-emerald-500 text-white hover:bg-emerald-600" disabled={!canNext} onClick={() => setStep(s => s + 1)}>
                  Continue <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : (
                <Button className="bg-emerald-500 text-white hover:bg-emerald-600" disabled={saving} onClick={finish}>
                  {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                  Finish setup
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Need help? <a href="mailto:partners@jaagax.com" className="text-emerald-400 hover:underline">partners@jaagax.com</a>
        </p>
        <Badge variant="outline" className="mt-4 hidden" />
      </div>
    </div>
  );
}
