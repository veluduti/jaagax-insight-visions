// Central loan application workflow definition shared by the Financial Provider
// dashboard and the Customer loan tracker.

export type LoanStatus =
  | "new"
  | "documents_pending"
  | "under_verification"
  | "credit_check"
  | "approved"
  | "disbursed"
  | "closed"
  | "rejected";

export const LOAN_FLOW: LoanStatus[] = [
  "new",
  "documents_pending",
  "under_verification",
  "credit_check",
  "approved",
  "disbursed",
  "closed",
];

export const STATUS_LABELS: Record<string, string> = {
  new: "New",
  accepted: "New",
  documents_pending: "Documents Pending",
  documents_received: "Documents Received",
  under_verification: "Under Verification",
  under_review: "Under Verification",
  credit_check: "Credit Check",
  bank_review: "Credit Check",
  sanctioned: "Approved",
  approved: "Approved",
  disbursed: "Disbursed",
  closed: "Closed",
  rejected: "Rejected",
};

/** Normalise any legacy status value onto the canonical workflow. */
export function normalizeStatus(status?: string | null): LoanStatus {
  switch (status) {
    case "accepted":
      return "new";
    case "documents_received":
      return "documents_pending";
    case "under_review":
      return "under_verification";
    case "bank_review":
      return "credit_check";
    case "sanctioned":
      return "approved";
    default:
      return (LOAN_FLOW.includes(status as LoanStatus) || status === "rejected"
        ? status
        : "new") as LoanStatus;
  }
}

export function stageIndex(status?: string | null): number {
  const s = normalizeStatus(status);
  if (s === "rejected") return LOAN_FLOW.indexOf("credit_check");
  return Math.max(0, LOAN_FLOW.indexOf(s));
}

export function nextStatus(status?: string | null): LoanStatus | null {
  const i = LOAN_FLOW.indexOf(normalizeStatus(status));
  if (i < 0 || i >= LOAN_FLOW.length - 1) return null;
  return LOAN_FLOW[i + 1];
}

export const STATUS_BADGE: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  documents_pending: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  under_verification: "bg-purple-500/15 text-purple-500 border-purple-500/30",
  credit_check: "bg-indigo-500/15 text-indigo-500 border-indigo-500/30",
  approved: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  disbursed: "bg-green-600/15 text-green-500 border-green-600/30",
  closed: "bg-muted text-muted-foreground border-border",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
};

export const REQUIRED_DOC_TYPES = [
  "aadhaar",
  "pan",
  "salary_slips",
  "bank_statements",
  "itr",
  "property_documents",
  "photo",
  "address_proof",
];

export const inr = (n?: number | null) =>
  n === null || n === undefined || Number.isNaN(Number(n))
    ? "—"
    : `₹${Number(n).toLocaleString("en-IN")}`;

export const lakhs = (n?: number | null) =>
  !n ? "—" : `₹${(Number(n) / 100000).toFixed(1)}L`;

export function calcEMI(principal?: number | null, annualRate?: number | null, months?: number | null) {
  const p = Number(principal || 0);
  const r = Number(annualRate || 0) / 12 / 100;
  const n = Number(months || 0);
  if (!p || !r || !n) return 0;
  return Math.round((p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

/** Downloads rows as a CSV file (opens directly in Excel). */
export function exportCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
