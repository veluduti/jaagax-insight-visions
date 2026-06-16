import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertCircle, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LoanApplicationDialogProps {
  open: boolean;
  onClose: () => void;
  agentId?: string;
  userId?: string;
  onCreated?: () => void;
}

const LOAN_TYPES = [
  { value: "home_loan", label: "Home Loan" },
  { value: "loan_against_property", label: "Loan Against Property" },
  { value: "plot_loan", label: "Plot Loan" },
  { value: "construction_loan", label: "Construction Loan" },
  { value: "business_loan", label: "Business Loan" },
  { value: "personal_loan", label: "Personal Loan" },
];

const EMPLOYMENT_TYPES = [
  { value: "salaried", label: "Salaried" },
  { value: "self_employed", label: "Self Employed" },
  { value: "business", label: "Business" },
  { value: "retired", label: "Retired" },
];

export default function LoanApplicationDialog({
  open,
  onClose,
  agentId,
  userId,
  onCreated,
}: LoanApplicationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    loan_type: "home_loan",
    amount_requested: "",
    buyer_name: "",
    buyer_phone: "",
    buyer_email: "",
    employment_type: "",
    monthly_income: "",
    property_address: "",
    notes: "",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const reset = () => {
    setForm({
      loan_type: "home_loan",
      amount_requested: "",
      buyer_name: "",
      buyer_phone: "",
      buyer_email: "",
      employment_type: "",
      monthly_income: "",
      property_address: "",
      notes: "",
    });
  };

  const submit = async () => {
    if (!form.loan_type) {
      return toast.error("Please select a loan type");
    }
    if (!form.amount_requested || Number(form.amount_requested) <= 0) {
      return toast.error("Please enter a valid loan amount");
    }
    if (!form.buyer_name.trim()) {
      return toast.error("Please enter buyer's name");
    }

    setLoading(true);

    const payload: any = {
      loan_type: form.loan_type,
      amount_requested: Number(form.amount_requested),
      buyer_name: form.buyer_name.trim(),
      buyer_phone: form.buyer_phone || null,
      buyer_email: form.buyer_email || null,
      employment_type: form.employment_type || null,
      monthly_income: form.monthly_income ? Number(form.monthly_income) : null,
      property_address: form.property_address || null,
      notes: form.notes || null,
      status: "new",
    };

    if (agentId) {
      payload.advisor_id = agentId;
    }
    if (userId) {
      payload.user_id = userId;
    }

    try {
      const { error } = await supabase.from("financial_enquiries").insert(payload);

      if (error) throw error;

      toast.success("Loan application created successfully!");
      reset();
      onCreated?.();
      onClose();
    } catch (error: any) {
      console.error("Error creating loan application:", error);
      toast.error(error.message || "Failed to create application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            New Loan Application
          </DialogTitle>
          <DialogDescription>
            Submit a loan enquiry on behalf of your client. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Loan Type */}
          <div>
            <Label className="text-xs font-medium">Loan Type *</Label>
            <Select value={form.loan_type} onValueChange={(v) => update("loan_type", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOAN_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Loan Amount */}
          <div>
            <Label className="text-xs font-medium">Loan Amount (₹) *</Label>
            <Input
              type="number"
              min={100000}
              step={100000}
              value={form.amount_requested}
              onChange={(e) => update("amount_requested", e.target.value)}
              placeholder="e.g. 2500000"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Min: ₹1,00,000</p>
          </div>

          {/* Buyer Information */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Buyer Information</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Full Name *</Label>
                <Input
                  value={form.buyer_name}
                  onChange={(e) => update("buyer_name", e.target.value)}
                  placeholder="Buyer name"
                />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input
                  value={form.buyer_phone}
                  onChange={(e) => update("buyer_phone", e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={form.buyer_email}
                onChange={(e) => update("buyer_email", e.target.value)}
                placeholder="buyer@email.com"
              />
            </div>
          </div>

          {/* Employment Details */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Employment Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Employment Type</Label>
                <Select value={form.employment_type} onValueChange={(v) => update("employment_type", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Monthly Income (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  step={10000}
                  value={form.monthly_income}
                  onChange={(e) => update("monthly_income", e.target.value)}
                  placeholder="e.g. 150000"
                />
              </div>
            </div>
          </div>

          {/* Property Address */}
          <div>
            <Label className="text-xs font-medium">Property Address</Label>
            <Input
              value={form.property_address}
              onChange={(e) => update("property_address", e.target.value)}
              placeholder="Address of the property to be financed"
            />
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs font-medium">Additional Notes</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Any additional details about the client or property..."
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              The application will be reviewed by our financial team. You'll be notified on status updates.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Application"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
