import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, ShieldAlert, Upload, CheckCircle2, RefreshCw, FileText, Camera, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

type Status = "not_started" | "pending" | "verified" | "rejected";

const STATUS_META: Record<
  Status,
  { label: string; bgColor: string; textColor: string; icon: any; description: string }
> = {
  not_started: {
    label: "Not Started",
    bgColor: "bg-slate-600",
    textColor: "text-white",
    icon: ShieldAlert,
    description: "Complete KYC to unlock verified benefits",
  },
  pending: {
    label: "Under Review",
    bgColor: "bg-amber-600",
    textColor: "text-white",
    icon: ShieldAlert,
    description: "Your documents are being reviewed by our team",
  },
  verified: {
    label: "Verified",
    bgColor: "bg-emerald-600",
    textColor: "text-white",
    icon: ShieldCheck,
    description: "Your identity is verified. You have a verified badge!",
  },
  rejected: {
    label: "Rejected",
    bgColor: "bg-rose-600",
    textColor: "text-white",
    icon: ShieldAlert,
    description: "Please re-submit your documents",
  },
};

const BENEFITS = [
  { text: "Verified badge on profile", icon: ShieldCheck },
  { text: "Higher trust score (up to 100)", icon: CheckCircle2 },
  { text: "Faster property approvals", icon: CheckCircle2 },
  { text: "Better visibility in search results", icon: CheckCircle2 },
];

export default function KYCVerification({ userId }: { userId: string }) {
  const [status, setStatus] = useState<Status>("not_started");
  const [reason, setReason] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [aadhaar, setAadhaar] = useState<File | null>(null);
  const [pan, setPan] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const sb: any = supabase;
    const { data } = await sb
      .from("kyc_verifications")
      .select("status, rejection_reason")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      setStatus(data.status as Status);
      setReason(data.rejection_reason);
    }
  };

  useEffect(() => {
    if (userId) load();
  }, [userId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
    toast.success("KYC status refreshed");
  };

  const uploadOne = async (file: File, label: string) => {
    const path = `${userId}/${label}-${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const { error } = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  };

  const submit = async () => {
    if (!aadhaar || !pan || !selfie) return toast.error("All three documents are required");
    setBusy(true);
    try {
      const [a, p, s] = await Promise.all([
        uploadOne(aadhaar, "aadhaar"),
        uploadOne(pan, "pan"),
        uploadOne(selfie, "selfie"),
      ]);
      const sb: any = supabase;
      const { error } = await sb.rpc("submit_kyc", { _aadhaar: a, _pan: p, _selfie: s });
      if (error) throw error;
      toast.success("KYC submitted! Admin will review within 24-48 hours.");
      setOpen(false);

      // Reset file states
      setAadhaar(null);
      setPan(null);
      setSelfie(null);

      load();
    } catch (e: any) {
      toast.error(e.message || "Could not submit KYC");
    } finally {
      setBusy(false);
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case "aadhaar":
        return <Fingerprint className="h-4 w-4 text-emerald-500" />;
      case "pan":
        return <FileText className="h-4 w-4 text-emerald-500" />;
      default:
        return <Camera className="h-4 w-4 text-emerald-500" />;
    }
  };

  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const isVerified = status === "verified";
  const isPending = status === "pending";
  const isRejected = status === "rejected";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-background to-background h-full flex flex-col shadow-lg hover:shadow-xl transition-all duration-300">
        {/* Decorative blur effect */}
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <CardContent className="p-5 relative flex-1 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              </div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">KYC Verification</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className={`${meta.bgColor} ${meta.textColor} border-0 px-2 py-0.5 text-xs font-medium`}>
                <Icon className="h-3 w-3 mr-1" />
                {meta.label}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-emerald-500"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Status Message */}
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
            <p className="text-sm text-foreground/80">{meta.description}</p>
            {isRejected && reason && (
              <div className="mt-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <p className="text-xs text-rose-400 flex items-start gap-1">
                  <ShieldAlert className="h-3 w-3 mt-0.5 shrink-0" />
                  Rejection reason: {reason}
                </p>
              </div>
            )}
            {isPending && (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-amber-500 rounded-full animate-pulse" />
                <p className="text-xs text-amber-400">Estimated review time: 24-48 hours</p>
              </div>
            )}
          </div>

          {/* Benefits Section - Only show if not verified */}
          {!isVerified && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Benefits of KYC
              </p>
              <div className="grid grid-cols-1 gap-2">
                {BENEFITS.map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-foreground/80">
                    <benefit.icon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>{benefit.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verified Badge Display */}
          {isVerified && (
            <div className="text-center py-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">Verified Member</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Your verified badge is now active on your profile and listings
              </p>
            </div>
          )}

          {/* Action Button */}
          {!isVerified && (
            <div className="mt-auto pt-2">
              <Button
                onClick={() => setOpen(true)}
                disabled={isPending}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-medium shadow-lg shadow-emerald-500/20 transition-all duration-300"
              >
                {isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Awaiting Review...
                  </div>
                ) : isRejected ? (
                  "Re-submit KYC Documents"
                ) : (
                  "Complete KYC Verification"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KYC Upload Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              Complete KYC Verification
            </DialogTitle>
            <DialogDescription>
              Upload the following documents to verify your identity. All documents are encrypted and secure.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Document Upload Items */}
            {[
              {
                label: "Aadhaar Card",
                subtitle: "Upload front and back (PDF or image)",
                file: aadhaar,
                set: setAadhaar,
                key: "aadhaar",
                icon: <Fingerprint className="h-4 w-4" />,
                required: true,
              },
              {
                label: "PAN Card",
                subtitle: "Clear photo of your PAN card",
                file: pan,
                set: setPan,
                key: "pan",
                icon: <FileText className="h-4 w-4" />,
                required: true,
              },
              {
                label: "Selfie",
                subtitle: "Recent photo holding your ID",
                file: selfie,
                set: setSelfie,
                key: "selfie",
                icon: <Camera className="h-4 w-4" />,
                required: true,
              },
            ].map((f) => (
              <div key={f.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10">{f.icon}</div>
                    <div>
                      <Label className="text-sm font-medium text-foreground">
                        {f.label} {f.required && <span className="text-rose-500">*</span>}
                      </Label>
                      <p className="text-xs text-muted-foreground">{f.subtitle}</p>
                    </div>
                  </div>
                  {f.file && (
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500 text-[10px]">
                      Uploaded
                    </Badge>
                  )}
                </div>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => f.set(e.target.files?.[0] || null)}
                  className="cursor-pointer file:bg-emerald-500/10 file:text-emerald-400 file:border-0 file:rounded-md file:px-3 file:py-1 file:text-xs file:font-medium hover:file:bg-emerald-500/20 transition-colors"
                />
                {f.file && (
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <Upload className="h-2.5 w-2.5" />
                    {f.file.name} ({(f.file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="bg-amber-500/5 rounded-lg p-3 border border-amber-500/10">
            <p className="text-xs text-muted-foreground text-center">
              🔒 Your documents are securely encrypted and only visible to verified admins. Review typically takes 24-48
              hours.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={busy || !aadhaar || !pan || !selfie}
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20"
            >
              {busy ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading...
                </div>
              ) : (
                "Submit for Review"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
