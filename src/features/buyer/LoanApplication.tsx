import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Home, Building2, Scale, DollarSign, TrendingUp, BarChart3, Upload, CheckCircle2, ArrowLeft, ArrowRight, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useFinancial, LoanType } from "@/hooks/useFinancial";

const LOAN_TYPES: { value: LoanType; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { value: "home_loan", label: "Home Loan", icon: Home, desc: "Finance your dream home" },
  { value: "mortgage", label: "Mortgage", icon: Building2, desc: "Loan against property" },
  { value: "property_legal", label: "Property Legal", icon: Scale, desc: "Legal verification of property" },
  { value: "property_valuation", label: "Property Valuation", icon: BarChart3, desc: "Get your property valued" },
  { value: "investment_advisory", label: "Investment Advisory", icon: TrendingUp, desc: "Expert investment guidance" },
  { value: "credit_score", label: "Credit Score", icon: DollarSign, desc: "Check your credit health" },
];

const DOC_TYPES = ["Salary Slips", "Bank Statements", "IT Returns", "Property Documents"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

export function LoanApplication({ open, onOpenChange, onCreated }: Props) {
  const { createEnquiry, uploadDocument } = useFinancial();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  const [loanType, setLoanType] = useState<LoanType | "">("");
  const [propertyTitle, setPropertyTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [tenure, setTenure] = useState("20");
  const [income, setIncome] = useState("");
  const [existingLoans, setExistingLoans] = useState("");
  const [expenses, setExpenses] = useState("");
  const [creditScore, setCreditScore] = useState("");
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [notes, setNotes] = useState("");

  const reset = () => {
    setStep(1); setLoanType(""); setPropertyTitle(""); setAmount(""); setTenure("20");
    setIncome(""); setExistingLoans(""); setExpenses(""); setCreditScore("");
    setFiles({}); setNotes("");
  };

  const canNext = () => {
    if (step === 1) return !!loanType;
    if (step === 2) return propertyTitle.trim().length > 0 && Number(amount) > 0;
    if (step === 3) return Number(income) > 0;
    return true;
  };

  const handleSubmit = async () => {
    if (!loanType) return;
    setBusy(true);
    try {
      const amt = Number(amount);
      const years = Number(tenure);
      const rate = 8.5;
      const monthly = amt && years
        ? (amt * (rate / 1200) * Math.pow(1 + rate / 1200, years * 12)) / (Math.pow(1 + rate / 1200, years * 12) - 1)
        : 0;
      const enquiry = await createEnquiry({
        loan_type: loanType,
        amount_requested: amt || undefined,
        loan_tenure_years: years || undefined,
        interest_rate_offered: rate,
        monthly_emi: monthly ? Math.round(monthly) : undefined,
        notes: [
          `Property: ${propertyTitle}`,
          income && `Income: ₹${income}`,
          existingLoans && `Existing Loans: ₹${existingLoans}`,
          expenses && `Expenses: ₹${expenses}`,
          creditScore && `Credit Score: ${creditScore}`,
          notes,
        ].filter(Boolean).join(" | "),
      });

      // Upload any selected documents
      for (const [type, f] of Object.entries(files)) {
        if (f) {
          try { await uploadDocument(enquiry.id, f, type); }
          catch (e: any) { toast.error(`${type} upload failed: ${e.message}`); }
        }
      }
      toast.success("Loan application submitted!");
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      toast.error(e.message || "Submission failed");
    } finally {
      setBusy(false);
    }
  };

  const progress = (step / 5) * 100;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); } onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply for a Loan</DialogTitle>
          <DialogDescription>Step {step} of 5</DialogDescription>
        </DialogHeader>
        <Progress value={progress} />

        {step === 1 && (
          <div className="grid sm:grid-cols-2 gap-3">
            {LOAN_TYPES.map((lt) => (
              <Card key={lt.value}
                onClick={() => setLoanType(lt.value)}
                className={`cursor-pointer transition ${loanType === lt.value ? "border-primary ring-1 ring-primary" : ""}`}>
                <CardContent className="p-4 flex gap-3 items-start">
                  <lt.icon className="h-6 w-6 text-primary mt-0.5" />
                  <div>
                    <div className="font-semibold text-sm">{lt.label}</div>
                    <div className="text-xs text-muted-foreground">{lt.desc}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div><Label>Property Title / Address</Label>
              <Input value={propertyTitle} onChange={(e) => setPropertyTitle(e.target.value)} placeholder="e.g. 3BHK in Gachibowli" maxLength={200} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Loan Amount (₹)</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div><Label>Tenure (years)</Label>
                <Input type="number" value={tenure} onChange={(e) => setTenure(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Monthly Income (₹)</Label>
              <Input type="number" value={income} onChange={(e) => setIncome(e.target.value)} />
            </div>
            <div><Label>Existing Loans (₹/month)</Label>
              <Input type="number" value={existingLoans} onChange={(e) => setExistingLoans(e.target.value)} />
            </div>
            <div><Label>Monthly Expenses (₹)</Label>
              <Input type="number" value={expenses} onChange={(e) => setExpenses(e.target.value)} />
            </div>
            <div><Label>Credit Score</Label>
              <Input type="number" value={creditScore} onChange={(e) => setCreditScore(e.target.value)} placeholder="e.g. 750" />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Upload supporting documents (optional — can submit later).</p>
            {DOC_TYPES.map((t) => (
              <div key={t} className="flex items-center justify-between border rounded p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{t}</div>
                    {files[t] && <div className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />{files[t]!.name}</div>}
                  </div>
                </div>
                <label className="cursor-pointer">
                  <input type="file" hidden accept="image/*,application/pdf"
                    onChange={(e) => setFiles((f) => ({ ...f, [t]: e.target.files?.[0] ?? null }))} />
                  <Button size="sm" variant="outline" asChild><span>Choose</span></Button>
                </label>
              </div>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3 text-sm">
            <h4 className="font-semibold">Review</h4>
            <Card><CardContent className="p-4 space-y-1">
              <div><span className="text-muted-foreground">Loan Type:</span> {LOAN_TYPES.find(l => l.value === loanType)?.label}</div>
              <div><span className="text-muted-foreground">Property:</span> {propertyTitle || "—"}</div>
              <div><span className="text-muted-foreground">Amount:</span> ₹{amount || 0} for {tenure} yrs</div>
              <div><span className="text-muted-foreground">Income:</span> ₹{income || 0}/mo</div>
              <div><span className="text-muted-foreground">Documents:</span> {Object.values(files).filter(Boolean).length} attached</div>
            </CardContent></Card>
            <div><Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
            </div>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="outline" disabled={step === 1 || busy} onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {step < 5 ? (
            <Button disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button disabled={busy} onClick={handleSubmit}>
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : "Submit Application"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LoanApplication;
