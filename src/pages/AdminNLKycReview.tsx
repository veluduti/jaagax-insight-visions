import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, XCircle, ShieldCheck, MapPin, ExternalLink, RefreshCw, FileText, UserCircle2 } from "lucide-react";
import { toast } from "sonner";

import { useAdminRole } from "@/hooks/useAdminRole";

type KycRow = any;

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-700 border-red-500/30",
};

const LEVEL_LABEL: Record<number, string> = {
  1: "District Admin",
  2: "State Admin",
  3: "Country Admin",
  4: "Global Admin",
};

async function signIfNeeded(url: string | null | undefined) {
  if (!url) return undefined;
  if (/^https?:\/\//.test(url)) return url;
  const cleaned = url.replace(/^\/+/, "");
  const { data } = await supabase.storage.from("nl-kyc").createSignedUrl(cleaned, 60 * 30);
  return data?.signedUrl;
}

export default function AdminNLKycReview() {
  const { role, loading: roleLoading } = useAdminRole();
  const [rows, setRows] = useState<KycRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "mine" | "all">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      setUid(userData.user?.id ?? null);
      const { data, error } = await (supabase as any)
        .from("nl_kyc")
        .select("*")
        .order("submitted_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      const base = (data ?? []) as KycRow[];

      // Enrich with applicant profile (name/phone) — safe if RLS allows admins
      const ids = Array.from(new Set(base.map((r) => r.user_id).filter(Boolean)));
      let profileMap = new Map<string, any>();
      if (ids.length) {
        const { data: profiles } = await (supabase as any)
          .from("nl_profiles")
          .select("user_id,full_name,phone,city,state")
          .in("user_id", ids);
        (profiles ?? []).forEach((p: any) => profileMap.set(p.user_id, p));
      }
      const enriched = await Promise.all(
        base.map(async (r) => ({
          ...r,
          _profile: profileMap.get(r.user_id),
          _id_url: await signIfNeeded(r.id_document_url),
          _addr_url: await signIfNeeded(r.address_proof_url),
        })),
      );
      setRows(enriched);
    } catch (e: any) {
      toast.error(e.message || "Failed to load KYC queue");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    if (filter === "pending") return rows.filter((r) => r.status === "pending");
    if (filter === "mine") return rows.filter((r) => r.assigned_admin_id === uid);
    return rows;
  }, [rows, filter, uid]);

  const canAct = (r: KycRow) =>
    r.status === "pending" &&
    (r.assigned_admin_id === uid || (!r.assigned_admin_id && role === "global_admin"));

  const review = async (r: KycRow, decision: "approved" | "rejected") => {
    if (busyId) return;
    const reason = (reasons[r.id] || "").trim() || null;
    if (decision === "rejected" && !reason) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    setBusyId(r.id);
    try {
      const { error } = await (supabase as any).rpc("review_nl_kyc", {
        _kyc_id: r.id,
        _decision: decision,
        _reason: reason,
      });
      if (error) throw error;
      toast.success(decision === "approved" ? "KYC approved" : "KYC rejected");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="max-w-2xl mx-auto text-center py-10">
        <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <h1 className="text-xl font-semibold">Admin access required</h1>
        <p className="text-sm text-muted-foreground mt-2">
          This section is restricted to district, state, country, and global admins.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">KYC Verifications</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Requests are routed by the hierarchy engine (District → State → Country → Global).
              You are signed in as <span className="font-medium">{LEVEL_LABEL[role === "district_admin" ? 1 : role === "state_admin" ? 2 : role === "country_admin" ? 3 : 4]}</span>.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-4">
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="mine">Assigned to me</TabsTrigger>
            <TabsTrigger value="all">All in my scope</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" /> Review queue
            </CardTitle>
            <CardDescription>
              Only the assigned approver can approve or reject. Higher-level admins see requests in read-only unless no lower-level admin exists.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : visible.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShieldCheck className="h-12 w-12 mx-auto mb-2 opacity-40" />
                No KYC records match this filter.
              </div>
            ) : (
              <div className="space-y-4">
                {visible.map((r) => {
                  const p = r._profile;
                  const actAllowed = canAct(r);
                  return (
                    <Card key={r.id} className="border bg-card/50">
                      <CardContent className="p-4 grid md:grid-cols-[1fr_auto] gap-4">
                        <div className="space-y-3 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <UserCircle2 className="h-8 w-8 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{p?.full_name || "Unnamed applicant"}</p>
                              <p className="text-xs text-muted-foreground truncate">{p?.phone || r.user_id}</p>
                            </div>
                            <Badge variant="outline" className={STATUS_COLOR[r.status] || ""}>
                              {r.status}
                            </Badge>
                            {r.assigned_admin_role && (
                              <Badge variant="outline">
                                Approver: {LEVEL_LABEL[r.approval_level] || r.assigned_admin_role}
                              </Badge>
                            )}
                            {r.submitted_at && (
                              <span className="text-xs text-muted-foreground">
                                Submitted {new Date(r.submitted_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                            <MapPin className="h-4 w-4" />
                            <span>{[r.city, r.district, r.state, r.country].filter(Boolean).join(", ") || "—"}</span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <DocTile label={`ID: ${r.id_type}`} sub={r.id_number} url={r._id_url} />
                            <DocTile label="Address proof" sub={r.address_proof_url ? "Uploaded" : "Not provided"} url={r._addr_url} />
                          </div>

                          {r.status === "rejected" && r.rejection_reason && (
                            <p className="text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded p-2">
                              <strong>Rejection reason:</strong> {r.rejection_reason}
                            </p>
                          )}

                          {actAllowed && (
                            <Textarea
                              value={reasons[r.id] || ""}
                              onChange={(e) => setReasons((s) => ({ ...s, [r.id]: e.target.value }))}
                              placeholder="Optional note for approval / required reason for rejection"
                              rows={2}
                              className="text-sm"
                            />
                          )}
                        </div>

                        <div className="flex md:flex-col gap-2 md:min-w-[160px] md:justify-center">
                          {actAllowed ? (
                            <>
                              <Button
                                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                                disabled={busyId === r.id}
                                onClick={() => review(r, "approved")}
                              >
                                {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                className="border-rose-500/50 text-rose-600 hover:bg-rose-500/10"
                                disabled={busyId === r.id}
                                onClick={() => review(r, "rejected")}
                              >
                                <XCircle className="h-4 w-4 mr-1" /> Reject
                              </Button>
                            </>
                          ) : (
                            <div className="text-xs text-muted-foreground md:text-center">
                              {r.status !== "pending"
                                ? "Closed"
                                : "Read-only — awaiting assigned approver"}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DocTile({ label, sub, url }: { label: string; sub?: string; url?: string }) {
  return (
    <a
      href={url || "#"}
      target="_blank"
      rel="noreferrer"
      className={`group rounded-lg border-2 p-3 bg-muted/30 flex flex-col gap-1 ${url ? "hover:border-emerald-500/60" : "opacity-60 pointer-events-none"}`}
    >
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium truncate">{label}</span>
        {url && <ExternalLink className="h-3 w-3 opacity-60 ml-auto" />}
      </div>
      {sub && <span className="text-xs text-muted-foreground truncate">{sub}</span>}
    </a>
  );
}
