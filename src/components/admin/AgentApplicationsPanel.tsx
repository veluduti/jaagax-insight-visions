import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, XCircle, FileText, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type App = any;

const DOCS = [
  ["aadhaar_front_url", "Aadhaar Front"],
  ["aadhaar_back_url", "Aadhaar Back"],
  ["pan_card_url", "PAN Card"],
  ["profile_photo_url", "Profile Photo"],
  ["selfie_url", "Selfie"],
] as const;

export default function AgentApplicationsPanel() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [tab, setTab] = useState("pending");

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("agent_applications")
      .select("*")
      .order("created_at", { ascending: false });
    setApps(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const review = async (app: App, approve: boolean) => {
    if (!approve && !remarks[app.id]?.trim()) return toast.error("Please add rejection remarks");
    setBusy(app.id);
    try {
      const { data, error } = await (supabase as any).rpc("review_agent_application", {
        _app_id: app.id,
        _approve: approve,
        _remarks: remarks[app.id] || null,
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.reason || "Action failed");
      toast.success(approve ? "Agent approved — role upgraded and trial started" : "Application rejected");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const filtered = apps.filter((a) => a.status === tab);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Agent Applications</CardTitle>
            <CardDescription>Review KYC documents and approve agent upgrades.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending {apps.filter((a) => a.status === "pending").length > 0 && `(${apps.filter((a) => a.status === "pending").length})`}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4 space-y-4">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No {tab} applications.</p>
            ) : (
              filtered.map((app) => (
                <div key={app.id} className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold">{app.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {app.mobile} • {app.email} • {[app.city, app.state, app.pincode].filter(Boolean).join(", ")}
                      </p>
                    </div>
                    <Badge
                      className={
                        app.status === "approved"
                          ? "bg-emerald-600"
                          : app.status === "rejected"
                          ? "bg-red-600"
                          : "bg-yellow-600"
                      }
                    >
                      {app.status}
                    </Badge>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Aadhaar:</span> {app.aadhaar_number || "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">PAN:</span> {app.pan_number || "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Experience:</span> {app.experience_years ?? 0} yrs
                    </div>
                    <div>
                      <span className="text-muted-foreground">RERA:</span> {app.rera_number || "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Agency:</span> {app.agency_name || "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Locations:</span> {app.operating_locations || "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Bank:</span> {app.bank_name || "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Account:</span> {app.account_number || "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">IFSC:</span> {app.ifsc_code || "—"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {DOCS.map(([key, label]) =>
                      app[key] ? (
                        <a
                          key={key}
                          href={app[key]}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs rounded-md border px-2 py-1 hover:bg-muted"
                        >
                          <FileText className="h-3 w-3" /> {label}
                        </a>
                      ) : null
                    )}
                  </div>

                  {app.status === "pending" && (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Remarks (required when rejecting)"
                        value={remarks[app.id] || ""}
                        onChange={(e) => setRemarks((r) => ({ ...r, [app.id]: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" disabled={busy === app.id} onClick={() => review(app, true)} className="gap-1.5">
                          {busy === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy === app.id}
                          onClick={() => review(app, false)}
                          className="gap-1.5"
                        >
                          <XCircle className="h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </div>
                  )}

                  {app.status !== "pending" && app.admin_remarks && (
                    <p className="text-xs text-muted-foreground">Remarks: {app.admin_remarks}</p>
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
