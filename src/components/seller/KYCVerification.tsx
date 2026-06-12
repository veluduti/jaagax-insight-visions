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
import { ShieldCheck, ShieldAlert, Upload, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

type Status = "not_started" | "pending" | "verified" | "rejected";

const STATUS_META: Record<Status, { label: string; color: string; icon: any }> = {
  not_started: { label: "Not started", color: "bg-slate-500/20 text-slate-300 border-slate-500/40", icon: ShieldAlert },
  pending: { label: "In review", color: "bg-amber-500/20 text-amber-400 border-amber-500/40", icon: ShieldAlert },
  verified: { label: "Verified", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40", icon: ShieldCheck },
  rejected: { label: "Rejected", color: "bg-rose-500/20 text-rose-400 border-rose-500/40", icon: ShieldAlert },
};

const BENEFITS = ["Verified badge on profile", "Higher trust score", "Faster approvals", "Better visibility in search"];

export default function KYCVerification({ userId }: { userId: string }) {
  const [status, setStatus] = useState<Status>("not_started");
  const [reason, setReason] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [aadhaar, setAadhaar] = useState<File | null>(null);
  const [pan, setPan] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

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
      toast.success("KYC submitted — admin will review shortly");
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Could not submit KYC");
    } finally {
      setBusy(false);
    }
  };

  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="h-full"
    >
      <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-background to-background h-full flex flex-col">
        <CardContent className="p-5 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4" /> KYC Verification
            </div>
            <Badge variant="outline" className={meta.color}>
              <Icon className="h-3 w-3 mr-1" /> {meta.label}
            </Badge>
          </div>

          {status === "verified" ? (
            <div className="py-2">
              <p className="text-sm text-foreground">
                Your identity is verified — verified badge active across the platform.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <ul className="space-y-1.5 mb-4">
                {BENEFITS.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-xs text-foreground/80">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> {b}
                  </li>
                ))}
              </ul>
              {status === "rejected" && reason && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-md px-3 py-2 mb-3">
                  Rejected: {reason}
                </p>
              )}
              <div className="mt-auto">
                <Button
                  onClick={() => setOpen(true)}
                  disabled={status === "pending"}
                  variant="outline"
                  size="sm"
                  className="w-full border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                >
                  {status === "pending" ? "Awaiting review…" : status === "rejected" ? "Re-submit KYC" : "Complete KYC"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload KYC documents</DialogTitle>
            <DialogDescription>
              Aadhaar, PAN, and a selfie. Files are encrypted and visible only to admins.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {[
              { label: "Aadhaar (front/back PDF or image)", file: aadhaar, set: setAadhaar, key: "aadhaar" },
              { label: "PAN card", file: pan, set: setPan, key: "pan" },
              { label: "Selfie", file: selfie, set: setSelfie, key: "selfie" },
            ].map((f) => (
              <div key={f.key}>
                <Label className="text-xs">{f.label}</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => f.set(e.target.files?.[0] || null)}
                  className="mt-1"
                />
                {f.file && (
                  <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                    <Upload className="h-3 w-3" /> {f.file.name}
                  </p>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              {busy ? "Submitting…" : "Submit for review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
