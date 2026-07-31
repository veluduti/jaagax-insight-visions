import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ShieldCheck,
  Clock,
  XCircle,
  CheckCircle2,
  Upload,
  Trash2,
  RefreshCw,
  Loader2,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type KycStatus = "not_submitted" | "pending" | "under_review" | "verified" | "rejected";

export interface AgentKyc {
  aadhaar_front_url?: string | null;
  pan_card_url?: string | null;
  selfie_url?: string | null;
  verification_status?: string | null;
  rejection_reason?: string | null;
  verified_at?: string | null;
}

const DOCS: Array<{ key: keyof AgentKyc; label: string }> = [
  { key: "aadhaar_front_url", label: "Aadhaar Card" },
  { key: "pan_card_url", label: "PAN Card" },
  { key: "selfie_url", label: "Live Selfie" },
];

interface Props {
  userId: string | null;
  kyc: AgentKyc | null;
  canEdit: boolean;
  onChange?: (kyc: AgentKyc) => void;
}

export default function AgentKycPanel({ userId, kyc, canEdit, onChange }: Props) {
  const [local, setLocal] = useState<AgentKyc>(kyc || {});
  const [uploading, setUploading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => setLocal(kyc || {}), [kyc]);

  const status = ((local.verification_status as KycStatus) || "not_submitted") as KycStatus;

  const persist = async (next: AgentKyc) => {
    if (!userId) return;
    const { error } = await (supabase as any)
      .from("agent_kyc_verifications")
      .upsert({ user_id: userId, ...next }, { onConflict: "user_id" });
    if (error) throw error;
    setLocal(next);
    onChange?.(next);
  };

  const handleFile = async (field: keyof AgentKyc, file: File) => {
    if (!userId) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("File too large (max 5MB)");
    setUploading(field as string);
    setProgress(20);
    try {
      const path = `${userId}/${String(field)}-${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("kyc-documents")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      setProgress(70);
      const { data: signed } = await supabase.storage
        .from("kyc-documents")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl || path;
      await persist({ ...local, [field]: url });
      setProgress(100);
      toast.success("Document uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(null);
      setTimeout(() => setProgress(0), 400);
    }
  };

  const removeDoc = async (field: keyof AgentKyc) => {
    try {
      await persist({ ...local, [field]: null });
      toast.success("Document removed");
    } catch (e: any) {
      toast.error(e.message || "Could not remove");
    }
  };

  const submitForReview = async () => {
    const missing = DOCS.filter((d) => !local[d.key]);
    if (missing.length) return toast.error(`Upload: ${missing.map((m) => m.label).join(", ")}`);
    try {
      await persist({ ...local, verification_status: "under_review", rejection_reason: null });
      setShowUpload(false);
      toast.success("Submitted for verification");
    } catch (e: any) {
      toast.error(e.message || "Submission failed");
    }
  };

  const uploader = (
    <div className="space-y-4">
      {DOCS.map(({ key, label }) => {
        const url = local[key] as string | undefined | null;
        const busy = uploading === key;
        return (
          <div
            key={String(key)}
            className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
              {url ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <FileText className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{label}</p>
              <p className="truncate text-xs text-muted-foreground">
                {url ? "Uploaded" : "JPG, PNG or PDF · max 5MB"}
              </p>
              {busy && <Progress value={progress} className="mt-2 h-1" />}
            </div>
            <input
              ref={(el) => (inputs.current[String(key)] = el)}
              type="file"
              accept="image/*,application/pdf"
              capture={key === "selfie_url" ? "user" : undefined}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(key, e.target.files[0])}
            />
            <div className="flex items-center gap-1">
              {url && (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={url} target="_blank" rel="noreferrer">
                      Preview
                    </a>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeDoc(key)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              )}
              <Button
                variant={url ? "outline" : "default"}
                size="sm"
                disabled={busy}
                onClick={() => inputs.current[String(key)]?.click()}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : url ? (
                  <RefreshCw className="h-4 w-4" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        );
      })}
      <Button className="w-full" onClick={submitForReview}>
        Submit for Verification
      </Button>
    </div>
  );

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-primary" /> KYC Verification
        </CardTitle>
        {status === "verified" && (
          <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
            <CheckCircle2 className="h-3 w-3" /> Verified
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "verified" && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="font-medium text-emerald-600">🟢 Verified</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your identity has been successfully verified.
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {DOCS.map((d) => (
                <li key={String(d.key)} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {d.label}
                </li>
              ))}
            </ul>
            {local.verified_at && (
              <p className="mt-3 text-xs text-muted-foreground">
                Verified on {new Date(local.verified_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {status === "under_review" && (
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
            <p className="flex items-center gap-2 font-medium text-orange-500">
              <Clock className="h-4 w-4" /> Under Review
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your documents are currently under verification.
            </p>
            <p className="mt-3 text-sm">
              Expected verification time: <span className="font-medium">24–48 Hours</span>
            </p>
          </div>
        )}

        {status === "rejected" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
              <p className="flex items-center gap-2 font-medium text-destructive">
                <XCircle className="h-4 w-4" /> Verification Failed
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Reason: {local.rejection_reason || "Documents could not be verified."}
              </p>
            </div>
            {canEdit && (showUpload ? uploader : (
              <Button onClick={() => setShowUpload(true)}>Re-upload Documents</Button>
            ))}
          </div>
        )}

        {(status === "not_submitted" || status === "pending") && (
          <div className="space-y-4">
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
              <p className="font-medium text-yellow-600">🟡 KYC Pending</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Complete your KYC to become a Verified Agent.
              </p>
              <p className="mt-3 text-sm font-medium">Required Documents</p>
              <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                {DOCS.map((d) => (
                  <li key={String(d.key)}>
                    {local[d.key] ? "☑" : "□"} {d.label}
                  </li>
                ))}
              </ul>
            </div>
            {canEdit && (showUpload ? uploader : (
              <Button onClick={() => setShowUpload(true)}>Complete KYC</Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
