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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  agentId: string;
  onCreated?: () => void;
}

const LOAN_TYPES = ["home_loan", "loan_against_property", "plot_loan", "construction_loan"];

export default function LoanApplicationDialog({ open, onClose, agentId, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    loan_type: "home_loan",
    amount_requested: "",
    buyer_name: "",
    buyer_phone: "",
    buyer_email: "",
    notes: "",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.loan_type || !form.amount_requested) {
      return toast.error("Loan type and amount are required");
    }
    setLoading(true);

    const { error } = await supabase.from("financial_enquiries").insert({
      advisor_id: agentId,
      loan_type: form.loan_type,
      amount_requested: Number(form.amount_requested),
      status: "new",
      notes: [
        form.buyer_name && `Buyer: ${form.buyer_name}`,
        form.buyer_phone && `Phone: ${form.buyer_phone}`,
        form.buyer_email && `Email: ${form.buyer_email}`,
        form.notes,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    setLoading(false);

    if (error) {
      console.error(error);
      return toast.error("Failed to create application");
    }
    toast.success("Loan application created");
    onCreated?.();
    onClose();
    setForm({
      loan_type: "home_loan",
      amount_requested: "",
      buyer_name: "",
      buyer_phone: "",
      buyer_email: "",
      notes: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Loan Application</DialogTitle>
          <DialogDescription>
            Submit a loan enquiry on behalf of your client.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Loan Type</Label>
            <Select value={form.loan_type} onValueChange={(v) => update("loan_type", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOAN_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Loan Amount (₹)</Label>
            <Input
              type="number"
              value={form.amount_requested}
              onChange={(e) => update("amount_requested", e.target.value)}
              placeholder="e.g. 2500000"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Buyer Name</Label>
              <Input
                value={form.buyer_name}
                onChange={(e) => update("buyer_name", e.target.value)}
              />
            </div>
            <div>
              <Label>Buyer Phone</Label>
              <Input
                value={form.buyer_phone}
                onChange={(e) => update("buyer_phone", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Buyer Email</Label>
            <Input
              type="email"
              value={form.buyer_email}
              onChange={(e) => update("buyer_email", e.target.value)}
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Additional details…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
