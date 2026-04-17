import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText, Loader2 } from "lucide-react";

interface RERAUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional legacy prop — modal now loads the builder's own properties directly. */
  projects?: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

interface BuilderProperty {
  id: string;
  title: string;
  rera_id: string | null;
  verified: boolean | null;
}

export default function RERAUploadModal({ open, onOpenChange, onSuccess }: RERAUploadModalProps) {
  const [properties, setProperties] = useState<BuilderProperty[]>([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [reraNumber, setReraNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoadingProps(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingProps(false);
        return;
      }
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, rera_id, verified")
        .eq("submitted_by", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) setProperties(data as BuilderProperty[]);
      setLoadingProps(false);
    })();
  }, [open]);

  // Prefill RERA when picking a property that already has one
  useEffect(() => {
    const p = properties.find((x) => x.id === selectedProperty);
    if (p?.rera_id) setReraNumber(p.rera_id);
  }, [selectedProperty, properties]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (!selectedFile.type.includes("pdf") && !selectedFile.type.includes("image")) {
      toast.error("Please upload a PDF or image file");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!selectedProperty || !reraNumber.trim()) {
      toast.error("Please select a property and enter RERA number");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      let documentUrl: string | null = null;

      // Upload file (optional) to public bucket under user's folder
      if (file) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${user.id}/${selectedProperty}-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("rera-documents")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (uploadErr) throw uploadErr;
        const { data: pub } = supabase.storage.from("rera-documents").getPublicUrl(path);
        documentUrl = pub.publicUrl;
      }

      // Update property with RERA + mark verified (RERA presence triggers verified flag)
      const update: any = {
        rera_id: reraNumber.trim(),
        verified: true,
        verification_status: "approved",
      };
      if (documentUrl) update.rera_document_url = documentUrl;

      const { error: updateError } = await supabase
        .from("properties")
        .update(update)
        .eq("id", selectedProperty);

      if (updateError) throw updateError;

      // Notify admins
      try {
        const { data: admins } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");
        if (admins?.length) {
          const propTitle = properties.find((p) => p.id === selectedProperty)?.title || "Property";
          await supabase.from("notifications").insert(
            admins.map((a: any) => ({
              user_id: a.user_id,
              type: "rera",
              title: "RERA document uploaded",
              message: `Builder added RERA "${reraNumber}" for "${propTitle}".`,
              link: `/admin`,
            }))
          );
        }
      } catch (e) {
        console.warn("admin notify failed", e);
      }

      toast.success("RERA information saved and property marked verified.");
      onOpenChange(false);
      onSuccess?.();

      setSelectedProperty("");
      setReraNumber("");
      setFile(null);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to update RERA information");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload RERA Document
          </DialogTitle>
          <DialogDescription>
            Attach a RERA registration to one of your properties. The property will be marked verified instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="property">Select Property</Label>
            <Select value={selectedProperty} onValueChange={setSelectedProperty} disabled={loadingProps}>
              <SelectTrigger>
                <SelectValue placeholder={loadingProps ? "Loading…" : properties.length ? "Choose a property" : "No properties found — add one first"} />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title} {p.rera_id ? "✓" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rera">RERA Registration Number</Label>
            <Input
              id="rera"
              placeholder="P12345678901234"
              value={reraNumber}
              onChange={(e) => setReraNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Upload Document (PDF or Image) — Optional</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              {file && <FileText className="h-5 w-5 text-green-600" />}
            </div>
            {file && <p className="text-sm text-muted-foreground">Selected: {file.name}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !selectedProperty}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Save RERA & Verify
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
