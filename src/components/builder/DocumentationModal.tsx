import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText, ExternalLink, Upload, CheckCircle2, Clock, XCircle,
  AlertCircle, Loader2, RefreshCw, Filter as FilterIcon, FileWarning,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface DocumentationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DocStatus = "not_uploaded" | "pending_review" | "approved" | "rejected";

interface DocDef {
  type: string;
  label: string;
  category: "LEGAL" | "PROJECT" | "PROPERTY" | "COMPLETION";
  description: string;
  mandatory?: boolean;
  readOnly?: boolean; // RERA managed via separate flow
}

const DOC_DEFS: DocDef[] = [
  { type: "ownership_proof",        label: "Title Deed / Ownership Proof", category: "LEGAL",      description: "Legal proof of ownership or sale deed (PDF/JPG/PNG, max 5MB).", mandatory: true },
  { type: "encumbrance_certificate",label: "Encumbrance Certificate",       category: "LEGAL",      description: "Certificate showing the property is free from monetary/legal liabilities." },
  { type: "rera_certificate",       label: "RERA Certificate",              category: "PROJECT",    description: "Managed via 'Upload RERA' flow. Status reflects current verification.", mandatory: true, readOnly: true },
  { type: "layout_plan",            label: "Layout Plan",                   category: "PROJECT",    description: "Approved master/layout plan from competent authority." },
  { type: "floor_plan",             label: "Floor Plan",                    category: "PROPERTY",   description: "Detailed floor plan of the property unit.", mandatory: true },
  { type: "occupancy_certificate",  label: "Occupancy Certificate (OC)",    category: "COMPLETION", description: "Issued by local authority confirming the building is fit for occupation." },
  { type: "completion_certificate", label: "Completion Certificate (CC)",   category: "COMPLETION", description: "Confirms construction has been completed per approved plans." },
];

const MANDATORY_TYPES = DOC_DEFS.filter((d) => d.mandatory).map((d) => d.type);

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const MAX_SIZE_MB = 5;

interface PropertyOption {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  rera_id: string | null;
  verified: boolean | null;
  verification_status: string | null;
}

interface DocumentRow {
  id: string;
  property_id: string;
  document_type: string;
  file_url: string;
  file_name: string | null;
  status: DocStatus;
  admin_notes: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
}

interface ReraStatus {
  status: DocStatus;
  document_url: string | null;
  rera_number: string | null;
  admin_notes: string | null;
  uploaded_at: string | null;
}

const statusBadge = (status: DocStatus) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-green-600 hover:bg-green-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" />Approved</Badge>;
    case "pending_review":
      return <Badge className="bg-yellow-500 hover:bg-yellow-500 text-white gap-1"><Clock className="h-3 w-3" />Pending Review</Badge>;
    case "rejected":
      return <Badge className="bg-destructive hover:bg-destructive text-destructive-foreground gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
    default:
      return <Badge variant="outline" className="gap-1"><AlertCircle className="h-3 w-3" />Not Uploaded</Badge>;
  }
};

export default function DocumentationModal({ open, onOpenChange }: DocumentationModalProps) {
  const { user } = useAuth();
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [reraStatus, setReraStatus] = useState<ReraStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  // Load builder properties when modal opens
  useEffect(() => {
    if (!open || !user) return;
    void loadProperties();
  }, [open, user]);

  const loadProperties = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("properties")
      .select("id,title,city,locality,rera_id,verified,verification_status")
      .eq("submitted_by", user!.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Failed to load your properties");
    } else {
      setProperties(data || []);
      if (data && data.length > 0 && !selectedPropertyId) {
        setSelectedPropertyId(data[0].id);
      }
    }
    setLoading(false);
  };

  // Load docs + RERA status for the selected property
  useEffect(() => {
    if (!selectedPropertyId) {
      setDocs([]);
      setReraStatus(null);
      return;
    }
    void loadDocs();
    void loadReraStatus();
  }, [selectedPropertyId]);

  // Realtime subscription for live status updates
  useEffect(() => {
    if (!selectedPropertyId) return;
    const channel = supabase
      .channel(`property-docs-${selectedPropertyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "property_documents", filter: `property_id=eq.${selectedPropertyId}` },
        () => {
          void loadDocs();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rera_verifications", filter: `property_id=eq.${selectedPropertyId}` },
        () => {
          void loadReraStatus();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedPropertyId]);

  const loadDocs = async () => {
    const { data, error } = await supabase
      .from("property_documents")
      .select("*")
      .eq("property_id", selectedPropertyId);
    if (error) {
      console.error(error);
      return;
    }
    setDocs((data || []) as DocumentRow[]);
  };

  const loadReraStatus = async () => {
    const { data, error } = await supabase
      .from("rera_verifications")
      .select("status,document_url,rera_number,admin_notes,created_at")
      .eq("property_id", selectedPropertyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error(error);
      return;
    }
    if (data) {
      const mappedStatus: DocStatus =
        data.status === "approved" ? "approved" :
        data.status === "rejected" ? "rejected" :
        data.status === "pending" ? "pending_review" : "not_uploaded";
      setReraStatus({
        status: mappedStatus,
        document_url: data.document_url,
        rera_number: data.rera_number,
        admin_notes: data.admin_notes,
        uploaded_at: data.created_at,
      });
    } else {
      setReraStatus({ status: "not_uploaded", document_url: null, rera_number: null, admin_notes: null, uploaded_at: null });
    }
  };

  const docsByType = useMemo(() => {
    const map: Record<string, DocumentRow | undefined> = {};
    for (const d of docs) map[d.document_type] = d;
    return map;
  }, [docs]);

  const getDocStatus = (type: string): { status: DocStatus; row?: DocumentRow; reraInfo?: ReraStatus } => {
    if (type === "rera_certificate") {
      return { status: reraStatus?.status || "not_uploaded", reraInfo: reraStatus || undefined };
    }
    const row = docsByType[type];
    return { status: (row?.status as DocStatus) || "not_uploaded", row };
  };

  const approvedCount = DOC_DEFS.filter((d) => getDocStatus(d.type).status === "approved").length;
  const totalDocs = DOC_DEFS.length;
  const progressPct = Math.round((approvedCount / totalDocs) * 100);

  const mandatoryApproved = MANDATORY_TYPES.filter((t) => getDocStatus(t).status === "approved").length;
  const mandatoryTotal = MANDATORY_TYPES.length;

  const overallStatus: "Verified" | "Partially Verified" | "Not Verified" = (() => {
    if (mandatoryApproved === mandatoryTotal && mandatoryTotal > 0) return "Verified";
    if (approvedCount > 0) return "Partially Verified";
    return "Not Verified";
  })();

  const overallBadge = (() => {
    if (overallStatus === "Verified")
      return <Badge className="bg-green-600 hover:bg-green-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" />Verified</Badge>;
    if (overallStatus === "Partially Verified")
      return <Badge className="bg-yellow-500 hover:bg-yellow-500 text-white gap-1"><Clock className="h-3 w-3" />Partially Verified</Badge>;
    return <Badge variant="outline" className="gap-1"><AlertCircle className="h-3 w-3" />Not Verified</Badge>;
  })();

  // Sync overall property verification when mandatory docs all approved
  useEffect(() => {
    if (!selectedPropertyId) return;
    const property = properties.find((p) => p.id === selectedPropertyId);
    if (!property) return;
    const shouldBeVerified = overallStatus === "Verified";
    const currentlyVerified = !!property.verified;
    if (shouldBeVerified !== currentlyVerified) {
      void supabase
        .from("properties")
        .update({
          verified: shouldBeVerified,
          verification_status: shouldBeVerified ? "verified" : "pending",
        })
        .eq("id", selectedPropertyId)
        .then(() => {
          setProperties((prev) =>
            prev.map((p) =>
              p.id === selectedPropertyId
                ? { ...p, verified: shouldBeVerified, verification_status: shouldBeVerified ? "verified" : "pending" }
                : p,
            ),
          );
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overallStatus, selectedPropertyId]);

  const handleUploadClick = (type: string) => {
    fileInputs.current[type]?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user || !selectedPropertyId) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Only PDF, JPG, or PNG files are allowed");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File must be smaller than ${MAX_SIZE_MB}MB`);
      return;
    }

    setUploadingType(type);
    try {
      const ext = file.name.split(".").pop() || "pdf";
      const path = `${user.id}/${selectedPropertyId}/${type}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("property-documents-files")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("property-documents-files").getPublicUrl(path);
      const fileUrl = urlData.publicUrl;

      // Upsert by (property_id, document_type)
      const existing = docsByType[type];
      if (existing) {
        const { error } = await supabase
          .from("property_documents")
          .update({
            file_url: fileUrl,
            file_name: file.name,
            status: "pending_review",
            admin_notes: null,
            uploaded_at: new Date().toISOString(),
            reviewed_at: null,
            reviewed_by: null,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("property_documents").insert({
          property_id: selectedPropertyId,
          user_id: user.id,
          document_type: type,
          file_url: fileUrl,
          file_name: file.name,
          status: "pending_review",
        });
        if (error) throw error;
      }
      toast.success("Document uploaded — pending admin review");
      await loadDocs();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploadingType(null);
    }
  };

  const filteredDocs = DOC_DEFS.filter((d) => {
    if (statusFilter === "all") return true;
    return getDocStatus(d.type).status === statusFilter;
  });

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);
  const missingMandatory = MANDATORY_TYPES.filter((t) => getDocStatus(t).status !== "approved");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Project Documentation & Compliance
          </DialogTitle>
          <DialogDescription>
            Upload property documents individually. Each is reviewed by admin independently — no global submit needed.
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="text-center py-8 text-muted-foreground">Please sign in to manage documentation.</div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : properties.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No properties found. Add a property first to manage its documentation.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Property selector + header */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <label className="text-xs text-muted-foreground">Property</label>
                    <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                      <SelectTrigger><SelectValue placeholder="Select a property" /></SelectTrigger>
                      <SelectContent>
                        {properties.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.title} {p.city ? `— ${p.city}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedProperty && (
                    <div className="flex flex-col items-start md:items-end gap-1">
                      <div className="text-xs text-muted-foreground">Property ID: <span className="font-mono">{selectedProperty.id.slice(0, 8)}…</span></div>
                      {overallBadge}
                    </div>
                  )}
                </div>

                {/* Progress */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{approvedCount} of {totalDocs} documents approved</span>
                    <span className="text-muted-foreground">{progressPct}%</span>
                  </div>
                  <Progress value={progressPct} className="h-2" />
                </div>

                {missingMandatory.length > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-sm">
                    <FileWarning className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                    <div>
                      <strong>Missing mandatory documents:</strong>{" "}
                      {missingMandatory
                        .map((t) => DOC_DEFS.find((d) => d.type === t)?.label)
                        .filter(Boolean)
                        .join(", ")}
                      . Property cannot be marked Verified until all mandatory docs are approved.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <FilterIcon className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="not_uploaded">Not Uploaded</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Document table */}
            <TooltipProvider>
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {filteredDocs.length === 0 && (
                      <div className="p-6 text-center text-sm text-muted-foreground">No documents match this filter.</div>
                    )}
                    {filteredDocs.map((def) => {
                      const { status, row, reraInfo } = getDocStatus(def.type);
                      const isUploading = uploadingType === def.type;
                      const fileUrl = def.type === "rera_certificate" ? reraInfo?.document_url : row?.file_url;
                      const adminNotes = def.type === "rera_certificate" ? reraInfo?.admin_notes : row?.admin_notes;

                      return (
                        <div key={def.type} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{def.category}</span>
                              <span className="font-medium">{def.label}</span>
                              {def.mandatory && <Badge variant="outline" className="text-[10px]">Mandatory</Badge>}
                              {def.readOnly && <Badge variant="secondary" className="text-[10px]">Managed via RERA Upload</Badge>}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="info">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">{def.description}</TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                              {statusBadge(status)}
                              {fileUrl && (
                                <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                                  <ExternalLink className="h-3 w-3" /> Preview
                                </a>
                              )}
                            </div>
                            {status === "rejected" && adminNotes && (
                              <div className="mt-2 text-xs p-2 rounded bg-destructive/10 text-destructive border border-destructive/30">
                                <strong>Reason:</strong> {adminNotes}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {def.readOnly ? (
                              <Button size="sm" variant="outline" disabled title="Use 'Upload RERA' on the dashboard">
                                Managed separately
                              </Button>
                            ) : (
                              <>
                                <input
                                  ref={(el) => (fileInputs.current[def.type] = el)}
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                  className="hidden"
                                  onChange={(e) => handleFileChange(e, def.type)}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleUploadClick(def.type)}
                                  disabled={isUploading}
                                  variant={status === "approved" ? "outline" : "default"}
                                >
                                  {isUploading ? (
                                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Uploading…</>
                                  ) : status === "not_uploaded" ? (
                                    <><Upload className="h-3 w-3 mr-1" /> Upload</>
                                  ) : (
                                    <><RefreshCw className="h-3 w-3 mr-1" /> Replace</>
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TooltipProvider>

            <div className="bg-primary/10 p-3 rounded-lg text-xs text-muted-foreground">
              Files: PDF, JPG, PNG · Max {MAX_SIZE_MB}MB · One file per document type · Replacing overwrites the previous upload and resets status to "Pending Review".
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
