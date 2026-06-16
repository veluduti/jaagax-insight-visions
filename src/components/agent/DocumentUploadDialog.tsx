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
import { Loader2, Upload, FileText, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface DocumentUploadDialogProps {
  open: boolean;
  onClose: () => void;
  enquiryId: string | null;
  onUploaded?: () => void;
}

interface Doc {
  id: string;
  application_id: string;
  document_type: string;
  file_path: string;
  verified_status: string | null;
  uploaded_at: string;
}

const DOC_TYPES = [
  { value: "pan_card", label: "PAN Card" },
  { value: "aadhaar", label: "Aadhaar Card" },
  { value: "salary_slip", label: "Salary Slip" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "itr", label: "Income Tax Return" },
  { value: "property_document", label: "Property Document" },
  { value: "other", label: "Other" },
];

export default function DocumentUploadDialog({ 
  open, 
  onClose, 
  enquiryId, 
  onUploaded 
}: DocumentUploadDialogProps) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docType, setDocType] = useState("pan_card");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const load = async () => {
    if (!enquiryId) return;
    setListLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("financial_loan_documents")
        .select("*")
        .eq("application_id", enquiryId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setDocs((data || []) as Doc[]);
    } catch (error: any) {
      console.error("Error loading documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (open && enquiryId) load();
  }, [open, enquiryId]);

  const upload = async () => {
    if (!file || !enquiryId) {
      toast.error("Please select a file first");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    const ext = file.name.split(".").pop();
    const path = `${enquiryId}/${docType}_${Date.now()}.${ext}`;

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const { error: upErr } = await supabase.storage
        .from("loan-documents")
        .upload(path, file, { 
          upsert: false,
          cacheControl: "3600",
        });

      clearInterval(progressInterval);

      if (upErr) throw upErr;

      setUploadProgress(100);

      const { error: insErr } = await supabase.from("financial_loan_documents").insert({
        application_id: enquiryId,
        document_type: docType,
        file_path: path,
        verified_status: "pending",
      });

      if (insErr) throw insErr;

      toast.success("Document uploaded successfully");
      setFile(null);
      setUploadProgress(0);
      load();
      onUploaded?.();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Upload failed");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const remove = async (doc: Doc) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      await supabase.storage.from("loan-documents").remove([doc.file_path]);
      
      const { error } = await supabase
        .from("financial_loan_documents")
        .delete()
        .eq("id", doc.id);
        
      if (error) throw error;
      
      toast.success("Document removed");
      load();
      onUploaded?.();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Failed to delete document");
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-600 text-white"><CheckCircle className="h-3 w-3 mr-0.5" /> Verified</Badge>;
      case "rejected":
        return <Badge className="bg-red-600 text-white"><XCircle className="h-3 w-3 mr-0.5" /> Rejected</Badge>;
      default:
        return <Badge variant="outline" className="text-amber-600 border-amber-200"><Clock className="h-3 w-3 mr-0.5" /> Pending</Badge>;
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case "pan_card":
        return <FileText className="h-4 w-4 text-orange-500" />;
      case "aadhaar":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "salary_slip":
        return <FileText className="h-4 w-4 text-green-500" />;
      case "bank_statement":
        return <FileText className="h-4 w-4 text-purple-500" />;
      case "itr":
        return <FileText className="h-4 w-4 text-red-500" />;
      case "property_document":
        return <FileText className="h-4 w-4 text-indigo-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Loan Documents
          </DialogTitle>
          <DialogDescription>
            Upload KYC and supporting documents for this enquiry.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Upload Section */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="col-span-1">
                <Label className="text-xs">Document Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">File</Label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  disabled={loading}
                  className="cursor-pointer"
                />
                {file && (
                  <p className="text-[10