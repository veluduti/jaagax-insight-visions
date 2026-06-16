import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, FileText, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  enquiryId: string | null;
}

interface Doc {
  id: string;
  document_type: string;
  file_path: string;
  verified_status: string | null;
  uploaded_at: string;
}

const DOC_TYPES = [
  "pan_card",
  "aadhaar",
  "salary_slip",
  "bank_statement",
  "itr",
  "property_document",
  "other",
];

export default function DocumentUploadDialog({ open, onClose, enquiryId }: Props) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docType, setDocType] = useState("pan_card");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);

  const load = async () => {
    if (!enquiryId) return;
    setListLoading(true);
    const { data, error } = await supabase
      .from("financial_loan_documents")
      .select("*")
      .eq("application_id", enquiryId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      toast.error("Failed to load documents");
    } else {
      setDocs((data || []) as Doc[]);
    }
    setListLoading(false);
  };

  useEffect(() => {
    if (open && enquiryId) load();
  }, [open, enquiryId]);

  const upload = async () => {
    if (!file || !enquiryId) return toast.error("Pick a file first");
    setLoading(true);

    const ext = file.name.split(".").pop();
    const path = `${enquiryId}/${docType}_${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("loan-documents")
      .upload(path, file, { upsert: false });

    if (upErr) {
      setLoading(false);
      console.error(upErr);
      return toast.error(upErr.message || "Upload failed");
    }

    const { error: insErr } = await supabase.from("financial_loan_documents").insert({
      application_id: enquiryId,
      document_type: docType,
      file_path: path,
      verified_status: "pending",
    });

    setLoading(false);

    if (insErr) {
      console.error(insErr);
      return toast.error("Failed to record document");
    }
    toast.success("Document uploaded");
    setFile(null);
    load();
  };

  const remove = async (doc: Doc) => {
    await supabase.storage.from("loan-documents").remove([doc.file_path]);
    const { error } = await supabase
      .from("financial_loan_documents")
      .delete()
      .eq("id", doc.id);
    if (error) return toast.error("Delete failed");
    toast.success("Removed");
    load();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Loan Documents</DialogTitle>
          <DialogDescription>
            Upload KYC and supporting documents for this enquiry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 items-end">
            <div className="col-span-1">
              <Label>Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>File</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <Button onClick={upload} disabled={loading || !file} className="w-full">
            {loading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            Upload Document
          </Button>

          <div className="space-y-2 max-h-64 overflow-y-auto pt-2 border-t">
            {listLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
            ) : docs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No documents uploaded yet.
              </p>
            ) : (
              docs.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between border rounded-md p-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize truncate">
                        {d.document_type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {new Date(d.uploaded_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {d.verified_status || "pending"}
                    </Badge>
                    <Button size="icon" variant="ghost" onClick={() => remove(d)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
