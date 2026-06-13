import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Upload, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type KYC = {
  id?: string;
  aadhaar_front_url?: string | null;
  aadhaar_back_url?: string | null;
  pan_card_url?: string | null;
  selfie_url?: string | null;
  rera_certificate_url?: string | null;
  business_proof_url?: string | null;
  verification_status?: string;
  rejection_reason?: string | null;
  trust_score?: number;
  verified_badge?: boolean;
};

const DOC_FIELDS: Array<{ key: keyof KYC; label: string }> = [
  { key: "aadhaar_front_url", label: "Aadhaar Front" },
  { key: "aadhaar_back_url", label: "Aadhaar Back" },
  { key: "pan_card_url", label: "PAN Card" },
  { key: "selfie_url", label: "Selfie" },
  { key: "rera_certificate_url", label: "RERA Certificate" },
  { key: "business_proof_url", label: "Business Proof" },
];

export default function AgentKYCVerification() {
  const { user } = useAuth();
  const [kyc, setKyc] = useState<KYC>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("agent_kyc_verifications")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setKyc(data);
      setLoading(false);
    })();
  }, [user]);

  const handleUpload = async (field: keyof KYC, file: File) => {
    if (!user) return;
    setUploading(field as string);
    try {
      const path = `${user.id}/${field}-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("kyc-documents").createSignedUrl
        ? await supabase.storage.from("kyc-documents").createSignedUrl(path, 60 * 60 * 24 * 365)
        : { data: { signedUrl: path } as any };
      const url = (urlData as any)?.signedUrl || path;

      const next: KYC = { ...kyc, [field]: url, verification_status: "pending" };
      const { error: dbErr } = await (supabase as any)
        .from("agent_kyc_verifications")
        .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
      if (dbErr) throw dbErr;
      setKyc(next);
      toast.success(`${field} uploaded`);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const statusBadge = () => {
    const s = kyc.verification_status || "not_submitted";
    if (s === "verified") return <Badge className="bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3" /> Verified</Badge>;
    if (s === "rejected") return <Badge className="bg-red-600 gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
    if (s === "pending") return <Badge className="bg-yellow-600 gap-1"><Clock className="h-3 w-3" /> Pending Review</Badge>;
    return <Badge variant="outline">Not Submitted</Badge>;
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> KYC Verification</CardTitle>
          <div className="flex items-center gap-2">
            {kyc.verified_badge && <Badge className="bg-emerald-600">Verified Badge</Badge>}
            {statusBadge()}
          </div>
        </div>
        {typeof kyc.trust_score === "number" && (
          <p className="text-sm text-muted-foreground">Trust Score: <span className="font-semibold text-primary">{kyc.trust_score}/100</span></p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {kyc.verification_status === "rejected" && kyc.rejection_reason && (
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-600">
            <strong>Rejection reason:</strong> {kyc.rejection_reason}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DOC_FIELDS.map(({ key, label }) => {
            const uploaded = Boolean(kyc[key]);
            return (
              <div key={key as string} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">{label}</Label>
                  {uploaded ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
                </div>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={uploading === key}
                  onChange={(e) => e.target.files?.[0] && handleUpload(key, e.target.files[0])}
                />
                {uploading === key && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</p>}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">Documents are reviewed within 24–48 hours. You'll receive a notification on status change.</p>
      </CardContent>
    </Card>
  );
}
