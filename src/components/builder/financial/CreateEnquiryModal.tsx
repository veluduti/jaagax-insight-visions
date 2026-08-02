import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { financialService, type FinancialEnquiryType } from "@/services/financialService";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  builderProfileId: string;
  userId: string;
  onCreated?: () => void;
}

const ENQUIRY_TYPES: { value: FinancialEnquiryType; label: string }[] = [
  { value: "home_loan", label: "Home Loan" },
  { value: "mortgage", label: "Mortgage" },
  { value: "refinance", label: "Refinance" },
];

export default function CreateEnquiryModal({ open, onOpenChange, builderProfileId, userId, onCreated }: Props) {
  const [enquiryType, setEnquiryType] = useState<FinancialEnquiryType>("home_loan");
  const [loanAmount, setLoanAmount] = useState("");
  const [tenure, setTenure] = useState("20");
  const [rate, setRate] = useState("8.5");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const amount = Number(loanAmount) || 0;
  const years = Number(tenure) || 0;
  const annualRate = Number(rate) || 0;
  const monthlyEmi = (() => {
    if (!amount || !years || !annualRate) return 0;
    const r = annualRate / 12 / 100;
    const n = years * 12;
    return Math.round((amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  })();

  const reset = () => {
    setEnquiryType("home_loan");
    setLoanAmount("");
    setTenure("20");
    setRate("8.5");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!amount) {
      toast.error("Loan amount is required");
      return;
    }
    setSaving(true);
    try {
      await financialService.createEnquiry({
        builder_profile_id: builderProfileId,
        user_id: userId,
        loan_type: enquiryType,
        enquiry_type: enquiryType,
        loan_amount: amount,
        loan_tenure_years: years || null,
        interest_rate_offered: annualRate || null,
        monthly_emi: monthlyEmi || null,
        notes: notes.trim() || null,
        status: "new",
      });
      toast.success("Enquiry created");
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      toast.error("Failed to create enquiry", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Enquiry</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Enquiry Type</Label>
            <Select value={enquiryType} onValueChange={(v) => setEnquiryType(v as FinancialEnquiryType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENQUIRY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Loan Amount (₹) *</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              placeholder="5000000"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tenure (years)</Label>
              <Input type="number" value={tenure} onChange={(e) => setTenure(e.target.value)} />
            </div>
            <div>
              <Label>Interest Rate (%)</Label>
              <Input type="number" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} />
            </div>
          </div>
          {monthlyEmi > 0 && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              Estimated EMI:{" "}
              <span className="font-semibold text-primary">₹{monthlyEmi.toLocaleString("en-IN")}/month</span>
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any context…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? "Creating…" : "Create Enquiry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
