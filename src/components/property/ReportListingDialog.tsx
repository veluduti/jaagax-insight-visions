import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  propertyId: string;
  trigger?: React.ReactNode;
}

const REASONS = [
  { value: "fake", label: "Fake listing" },
  { value: "wrong_info", label: "Wrong information" },
  { value: "spam", label: "Spam / Duplicate" },
  { value: "other", label: "Other" },
];

const ReportListingDialog = ({ propertyId, trigger }: Props) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("fake");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      toast.error("Please sign in to report a listing");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("property_reports" as any).insert({
      property_id: propertyId,
      reported_by: auth.user.id,
      reason,
      details: details.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Could not submit report");
      return;
    }
    toast.success("Thanks — our team will review this listing");
    setOpen(false);
    setDetails("");
    setReason("fake");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2 text-destructive">
            <Flag className="h-4 w-4" /> Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this listing</DialogTitle>
          <DialogDescription>
            Help us keep JaagaX safe. Tell us what's wrong with this property.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <RadioGroup value={reason} onValueChange={setReason}>
            {REASONS.map((r) => (
              <div key={r.value} className="flex items-center gap-2">
                <RadioGroupItem value={r.value} id={`r-${r.value}`} />
                <Label htmlFor={`r-${r.value}`} className="cursor-pointer">{r.label}</Label>
              </div>
            ))}
          </RadioGroup>
          <div>
            <Label htmlFor="report-details">Additional details (optional)</Label>
            <Textarea
              id="report-details"
              placeholder="Tell us more..."
              maxLength={500}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting} variant="destructive">
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportListingDialog;
