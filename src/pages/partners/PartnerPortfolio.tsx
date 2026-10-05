import { useCallback, useEffect, useState } from "react";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, CheckCircle2, Circle, ExternalLink, Loader2, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import {
  getOrCreatePartnerAccount, listBusinesses, createBusiness, listProperties, assignPropertyToBusiness,
  getQuality, requestPublish, saveTypeDetails, updatePartnerAccount,
  type PartnerAccount, type PartnerBusiness, type PartnerProperty, type QualityReport,
} from "@/services/hospitality/partnerService";
import { setupFieldsFor } from "@/config/hospitalityCategories";

const CHECK_LABELS: Record<string, string> = {
  business: "Business linked", property: "Name & description (40+ chars)", location: "Map location",
  type: "Property type chosen", amenities: "At least 3 amenities", photos: "At least 3 photos",
  rooms: "Rooms / units / beds added", pricing: "Every room has a price", policies: "Check-in & check-out times",
  verified: "Verified by JAAGA",
};
const STATUS_LABEL: Record<string, string> = { draft: "Draft", pending_review: "Waiting for JAAGA review", published: "Live", unpublished: "Unpublished" };

export default function PartnerPortfolio() {
  const ctx = usePartnerHotel();
  const [account, setAccount] = useState<PartnerAccount | null>(null);
  const [businesses, setBusinesses] = useState<PartnerBusiness[]>([]);
  const [properties, setProperties] = useState<PartnerProperty[]>([]);
  const [quality, setQuality] = useState<Record<string, QualityReport | null>>({});
  const [newBiz, setNewBiz] = useState({ name: "", gstin: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!ctx.userId) return;
    try {
      const acc = await getOrCreatePartnerAccount(ctx.userId, ctx.hotelName);
      setAccount(acc);
      const [b, p] = await Promise.all([listBusinesses(acc.id), listProperties(ctx.userId)]);
      setBusinesses(b); setProperties(p);
      const q: Record<string, QualityReport | null> = {};
      await Promise.all(p.map(async (x) => { q[x.id] = await getQuality(x.id).catch(() => null); }));
      setQuality(q);
    } catch (e: any) { toast.error(e.message || "Could not load your portfolio"); }
  }, [ctx.userId, ctx.hotelName]);

  useEffect(() => { load(); }, [load]);

  if (ctx.loading || !account) return <Shell><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></Shell>;

  return (
    <Shell>
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Partner account</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div><Label>Group / partner name</Label>
              <Input defaultValue={account.display_name} onBlur={async (e) => {
                const v = e.target.value.trim(); if (!v || v === account.display_name) return;
                await updatePartnerAccount(account.id, { display_name: v }).then(() => toast.success("Saved")).catch((er) => toast.error(er.message));
              }} />
            </div>
            <p className="text-sm text-muted-foreground">{businesses.length} business(es) · {properties.length} propert{properties.length === 1 ? "y" : "ies"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Businesses</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {businesses.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /><span className="font-medium">{b.legal_name}</span>{b.gstin && <span className="text-xs text-muted-foreground">GST {b.gstin}</span>}</div>
                <Badge variant={b.verification_status === "verified" ? "default" : "secondary"}>{b.verification_status}</Badge>
              </div>
            ))}
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input placeholder="New business name (e.g. Ravi Nature Stays)" value={newBiz.name} onChange={(e) => setNewBiz({ ...newBiz, name: e.target.value })} />
              <Input placeholder="GSTIN (optional)" value={newBiz.gstin} onChange={(e) => setNewBiz({ ...newBiz, gstin: e.target.value })} />
              <Button disabled={busy} onClick={async () => {
                setBusy(true);
                try { await createBusiness(account.id, newBiz.name, newBiz.gstin); setNewBiz({ name: "", gstin: "" }); toast.success("Business added"); await load(); }
                catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
              }}><Plus className="mr-1 h-4 w-4" />Add</Button>
            </div>
          </CardContent>
        </Card>

        {properties.map((p) => {
          const q = quality[p.id];
          const fields = setupFieldsFor(p.business_types ?? []);
          const details = (p.type_details ?? {}) as Record<string, any>;
          return (
            <Card key={p.id}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{p.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{[p.locality, p.city].filter(Boolean).join(", ") || "Location not set"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={p.onboarding_status === "published" ? "default" : "secondary"}>{STATUS_LABEL[p.onboarding_status] ?? p.onboarding_status}</Badge>
                  <Button size="sm" variant="outline" onClick={() => window.open(`/hotels/${p.id}`, "_blank")}><ExternalLink className="mr-1 h-4 w-4" />View as customer</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div><Label>Business</Label>
                    <Select value={p.business_id ?? undefined} onValueChange={async (v) => {
                      try {
                        let id = v;
                        if (v === "__new") {
                          const name = window.prompt("Business name", account.display_name || p.name)?.trim();
                          if (!name) return;
                          await createBusiness(account.id, name);
                          const list = await listBusinesses(account.id);
                          id = list[list.length - 1]?.id;
                          if (!id) return;
                        }
                        await assignPropertyToBusiness(p.id, id);
                        toast.success("Business linked");
                      } catch (e: any) { toast.error(e.message); }
                      load();
                    }}>
                      <SelectTrigger><SelectValue placeholder={businesses.length ? "Choose business" : "No business yet — create one"} /></SelectTrigger>
                      <SelectContent>
                        {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.legal_name}</SelectItem>)}
                        <SelectItem value="__new">+ Create new business</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Property types</Label><p className="pt-2 text-sm">{(p.business_types ?? []).join(", ") || "Set in Hotel Profile"}</p></div>
                </div>

                {q && (
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium">Listing quality</span><span className="font-semibold text-primary">{q.score}/100</span></div>
                    <Progress value={q.score} />
                    <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                      {Object.entries(q.checks).map(([k, ok]) => (
                        <div key={k} className="flex items-center gap-2 text-sm">
                          {ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                          <span className={ok ? "" : "text-muted-foreground"}>{CHECK_LABELS[k] ?? k}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-sm font-medium">Type-specific setup</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {fields.map((f) => (
                      <div key={f.key}>
                        <Label className="text-xs">{f.label}</Label>
                        {f.kind === "boolean" ? (
                          <div className="pt-2"><Switch defaultChecked={!!details[f.key]} onCheckedChange={(v) => saveTypeDetails(p.id, { ...details, [f.key]: v }).then(() => { details[f.key] = v; })} /></div>
                        ) : f.kind === "select" ? (
                          <Select defaultValue={details[f.key]} onValueChange={(v) => saveTypeDetails(p.id, { ...details, [f.key]: v }).then(() => { details[f.key] = v; toast.success("Saved"); })}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{f.options!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (
                          <Input type={f.kind === "number" ? "number" : "text"} defaultValue={details[f.key] ?? ""} onBlur={(e) => {
                            const v = f.kind === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value;
                            saveTypeDetails(p.id, { ...details, [f.key]: v }).then(() => { details[f.key] = v; toast.success("Saved"); });
                          }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {p.onboarding_status !== "published" && p.onboarding_status !== "pending_review" && (
                  <Button disabled={!q || q.score < 70} onClick={async () => { await requestPublish(p.id).catch((e) => toast.error(e.message)); toast.success("Sent to JAAGA for review"); load(); }}>
                    <Send className="mr-1 h-4 w-4" />Submit for publishing {q && q.score < 70 && "(needs 70+)"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <PartnerNav />
      <PartnerSubNav />
      <main className="container mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Businesses & Properties</h1>
        {children}
      </main>
    </div>
  );
}
