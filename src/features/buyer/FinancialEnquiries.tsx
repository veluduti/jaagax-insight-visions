import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  PiggyBank, Plus, FileText, Phone, XCircle, Upload, Eye, CheckCircle2, Clock, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useFinancial, FinancialEnquiry, LoanDocument } from "@/hooks/useFinancial";
import LoanApplication from "./LoanApplication";
import LoanStatusTracker from "./LoanStatusTracker";
import EMIDiscussion from "./EMIDiscussion";

const DOC_TYPES = ["Salary Slips", "Bank Statements", "IT Returns", "Property Documents", "Other"];

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    applied: { label: "Applied", className: "bg-blue-100 text-blue-700" },
    documents_pending: { label: "Docs Pending", className: "bg-amber-100 text-amber-700" },
    under_review: { label: "Under Review", className: "bg-amber-100 text-amber-700" },
    approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "Rejected", className: "bg-rose-100 text-rose-700" },
    disbursed: { label: "Disbursed", className: "bg-emerald-100 text-emerald-700" },
    deactivated: { label: "Deactivated", className: "bg-muted text-muted-foreground" },
  };
  const v = map[status] ?? { label: status, className: "" };
  return <Badge className={v.className + " hover:" + v.className}>{v.label}</Badge>;
}

function loanTypeLabel(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function FinancialEnquiries() {
  const { enquiries, isLoading, refresh, deactivateEnquiry, uploadDocument, getDocuments } = useFinancial();
  const [applyOpen, setApplyOpen] = useState(false);
  const [detail, setDetail] = useState<FinancialEnquiry | null>(null);
  const [detailDocs, setDetailDocs] = useState<LoanDocument[]>([]);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (detail) getDocuments(detail.id).then(setDetailDocs);
    else setDetailDocs([]);
  }, [detail, getDocuments]);

  const stats = useMemo(() => {
    const total = enquiries.length;
    const active = enquiries.filter((e) => ["applied", "documents_pending", "under_review"].includes(e.status)).length;
    const approved = enquiries.filter((e) => ["approved", "disbursed"].includes(e.status)).length;
    const rejected = enquiries.filter((e) => e.status === "rejected").length;
    return { total, active, approved, rejected };
  }, [enquiries]);

  const handleUpload = async (file: File | null) => {
    if (!file || !detail) return;
    setUploading(true);
    try {
      await uploadDocument(detail.id, file, docType);
      toast.success("Document uploaded");
      const docs = await getDocuments(detail.id);
      setDetailDocs(docs);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally { setUploading(false); }
  };

  const handleDeactivate = async (e: FinancialEnquiry) => {
    try {
      await deactivateEnquiry(e.id, "Cancelled by buyer");
      toast.success("Enquiry deactivated");
      setDetail(null);
    } catch (err: any) { toast.error(err.message || "Failed"); }
  };

  const contactAdvisor = (e: FinancialEnquiry) => {
    if (e.advisor_contact) window.location.href = `tel:${e.advisor_contact}`;
    else toast.info("An advisor will be assigned and reach out within 24 hours.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <PiggyBank className="h-6 w-6" /> Financial Services
          </h2>
          <p className="text-sm text-muted-foreground">Loan applications, EMI guidance and advisor support.</p>
        </div>
        <Button onClick={() => setApplyOpen(true)}><Plus className="h-4 w-4 mr-2" /> Apply for New Loan</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, className: "" },
          { label: "Active", value: stats.active, className: "text-amber-600" },
          { label: "Approved", value: stats.approved, className: "text-emerald-600" },
          { label: "Rejected", value: stats.rejected, className: "text-rose-600" },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className={`text-2xl font-bold ${s.className}`}>{s.value}</div>
          </CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="enquiries">
        <TabsList>
          <TabsTrigger value="enquiries">My Enquiries</TabsTrigger>
          <TabsTrigger value="emi">EMI Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="enquiries" className="mt-4">
          {isLoading ? (
            <div className="grid gap-3">{[1, 2].map(i => <Card key={i} className="h-28 animate-pulse bg-muted/40" />)}</div>
          ) : enquiries.length === 0 ? (
            <Card className="p-12 text-center">
              <PiggyBank className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg">No applications yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Apply for your first loan and get matched with a financial advisor.</p>
              <Button onClick={() => setApplyOpen(true)}><Plus className="h-4 w-4 mr-2" /> Apply for New Loan</Button>
            </Card>
          ) : (
            <div className="grid gap-3">
              {enquiries.map((e) => (
                <Card key={e.id}>
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{loanTypeLabel(e.loan_type)}</span>
                        {statusBadge(e.status)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Amount: ₹{Number(e.amount_requested ?? 0).toLocaleString("en-IN")} •
                        Applied {new Date(e.created_at).toLocaleDateString()}
                        {e.monthly_emi ? ` • EMI ₹${Number(e.monthly_emi).toLocaleString("en-IN")}/mo` : ""}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setDetail(e)}>
                        <Eye className="h-3 w-3 mr-1" /> Details
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => contactAdvisor(e)}>
                        <Phone className="h-3 w-3 mr-1" /> Advisor
                      </Button>
                      {e.status !== "deactivated" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-rose-600">
                              <XCircle className="h-3 w-3 mr-1" /> Deactivate
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deactivate enquiry?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will cancel the enquiry. You can reapply later.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeactivate(e)}>Confirm</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="emi" className="mt-4">
          <EMIDiscussion />
        </TabsContent>
      </Tabs>

      <LoanApplication open={applyOpen} onOpenChange={setApplyOpen} onCreated={refresh} />

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail && loanTypeLabel(detail.loan_type)}</DialogTitle>
            <DialogDescription>
              Applied on {detail && new Date(detail.created_at).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-4">
              <Card><CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-muted-foreground text-xs">Amount</div>₹{Number(detail.amount_requested ?? 0).toLocaleString("en-IN")}</div>
                <div><div className="text-muted-foreground text-xs">Tenure</div>{detail.loan_tenure_years ?? "—"} yrs</div>
                <div><div className="text-muted-foreground text-xs">Interest</div>{detail.interest_rate_offered ?? "—"}%</div>
                <div><div className="text-muted-foreground text-xs">Monthly EMI</div>₹{Number(detail.monthly_emi ?? 0).toLocaleString("en-IN")}</div>
                <div className="col-span-2"><div className="text-muted-foreground text-xs">Advisor</div>{detail.advisor_name ?? "Awaiting assignment"} {detail.advisor_contact && `(${detail.advisor_contact})`}</div>
                {detail.notes && <div className="col-span-2"><div className="text-muted-foreground text-xs">Notes</div>{detail.notes}</div>}
              </CardContent></Card>

              <LoanStatusTracker status={detail.status} updatedAt={detail.updated_at} notes={detail.notes} />

              {/* Documents */}
              <Card><CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Documents</h4>
                  <div className="flex items-center gap-2">
                    <select value={docType} onChange={(e) => setDocType(e.target.value)}
                      className="h-8 text-xs rounded border bg-background px-2">
                      {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <label>
                      <input type="file" hidden accept="image/*,application/pdf"
                        onChange={(e) => handleUpload(e.target.files?.[0] ?? null)} />
                      <Button size="sm" disabled={uploading} asChild>
                        <span>{uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />} Upload</span>
                      </Button>
                    </label>
                  </div>
                </div>
                {detailDocs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No documents uploaded yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {detailDocs.map((d) => (
                      <li key={d.id} className="flex items-center justify-between text-sm border rounded p-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>{d.type}</span>
                          {d.status === "verified" && <Badge className="bg-emerald-100 text-emerald-700">Verified</Badge>}
                          {d.status === "pending" && <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>}
                          {d.status === "rejected" && <Badge variant="destructive">Rejected</Badge>}
                        </div>
                        <a href={d.file_url} target="_blank" rel="noreferrer" className="text-primary text-xs underline">View</a>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent></Card>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => contactAdvisor(detail)}>
                  <Phone className="h-4 w-4 mr-1" /> Contact Advisor
                </Button>
                {detail.status !== "deactivated" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" className="text-rose-600">
                        <XCircle className="h-4 w-4 mr-1" /> Deactivate Enquiry
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Deactivate enquiry?</AlertDialogTitle>
                        <AlertDialogDescription>This will cancel the enquiry.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeactivate(detail)}>Confirm</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FinancialEnquiries;
