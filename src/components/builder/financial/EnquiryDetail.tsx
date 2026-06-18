import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { financialService, type FinancialEnquiry, type FinancialEnquiryStatus } from "@/services/financialService";
import { User, Home, Calculator, FileText, UserCheck, CalendarClock, XCircle } from "lucide-react";

interface Props {
  enquiry: FinancialEnquiry;
  onClose: () => void;
  onRefresh: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  contacted: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  documents_submitted: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  under_review: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  approved: "bg-green-500/15 text-green-700 dark:text-green-400",
  rejected: "bg-red-500/15 text-red-700 dark:text-red-400",
  deactivated: "bg-gray-500/15 text-gray-700 dark:text-gray-400",
};

export default function EnquiryDetail({ enquiry, onClose, onRefresh }: Props) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"view" | "status" | "advisor" | "emi" | "deactivate" | "docs">("view");
  const [saving, setSaving] = useState(false);

  const [statusForm, setStatusForm] = useState<{ status: FinancialEnquiryStatus; notes: string }>({
    status: enquiry.status,
    notes: enquiry.advisor_notes ?? "",
  });
  const [advisor, setAdvisor] = useState({ name: enquiry.advisor_name ?? "", contact: enquiry.advisor_contact ?? "" });
  const [emiDate, setEmiDate] = useState("");
  const [reason, setReason] = useState("");
  const [docName, setDocName] = useState("");

  const wrap = async (fn: () => Promise<unknown>, msg: string) => {
    setSaving(true);
    try {
      await fn();
      toast({ title: msg });
      onRefresh();
      setMode("view");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>Enquiry · {enquiry.enquiry_type ?? enquiry.loan_type}</span>
            <Badge className={STATUS_STYLES[enquiry.status] ?? ""}>{enquiry.status.replace(/_/g, " ")}</Badge>
          </DialogTitle>
        </DialogHeader>

        {mode === "view" && (
          <div className="space-y-4">
            <Card className="border-border shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-2"><User className="h-4 w-4 mt-0.5 text-muted-foreground" /><div><p className="text-sm font-semibold">Buyer</p><p className="text-sm text-muted-foreground">{enquiry.user_id}</p></div></div>
                <Separator />
                <div className="flex items-start gap-2"><Home className="h-4 w-4 mt-0.5 text-muted-foreground" /><div><p className="text-sm font-semibold">Property</p><p className="text-sm text-muted-foreground">{enquiry.property_id ?? "—"}</p></div></div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground text-xs">Loan amount</p><p className="font-medium">₹{Number(enquiry.loan_amount ?? enquiry.amount_requested ?? 0).toLocaleString()}</p></div>
                  <div><p className="text-muted-foreground text-xs">Tenure</p><p className="font-medium">{enquiry.loan_tenure_years ?? "—"} yrs</p></div>
                  <div><p className="text-muted-foreground text-xs">Rate</p><p className="font-medium">{enquiry.interest_rate_offered ?? "—"}%</p></div>
                  <div><p className="text-muted-foreground text-xs">Monthly EMI</p><p className="font-medium">₹{Number(enquiry.monthly_emi ?? 0).toLocaleString()}</p></div>
                </div>
                {enquiry.advisor_name && (<><Separator /><p className="text-sm"><span className="font-semibold">Advisor:</span> {enquiry.advisor_name} · {enquiry.advisor_contact}</p></>)}
                {enquiry.advisor_notes && (<p className="text-sm"><span className="font-semibold">Notes:</span> {enquiry.advisor_notes}</p>)}
                {Array.isArray(enquiry.documents) && enquiry.documents.length > 0 && (
                  <>
                    <Separator />
                    <div><p className="text-sm font-semibold mb-1">Documents</p><ul className="text-sm text-muted-foreground list-disc pl-5">{enquiry.documents.map((d: any, i: number) => (<li key={i}>{typeof d === "string" ? d : d.name ?? JSON.stringify(d)}</li>))}</ul></div>
                  </>
                )}
                {enquiry.deactivated_reason && <p className="text-sm text-red-600">Deactivated: {enquiry.deactivated_reason}</p>}
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setMode("status")}><FileText className="h-4 w-4 mr-2" />Update Status</Button>
              <Button variant="outline" onClick={() => setMode("docs")}><FileText className="h-4 w-4 mr-2" />Submit Docs</Button>
              <Button variant="outline" onClick={() => setMode("emi")}><CalendarClock className="h-4 w-4 mr-2" />Schedule EMI</Button>
              <Button variant="outline" onClick={() => setMode("advisor")}><UserCheck className="h-4 w-4 mr-2" />Assign Advisor</Button>
              {enquiry.status !== "deactivated" && (
                <Button variant="outline" onClick={() => setMode("deactivate")}><XCircle className="h-4 w-4 mr-2" />Deactivate</Button>
              )}
            </div>
          </div>
        )}

        {mode === "status" && (
          <div className="space-y-3">
            <div>
              <Label>Status</Label>
              <Select value={statusForm.status} onValueChange={(v) => setStatusForm({ ...statusForm, status: v as FinancialEnquiryStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["new","contacted","documents_submitted","under_review","approved","rejected","deactivated"] as const).map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={statusForm.notes} onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })} /></div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMode("view")}>Back</Button>
              <Button disabled={saving} onClick={() => wrap(() => financialService.updateEnquiryStatus(enquiry.id, statusForm.status, statusForm.notes), "Status updated")}>{saving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </div>
        )}

        {mode === "advisor" && (
          <div className="space-y-3">
            <div><Label>Advisor name</Label><Input value={advisor.name} onChange={(e) => setAdvisor({ ...advisor, name: e.target.value })} /></div>
            <div><Label>Contact</Label><Input value={advisor.contact} onChange={(e) => setAdvisor({ ...advisor, contact: e.target.value })} /></div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMode("view")}>Back</Button>
              <Button disabled={saving || !advisor.name} onClick={() => wrap(() => financialService.assignAdvisor(enquiry.id, advisor.name, advisor.contact), "Advisor assigned")}>{saving ? "Saving…" : "Assign"}</Button>
            </DialogFooter>
          </div>
        )}

        {mode === "emi" && (
          <div className="space-y-3">
            <div><Label>EMI discussion date</Label><Input type="datetime-local" value={emiDate} onChange={(e) => setEmiDate(e.target.value)} /></div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMode("view")}>Back</Button>
              <Button disabled={saving || !emiDate} onClick={() => wrap(() => financialService.scheduleEMIDiscussion(enquiry.id, new Date(emiDate).toISOString()), "EMI discussion scheduled")}>{saving ? "Saving…" : "Schedule"}</Button>
            </DialogFooter>
          </div>
        )}

        {mode === "deactivate" && (
          <div className="space-y-3">
            <Label>Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why deactivate?" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setMode("view")}>Back</Button>
              <Button variant="destructive" disabled={saving || !reason} onClick={() => wrap(() => financialService.deactivateEnquiry(enquiry.id, reason), "Enquiry deactivated")}>{saving ? "…" : "Deactivate"}</Button>
            </DialogFooter>
          </div>
        )}

        {mode === "docs" && (
          <div className="space-y-3">
            <Label>Add document reference (name or URL)</Label>
            <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="e.g. salary-slip.pdf" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setMode("view")}>Back</Button>
              <Button disabled={saving || !docName} onClick={() => {
                const existing = Array.isArray(enquiry.documents) ? enquiry.documents : [];
                return wrap(() => financialService.submitDocuments(enquiry.id, [...existing, { name: docName, added_at: new Date().toISOString() }]), "Document added");
              }}>{saving ? "Saving…" : "Submit"}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
