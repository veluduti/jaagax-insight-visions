import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, CheckCircle2, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export type UploadedDoc = { type: string; url: string; path: string; name: string };

interface Props {
  docTypes: string[];
  onSubmit: (uploaded: UploadedDoc[]) => Promise<void> | void;
}

export default function DocumentUploadWidget({ docTypes, onSubmit }: Props) {
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploaded, setUploaded] = useState<Record<string, UploadedDoc>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleUpload(docType: string, file: File) {
    setBusy(docType);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to upload");
        return;
      }
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${user.id}/${Date.now()}-${docType.replace(/\s+/g, "_")}-${safeName}`;
      const { error } = await supabase.storage
        .from("financial-documents")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: signed } = await supabase.storage
        .from("financial-documents")
        .createSignedUrl(path, 60 * 60 * 24 * 30);
      const url = signed?.signedUrl ?? "";
      setUploaded((u) => ({ ...u, [docType]: { type: docType, url, path, name: file.name } }));
      toast.success(`${docType} uploaded`);
    } catch (e: any) {
      toast.error(e.message || `Could not upload ${docType}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleSubmit() {
    const missing = docTypes.filter((t) => !uploaded[t]);
    if (missing.length) {
      toast.error(`Upload remaining: ${missing.join(", ")}`);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(docTypes.map((t) => uploaded[t]));
    } finally {
      setSubmitting(false);
    }
  }

  const allDone = docTypes.length > 0 && docTypes.every((t) => uploaded[t]);

  return (
    <div className="mt-3 p-3 rounded-2xl border border-border bg-card/50 space-y-3">
      <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <FileText className="h-3.5 w-3.5" />
        Upload {docTypes.length} document{docTypes.length > 1 ? "s" : ""}
      </div>
      <div className="space-y-2">
        {docTypes.map((t) => {
          const done = !!uploaded[t];
          const file = files[t];
          return (
            <div key={t} className="flex items-center gap-2 flex-wrap">
              <div className="min-w-[110px] text-sm font-medium">{t}</div>
              <Input
                type="file"
                accept="image/*,.pdf"
                className="bg-background border-border text-xs flex-1 min-w-[180px]"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFiles((s) => ({ ...s, [t]: f }));
                  if (f) handleUpload(t, f);
                }}
                disabled={busy === t}
              />
              {busy === t && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              {done && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              {done && (
                <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                  {uploaded[t].name}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <Button
        onClick={handleSubmit}
        disabled={!allDone || submitting}
        className={cn("w-full bg-primary text-primary-foreground font-semibold")}
        size="sm"
      >
        {submitting ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</>
        ) : (
          <><Upload className="h-4 w-4 mr-2" /> Submit Documents & Continue</>
        )}
      </Button>
    </div>
  );
}
