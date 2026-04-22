import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText, Loader2, ShieldCheck, Clock, XCircle, AlertTriangle } from "lucide-react";

interface RERAUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects?: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

interface BuilderProperty {
  id: string;
  title: string;
  rera_id: string | null;
  verified: boolean | null;
  verification_status: string | null;
}

interface ExistingVerification {
  id: string;
  status: "pending" | "approved" | "rejected";
  rera_number: string;
  document_url: string;
  admin_notes: string | null;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];

export default function RERAUploadModal({ open, onOpenChange, onSuccess }: RERAUploadModalProps) {
  const [properties, setProperties] = useState<BuilderProperty[]>([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [reraNumber, setReraNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [existing, setExisting] = useState<ExistingVerification | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedProperty("");
    setReraNumber("");
    setFile(null);
    setExisting(null);
    setDuplicateWarning(null);
    (async () => {
      setLoadingProps(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingProps(false); return; }
      const { data } = await supabase
        .from("properties")
        .select("id, title, rera_id, verified, verification_status")
        .eq("submitted_by", user.id)
        .order("created_at", { ascending: false });
      if (data) setProperties(data as BuilderProperty[]);
      setLoadingProps(false);
    })();
  }, [open]);

  // Load existing verification + prefill when property changes
  useEffect(() => {
    if (!selectedProperty) { setExisting(null); return; }
    (async () => {
      const { data } = await supabase
        .from("rera_verifications")
        .select("id, status, rera_number, document_url, admin_notes")
        .eq("property_id", selectedProperty)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setExisting(data as ExistingVerification);
        setReraNumber(data.rera_number);
      } else {
        setExisting(null);
        const p = properties.find((x) => x.id === selectedProperty);
        if (p?.rera_id) setReraNumber(p.rera_id);
      }
    })();
  }, [selectedProperty, properties]);

  // Duplicate RERA detection
  useEffect(() => {
    setDuplicateWarning(null);
    const num = reraNumber.trim();
    if (!num || !selectedProperty) return;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("rera_verifications")
        .select("property_id")
        .eq("rera_number", num)
        .neq("property_id", selectedProperty);
      if (data && data.length > 0) {
        setDuplicateWarning(`This RERA number is already used on ${data.length} other listing(s). Admin will review carefully.`);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [reraNumber, selectedProperty]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED.includes(f.type)) {
      toast.error("Only PDF, JPG or PNG files are allowed");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("File must be smaller than 5MB");
      return;
    }
    setFile(f);
  };

  const canEdit = !existing || existing.status === "rejected";

  const handleSubmit = async () => {
    if (!selectedProperty) return toast.error("Please select a property");
    if (!reraNumber.trim()) return toast.error("RERA Registration Number is required");
    if (!file && !existing) return toast.error("Please upload your RERA certificate");

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("You must be logged in"); return; }

      let documentUrl = existing?.document_url || "";
      if (file) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${user.id}/${selectedProperty}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("rera-documents")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("rera-documents").getPublicUrl(path);
        documentUrl = pub.publicUrl;
      }

      // Insert or update verification record
      if (existing && existing.status === "rejected") {
        const { error } = await supabase
          .from("rera_verifications")
          .update({
            rera_number: reraNumber.trim(),
            document_url: documentUrl,
            status: "pending",
            admin_notes: null,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rera_verifications").insert({
          property_id: selectedProperty,
          user_id: user.id,
          rera_number: reraNumber.trim(),
          document_url: documentUrl,
          status: "pending",
        });
        if (error) throw error;
      }

      // Mark property as Pending Verification (unpublished)
      await supabase
        .from("properties")
        .update({
          rera_id: reraNumber.trim(),
          rera_document_url: documentUrl,
          verified: false,
          verification_status: "pending",
        })
        .eq("id", selectedProperty);

      // Notify admins
      try {
        const { data: admins } = await supabase
          .from("user_roles").select("user_id").eq("role", "admin");
        if (admins?.length) {
          const propTitle = properties.find((p) => p.id === selectedProperty)?.title || "Property";
          await supabase.from("notifications").insert(
            admins.map((a: any) => ({
              user_id: a.user_id,
              type: "rera",
              title: "New RERA submission",
              message: `RERA "${reraNumber}" submitted for "${propTitle}". Awaiting your review.`,
              link: `/admin?tab=rera`,
            }))
          );
        }
      } catch (e) {
        console.warn("admin notify failed", e);
      }

      toast.success("Submitted! Your listing is under RERA verification (review within 24h).");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit RERA verification");
    } finally {
      setUploading(false);
    }
  };

  const StatusBanner = () => {
    if (!existing) return null;
    if (existing.status === "pending") {
      return (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>Under Review.</strong> Your listing is under RERA verification. It will be reviewed within 24 hours.
          </AlertDescription>
        </Alert>
      );
    }
    if (existing.status === "approved") {
      return (
        <Alert className="border-green-500/40 bg-green-500/5">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <strong className="text-green-700 dark:text-green-400">RERA Verified.</strong> This property is live.
          </AlertDescription>
        </Alert>
      );
    }
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Rejected — Re-upload required.</strong>
          {existing.admin_notes && <div className="mt-1 text-xs">Reason: {existing.admin_notes}</div>}
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            RERA Upload & Verification
          </DialogTitle>
          <DialogDescription>
            Submit your RERA registration number and certificate. Admin will review within 24 hours before your listing goes live.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Select Property *</Label>
            <Select value={selectedProperty} onValueChange={setSelectedProperty} disabled={loadingProps}>
              <SelectTrigger>
                <SelectValue placeholder={loadingProps ? "Loading…" : properties.length ? "Choose a property" : "No properties — add one first"} />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                    {p.verified && " ✓ Verified"}
                    {p.verification_status === "pending" && " • Pending"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <StatusBanner />

          <div className="space-y-2">
            <Label htmlFor="rera">RERA Registration Number *</Label>
            <Input
              id="rera"
              placeholder="e.g. P12345678901234"
              value={reraNumber}
              onChange={(e) => setReraNumber(e.target.value)}
              disabled={!canEdit}
            />
          </div>

          {duplicateWarning && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">{duplicateWarning}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="file">RERA Certificate (PDF, JPG, PNG — max 5MB) {!existing && "*"}</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,image/jpeg,image/png,image/jpg"
              onChange={handleFileChange}
              className="cursor-pointer"
              disabled={!canEdit}
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4 text-green-600" />
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
            {!file && existing?.document_url && (
              <a href={existing.document_url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <FileText className="h-4 w-4" /> View previously uploaded document
              </a>
            )}
          </div>

          {existing?.status === "approved" && (
            <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/40">
              <ShieldCheck className="h-3 w-3 mr-1" /> RERA Verified
            </Badge>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={uploading || !selectedProperty || !canEdit}>
            {uploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" /> Submit for Verification</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
