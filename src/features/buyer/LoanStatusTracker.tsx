import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, FileText, XCircle, Banknote, AlertCircle } from "lucide-react";

const STEPS = [
  { key: "applied", label: "Application Submitted", icon: FileText },
  { key: "documents_pending", label: "Document Verification", icon: AlertCircle },
  { key: "under_review", label: "Processing", icon: Clock },
  { key: "approved", label: "Approved", icon: CheckCircle2 },
  { key: "disbursed", label: "Disbursement", icon: Banknote },
];

const ORDER: Record<string, number> = {
  applied: 0, documents_pending: 1, under_review: 2, approved: 3, rejected: 3, disbursed: 4, deactivated: -1,
};

export function LoanStatusTracker({ status, updatedAt, notes }: { status: string; updatedAt: string; notes?: string | null }) {
  const idx = ORDER[status] ?? 0;
  const isRejected = status === "rejected";
  const isDeactivated = status === "deactivated";

  if (isDeactivated) {
    return (
      <Card><CardContent className="p-4 flex items-center gap-3 text-muted-foreground">
        <XCircle className="h-5 w-5" /> This enquiry has been deactivated.
      </CardContent></Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h4 className="text-sm font-semibold">Application Timeline</h4>
        <div className="space-y-3">
          {STEPS.map((step, i) => {
            const done = i <= idx && !isRejected;
            const active = i === idx;
            const Icon = step.icon;
            if (isRejected && i === 3) {
              return (
                <div key="rejected" className="flex items-start gap-3">
                  <div className="p-1.5 rounded-full bg-rose-100 text-rose-700"><XCircle className="h-4 w-4" /></div>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-rose-700">Rejected</div>
                    <div className="text-xs text-muted-foreground">{new Date(updatedAt).toLocaleDateString()}</div>
                    {notes && <div className="text-xs text-muted-foreground mt-1">{notes}</div>}
                  </div>
                </div>
              );
            }
            return (
              <div key={step.key} className="flex items-start gap-3">
                <div className={`p-1.5 rounded-full ${done ? "bg-emerald-100 text-emerald-700" : active ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className={`font-medium text-sm ${done ? "" : "text-muted-foreground"}`}>{step.label}</div>
                  {active && <Badge variant="outline" className="mt-1 text-xs">Current</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default LoanStatusTracker;
