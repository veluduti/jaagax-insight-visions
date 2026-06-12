import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2, XCircle, ShieldCheck, ExternalLink, RefreshCw, FileText } from "lucide-react";
import { toast } from "sonner";

interface KycRow {
  id: string;
  user_id: string;
  status: string;
  aadhaar_url: string | null;
  pan_url: string | null;
  selfie_url: string | null;
  submitted_at: string | null;
  rejection_reason: string | null;
  // joined
  email?: string;
  full_name?: string;
  signed?: { aadhaar?: string; pan?: string; selfie?: string };
}

const BUCKET = "kyc-documents";

async function signUrl(path: string | null): Promise<string | undefined> {
  if (!path) return;
  // If a full URL was stored, return as-is
  if (/^https?:\/\//.test(path)) return path;
  const cleaned = path.replace(/^\/+/, "");
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(cleaned, 60 * 30);
  if (error) {
    console.warn("signed url err", error);
    return;
  }
  return data?.signedUrl;
}

export default function KYCReviewQueue() {
  const [rows, setRows] = useState<KycRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<KycRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("kyc_verifications")
        .select("*")
        .eq("status", "pending")
        .order("submitted_at", { ascending: true });
      if (error) throw error;
      const base = (data ?? []) as KycRow[];

      // Enrich with seller contact via RPC
      if (base.length) {
        const ids = base.map((r) => r.user_id);
        // @ts-ignore
        const { data: contacts } = await supabase.rpc("get_seller_contacts", { _user_ids: ids });
        const map = new Map<string, any>();
        (contacts ?? []).forEach((c: any) => map.set(c.user_id, c));
        for (const r of base) {
          const c = map.get(r.user_id);
          r.email = c?.email;
          r.full_name = c?.full_name;
          r.signed = {
            aadhaar: await signUrl(r.aadhaar_url),
            pan: await signUrl(r.pan_url),
            selfie: await signUrl(r.selfie_url),
          };
        }
      }
      setRows(base);
    } catch (e: any) {
      toast.error(e.message || "Failed to load KYC queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (row: KycRow) => {
    setBusyId(row.id);
    try {
      // @ts-ignore — RPC handles status + notification
      const { error } = await supabase.rpc("review_kyc", {
        _user_id: row.user_id,
        _decision: "verified",
        _reason: null,
      });
      if (error) throw error;
      toast.success(`KYC verified for ${row.full_name ?? row.email ?? "seller"}`);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e: any) {
      toast.error(e.message || "Approval failed");
    } finally {
      setBusyId(null);
    }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) { toast.error("Please add a rejection reason"); return; }
    setBusyId(rejectTarget.id);
    try {
      // @ts-ignore
      const { error } = await supabase.rpc("review_kyc", {
        _user_id: rejectTarget.user_id,
        _decision: "rejected",
        _reason: rejectReason.trim(),
      });
      if (error) throw error;
      toast.success("Rejection sent to seller");
      setRows((prev) => prev.filter((r) => r.id !== rejectTarget.id));
      setRejectTarget(null);
      setRejectReason("");
    } catch (e: any) {
      toast.error(e.message || "Rejection failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="border-2">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" /> KYC Review Queue
          </CardTitle>
          <CardDescription>
            Approve or reject seller identity submissions. Trust score auto-set to 100 on approval.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ShieldCheck className="h-12 w-12 mx-auto mb-2 opacity-40" />
            No KYC submissions awaiting review.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((r) => (
              <Card key={r.id} className="border bg-card/50">
                <CardContent className="p-4 grid md:grid-cols-[1fr_auto] gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold">{r.full_name || "Unnamed seller"}</p>
                        <p className="text-xs text-muted-foreground">{r.email || r.user_id}</p>
                      </div>
                      <Badge variant="outline" className="border-amber-500/50 text-amber-600">Pending Review</Badge>
                      {r.submitted_at && (
                        <span className="text-xs text-muted-foreground">
                          Submitted {new Date(r.submitted_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(["aadhaar", "pan", "selfie"] as const).map((k) => {
                        const url = r.signed?.[k];
                        const label = k === "aadhaar" ? "Aadhaar" : k === "pan" ? "PAN" : "Selfie";
                        return (
                          <a
                            key={k}
                            href={url || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className={`group block rounded-lg border-2 overflow-hidden bg-muted/30 ${url ? "hover:border-emerald-500/60" : "opacity-50 pointer-events-none"}`}
                          >
                            <div className="aspect-[4/3] flex items-center justify-center bg-muted">
                              {url ? (
                                <img
                                  src={url}
                                  alt={label}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                />
                              ) : (
                                <FileText className="h-8 w-8 text-muted-foreground" />
                              )}
                            </div>
                            <div className="px-2 py-1.5 flex items-center justify-between text-xs">
                              <span className="font-medium">{label}</span>
                              {url && <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />}
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex md:flex-col gap-2 md:justify-center md:min-w-[140px]">
                    <Button
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      disabled={busyId === r.id}
                      onClick={() => approve(r)}
                    >
                      {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="border-rose-500/50 text-rose-600 hover:bg-rose-500/10"
                      disabled={busyId === r.id}
                      onClick={() => { setRejectTarget(r); setRejectReason(""); }}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject KYC submission</DialogTitle>
            <DialogDescription>
              Tell {rejectTarget?.full_name || "the seller"} what to fix so they can re-submit.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Aadhaar image is blurry — please re-upload a clear photo."
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectTarget(null)} disabled={busyId !== null}>
              Cancel
            </Button>
            <Button
              className="bg-rose-500 hover:bg-rose-600 text-white"
              disabled={busyId !== null || !rejectReason.trim()}
              onClick={submitReject}
            >
              {busyId === rejectTarget?.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Send rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
