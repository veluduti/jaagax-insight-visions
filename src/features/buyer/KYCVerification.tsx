import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldCheck, IdCard, FileText, Camera, Upload, CheckCircle2, AlertCircle, Loader2, Eye, Star, Zap, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useKYC, DocType, KycDocument } from "@/hooks/useKYC";

interface DocCardConfig {
  type: DocType;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const DOC_CARDS: DocCardConfig[] = [
  { type: "aadhaar_front", name: "Aadhaar Card (Front)", icon: IdCard, description: "Upload the front side of your Aadhaar card" },
  { type: "aadhaar_back", name: "Aadhaar Card (Back)", icon: IdCard, description: "Upload the back side of your Aadhaar card" },
  { type: "pan", name: "PAN Card", icon: FileText, description: "Upload a clear image of your PAN card" },
  { type: "selfie", name: "Selfie Verification", icon: Camera, description: "Upload a clear selfie holding your Aadhaar/PAN" },
];

const BENEFITS = [
  { icon: ShieldCheck, title: "Verified Badge", desc: "Stand out with a verified profile badge" },
  { icon: Star, title: "Higher Trust Score", desc: "Build trust with buyers and sellers" },
  { icon: Zap, title: "Faster Approvals", desc: "Skip queues for property approvals" },
  { icon: TrendingUp, title: "Better Visibility", desc: "Your listings rank higher in search" },
];

function StatusBadge({ status }: { status: "verified" | "pending" | "rejected" | "missing" }) {
  if (status === "verified") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>;
  if (status === "pending") return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending Review</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="outline">Not Uploaded</Badge>;
}

export function KYCVerification() {
  const { documents, trustScore, isVerified, isLoading, uploadDocument } = useKYC();
  const [openType, setOpenType] = useState<DocType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const docByType = (t: DocType): KycDocument | undefined => documents.find((d) => d.type === t);
  const uploadedCount = DOC_CARDS.filter((c) => docByType(c.type)).length;
  const verifiedCount = documents.filter((d) => d.status === "verified").length;
  const hasRejection = documents.some((d) => d.status === "rejected");

  const overallStatus: "verified" | "pending" | "rejected" | "missing" =
    isVerified ? "verified" : hasRejection ? "rejected" : uploadedCount > 0 ? "pending" : "missing";

  const handlePick = (f: File | null) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return toast.error("File too large (max 5MB)");
    setFile(f);
  };

  const handleUpload = async () => {
    if (!openType || !file) return;
    setBusy(true); setProgress(10);
    const tick = setInterval(() => setProgress((p) => Math.min(p + 15, 85)), 200);
    try {
      await uploadDocument(openType, file);
      setProgress(100);
      toast.success("Document uploaded — pending review");
      setOpenType(null); setFile(null);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      clearInterval(tick);
      setBusy(false);
      setTimeout(() => setProgress(0), 400);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <Card className={
        overallStatus === "verified" ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20"
        : overallStatus === "rejected" ? "border-rose-300 bg-rose-50/50 dark:bg-rose-950/20"
        : overallStatus === "pending" ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20"
        : "border-border"
      }>
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center gap-4">
          <ShieldCheck className={`h-10 w-10 ${overallStatus === "verified" ? "text-emerald-600" : "text-primary"}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold">KYC Verification</h2>
              <StatusBadge status={overallStatus} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {overallStatus === "verified" && "Your identity is fully verified."}
              {overallStatus === "pending" && `${uploadedCount}/${DOC_CARDS.length} documents uploaded — awaiting review.`}
              {overallStatus === "rejected" && "One or more documents were rejected. Please re-upload."}
              {overallStatus === "missing" && "Get verified to unlock trust badges and faster approvals."}
            </p>
          </div>
          <div className="text-center md:text-right">
            <div className="text-xs text-muted-foreground">Trust Score</div>
            <div className="text-3xl font-bold text-primary">{trustScore}<span className="text-sm text-muted-foreground">/100</span></div>
            <Progress value={trustScore} className="w-32 mt-1" />
          </div>
        </CardContent>
      </Card>

      {/* Document cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {DOC_CARDS.map((cfg) => {
          const doc = docByType(cfg.type);
          const status = doc?.status ?? "missing";
          const Icon = cfg.icon;
          return (
            <Card key={cfg.type}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold">{cfg.name}</h3>
                      <StatusBadge status={status as any} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{cfg.description}</p>
                  </div>
                </div>
                {doc?.status === "rejected" && doc.rejection_reason && (
                  <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/20 p-2 rounded">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{doc.rejection_reason}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant={doc ? "outline" : "default"} className="flex-1"
                    onClick={() => { setOpenType(cfg.type); setFile(null); }}
                    disabled={isLoading}>
                    <Upload className="h-3 w-3 mr-1" />
                    {doc ? "Re-upload" : "Upload"}
                  </Button>
                  {doc && (
                    <Button size="sm" variant="ghost" asChild>
                      <a href={doc.file_url} target="_blank" rel="noreferrer"><Eye className="h-3 w-3" /></a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Benefits */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" /> Benefits of Verification
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><b.icon className="h-5 w-5 text-primary" /></div>
                <div>
                  <div className="font-medium text-sm">{b.title}</div>
                  <div className="text-xs text-muted-foreground">{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload modal */}
      <Dialog open={!!openType} onOpenChange={(o) => { if (!o) { setOpenType(null); setFile(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload {openType && DOC_CARDS.find((c) => c.type === openType)?.name}</DialogTitle>
            <DialogDescription>JPG, PNG or PDF — Max 5MB</DialogDescription>
          </DialogHeader>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handlePick(e.dataTransfer.files?.[0] ?? null); }}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/40 transition"
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            {file ? (
              <div>
                <div className="font-medium text-sm">{file.name}</div>
                <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Click or drag a file here</div>
            )}
            <input ref={inputRef} type="file" hidden accept="image/jpeg,image/png,image/jpg,application/pdf"
              onChange={(e) => handlePick(e.target.files?.[0] ?? null)} />
          </div>
          {file && file.type.startsWith("image/") && (
            <img src={URL.createObjectURL(file)} alt="preview" className="rounded max-h-48 object-contain mx-auto" />
          )}
          {progress > 0 && <Progress value={progress} />}
          <Button onClick={handleUpload} disabled={!file || busy}>
            {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : "Submit for Review"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default KYCVerification;
