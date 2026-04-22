import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock, XCircle, ExternalLink, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

interface DocRow {
  id: string;
  property_id: string;
  user_id: string;
  document_type: string;
  file_url: string;
  file_name: string | null;
  status: "pending_review" | "approved" | "rejected";
  admin_notes: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  ownership_proof: "Title Deed / Ownership",
  encumbrance_certificate: "Encumbrance Certificate",
  rera_certificate: "RERA Certificate",
  layout_plan: "Layout Plan",
  floor_plan: "Floor Plan",
  occupancy_certificate: "Occupancy Certificate",
  completion_certificate: "Completion Certificate",
};

const statusBadge = (s: string) => {
  if (s === "approved") return <Badge className="bg-green-600 hover:bg-green-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" />Approved</Badge>;
  if (s === "rejected") return <Badge className="bg-destructive text-destructive-foreground gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
  return <Badge className="bg-yellow-500 hover:bg-yellow-500 text-white gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
};

const MANDATORY = ["ownership_proof", "rera_certificate", "floor_plan"];

export default function PropertyDocumentsPanel() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [propertyMap, setPropertyMap] = useState<Record<string, { title: string; submitted_by: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewing, setReviewing] = useState<DocRow | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data: docData, error } = await supabase
      .from("property_documents")
      .select("*")
      .order("uploaded_at", { ascending: false });
    if (error) {
      toast.error("Failed to load documents");
      setLoading(false);
      return;
    }
    const rows = (docData || []) as DocRow[];
    setDocs(rows);

    const ids = Array.from(new Set(rows.map((d) => d.property_id)));
    if (ids.length > 0) {
      const { data: props } = await supabase
        .from("properties")
        .select("id,title,submitted_by")
        .in("id", ids);
      const map: Record<string, { title: string; submitted_by: string | null }> = {};
      for (const p of props || []) map[p.id] = { title: p.title, submitted_by: p.submitted_by };
      setPropertyMap(map);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (statusFilter === "all") return docs;
    return docs.filter((d) => d.status === statusFilter);
  }, [docs, statusFilter]);

  const openReview = (doc: DocRow, action: "approve" | "reject") => {
    setReviewing(doc);
    setReviewAction(action);
    setReviewNotes("");
  };

  const submitReview = async () => {
    if (!reviewing || !reviewAction) return;
    if (reviewAction === "reject" && !reviewNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const newStatus = reviewAction === "approve" ? "approved" : "rejected";
      const { error } = await supabase
        .from("property_documents")
        .update({
          status: newStatus,
          admin_notes: reviewAction === "reject" ? reviewNotes.trim() : null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id || null,
        })
        .eq("id", reviewing.id);
      if (error) throw error;

      // Re-evaluate property verification (mandatory docs all approved => verified)
      const propertyId = reviewing.property_id;
      const { data: propDocs } = await supabase
        .from("property_documents")
        .select("document_type,status")
        .eq("property_id", propertyId);
      const approvedTypes = new Set((propDocs || []).filter((d) => d.status === "approved").map((d) => d.document_type));
      // RERA verification status separately
      const { data: rera } = await supabase
        .from("rera_verifications")
        .select("status")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (rera?.status === "approved") approvedTypes.add("rera_certificate");
      const allMandatory = MANDATORY.every((t) => approvedTypes.has(t));
      await supabase
        .from("properties")
        .update({
          verified: allMandatory,
          verification_status: allMandatory ? "verified" : "pending",
        })
        .eq("id", propertyId);

      toast.success(`Document ${newStatus}`);
      setReviewing(null);
      setReviewAction(null);
      setReviewNotes("");
      await load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Document Verification Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{filtered.length} document(s)</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No documents to display.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((doc) => {
                  const prop = propertyMap[doc.property_id];
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{prop?.title || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground font-mono">{doc.property_id.slice(0, 8)}…</div>
                      </TableCell>
                      <TableCell className="text-sm">{TYPE_LABELS[doc.document_type] || doc.document_type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {statusBadge(doc.status)}
                        {doc.status === "rejected" && doc.admin_notes && (
                          <div className="text-xs text-destructive mt-1 max-w-[200px] truncate" title={doc.admin_notes}>
                            {doc.admin_notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <a href={doc.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary text-sm hover:underline">
                          <ExternalLink className="h-3 w-3" /> View
                        </a>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" disabled={doc.status === "approved"} onClick={() => openReview(doc, "approve")}>
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" disabled={doc.status === "rejected"} onClick={() => openReview(doc, "reject")}>
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={!!reviewing} onOpenChange={(o) => { if (!o) { setReviewing(null); setReviewAction(null); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{reviewAction === "approve" ? "Approve Document" : "Reject Document"}</DialogTitle>
            </DialogHeader>
            {reviewing && (
              <div className="space-y-3 text-sm">
                <div><strong>Property:</strong> {propertyMap[reviewing.property_id]?.title}</div>
                <div><strong>Type:</strong> {TYPE_LABELS[reviewing.document_type]}</div>
                {reviewAction === "reject" && (
                  <div>
                    <label className="text-sm font-medium">Reason for rejection (required)</label>
                    <Textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="e.g. Document is illegible, expired, or doesn't match the property…"
                      maxLength={500}
                      rows={4}
                    />
                  </div>
                )}
                {reviewAction === "approve" && (
                  <p className="text-muted-foreground">Approving this document will update the builder's status. If all mandatory documents are approved, the property will be marked Verified.</p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewing(null)} disabled={submitting}>Cancel</Button>
              <Button
                onClick={submitReview}
                disabled={submitting}
                variant={reviewAction === "reject" ? "destructive" : "default"}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Confirm {reviewAction === "approve" ? "Approval" : "Rejection"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
