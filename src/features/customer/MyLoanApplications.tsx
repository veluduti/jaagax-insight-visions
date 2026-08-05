import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Banknote, CheckCircle2, Clock, FileText, RefreshCw, Search, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

type LoanApp = {
  id: string;
  status: string;
  loan_amount: number | null;
  tenure_months: number | null;
  property_title: string | null;
  rejection_reason: string | null;
  disbursed_amount: number | null;
  assigned_rm_name: string | null;
  created_at: string;
  updated_at: string;
  provider_id: string;
};

const STEPS = [
  { key: "new", label: "Request submitted", icon: FileText },
  { key: "accepted", label: "Accepted by lender", icon: CheckCircle2 },
  { key: "documents_pending", label: "Documents & verification", icon: Clock },
  { key: "under_review", label: "Under review", icon: Search },
  { key: "approved", label: "Approved", icon: CheckCircle2 },
  { key: "disbursed", label: "Loan granted", icon: Banknote },
];

const ORDER: Record<string, number> = {
  new: 0, accepted: 1, documents_pending: 2, under_review: 3, approved: 4, disbursed: 5, rejected: 4,
};

const STATUS_LABEL: Record<string, string> = {
  new: "Awaiting lender",
  accepted: "Accepted",
  documents_pending: "Documents pending",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Not approved",
  disbursed: "Loan granted",
};

const inr = (n?: number | null) =>
  n ? `₹${Number(n).toLocaleString("en-IN")}` : "—";

export default function MyLoanApplications() {
  const [apps, setApps] = useState<LoanApp[]>([]);
  const [lenders, setLenders] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    const { data } = await (supabase as any)
      .from("financial_loan_applications")
      .select("*")
      .eq("buyer_id", u.user.id)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as LoanApp[];
    setApps(rows);
    const ids = [...new Set(rows.map((r) => r.provider_id).filter(Boolean))];
    if (ids.length) {
      const { data: provs } = await (supabase as any)
        .from("financial_providers")
        .select("id,company_name")
        .in("id", ids);
      const map: Record<string, string> = {};
      (provs ?? []).forEach((p: any) => { map[p.id] = p.company_name ?? "Lending partner"; });
      setLenders(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("my-loan-apps")
      .on("postgres_changes", { event: "*", schema: "public", table: "financial_loan_applications" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  if (loading) return <Skeleton className="h-64 w-full" />;

  if (apps.length === 0) {
    return (
      <Card>
        <CardContent className="py-14 text-center space-y-4">
          <Banknote className="h-10 w-10 mx-auto text-primary" />
          <div>
            <p className="font-semibold">No loan applications yet</p>
            <p className="text-sm text-muted-foreground">
              Apply for a home loan and track approval progress right here.
            </p>
          </div>
          <Button onClick={() => navigate("/smart-financing")}>Apply for Home Loan</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-semibold">My Loan Applications</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button size="sm" onClick={() => navigate("/smart-financing")}>New Application</Button>
        </div>
      </div>

      {apps.map((a) => {
        const idx = ORDER[a.status] ?? 0;
        const rejected = a.status === "rejected";
        return (
          <Card key={a.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-base">
                    {lenders[a.provider_id] ?? "Lending partner"} · {inr(a.loan_amount)}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {a.property_title ? `${a.property_title} · ` : ""}
                    {a.tenure_months ? `${Math.round(a.tenure_months / 12)} yrs · ` : ""}
                    Applied {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={rejected ? "destructive" : a.status === "disbursed" || a.status === "approved" ? "default" : "secondary"}>
                  {STATUS_LABEL[a.status] ?? a.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3">
                {STEPS.map((step, i) => {
                  if (rejected && i === 4) {
                    return (
                      <div key="rej" className="flex items-start gap-3">
                        <div className="p-1.5 rounded-full bg-destructive/15 text-destructive">
                          <XCircle className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-destructive">Not approved</div>
                          {a.rejection_reason && (
                            <div className="text-xs text-muted-foreground mt-0.5">{a.rejection_reason}</div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  if (rejected && i > 4) return null;
                  const done = i <= idx;
                  const active = i === idx;
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-full ${done ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${done ? "" : "text-muted-foreground"}`}>{step.label}</div>
                        {active && <Badge variant="outline" className="mt-1 text-xs">Current</Badge>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {a.status === "disbursed" && (
                <div className="rounded-lg border border-border bg-primary/5 p-3 text-sm">
                  Loan granted: <b>{inr(a.disbursed_amount ?? a.loan_amount)}</b>
                </div>
              )}
              {a.assigned_rm_name && (
                <p className="text-xs text-muted-foreground">Relationship manager: {a.assigned_rm_name}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Last updated {new Date(a.updated_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
