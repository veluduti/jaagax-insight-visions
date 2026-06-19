import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, { label: string; tone: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", tone: "outline" },
  submitted: { label: "Submitted", tone: "secondary" },
  pending_admin_review: { label: "Pending Admin Review", tone: "secondary" },
  agent_assigned: { label: "Agent Assigned", tone: "secondary" },
  agent_accepted: { label: "Agent Accepted (locked)", tone: "secondary" },
  agent_rejected: { label: "Agent Rejected", tone: "destructive" },
  visit_scheduled: { label: "Visit Scheduled", tone: "secondary" },
  under_verification: { label: "Under Verification", tone: "secondary" },
  verification_submitted: { label: "Verification Submitted", tone: "secondary" },
  pending_final_approval: { label: "Pending Final Approval", tone: "secondary" },
  live: { label: "Live", tone: "default" },
  live_verified: { label: "Live · Verified", tone: "default" },
  expired: { label: "Expired", tone: "destructive" },
  renewed: { label: "Renewed", tone: "secondary" },
  rejected: { label: "Rejected", tone: "destructive" },
  cancelled_by_owner: { label: "Cancelled", tone: "outline" },
};

export function PropertyStatusBadge({ status }: { status?: string | null }) {
  const cfg = LABELS[status ?? ""] ?? { label: status ?? "Unknown", tone: "outline" as const };
  return <Badge variant={cfg.tone}>{cfg.label}</Badge>;
}
