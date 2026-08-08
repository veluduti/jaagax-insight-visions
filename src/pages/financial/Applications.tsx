import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import FinancialLayout from "@/components/financial/FinancialLayout";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialProvider } from "@/hooks/useFinancialProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Search, FileDown, CheckCircle2, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  LOAN_FLOW, STATUS_BADGE, STATUS_LABELS, normalizeStatus, lakhs, exportCsv,
} from "@/lib/loanWorkflow";

export default function FinancialApplications() {
  const { applications, loading, reload } = useFinancialProvider();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [docCounts, setDocCounts] = useState<Record<string, { total: number; verified: number }>>({});

  const status = params.get("status") ?? "all";
  const month = params.get("month") ?? "all";
  const customer = params.get("customer") ?? "";

  useEffect(() => {
    if (!applications.length) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("financial_loan_documents")
        .select("application_id,verified_status")
        .in("application_id", applications.map((a) => a.id));
      const map: Record<string, { total: number; verified: number }> = {};
      (data ?? []).forEach((d: any) => {
        map[d.application_id] ??= { total: 0, verified: 0 };
        map[d.application_id].total += 1;
        if (d.verified_status === "verified") map[d.application_id].verified += 1;
      });
      setDocCounts(map);
    })();
  }, [applications]);

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (!v || v === "all") next.delete(k); else next.set(k, v);
    setParams(next, { replace: true });
  };

  const rows = useMemo(() => {
    let list = applications;
    if (status !== "all") list = list.filter((a) => normalizeStatus(a.status) === status);
    if (month !== "all") list = list.filter((a) => String(a.created_at).slice(0, 7) === month);
    if (customer) list = list.filter((a) => (a.buyer_id ?? "") === customer);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((a) =>
        [a.buyer_name, a.customer_name, a.buyer_email, a.customer_email, a.buyer_phone, a.customer_phone, a.loan_type, a.id]
          .filter(Boolean).some((v: string) => String(v).toLowerCase().includes(s)));
    }
    return list;
  }, [applications, status, month, customer, q]);

  const months = useMemo(() => {
    const set = new Set(applications.map((a) => String(a.created_at).slice(0, 7)));
    return [...set].sort().reverse();
  }, [applications]);

  async function quickStatus(app: any, next: string) {
    const patch: any = { status: next };
    if (next === "approved") patch.approved_at = new Date().toISOString();
    if (next === "rejected") patch.rejected_at = new Date().toISOString();
    const { error } = await (supabase as any)
      .from("financial_loan_applications").update(patch).eq("id", app.id);
    if (error) return toast.error(error.message);
    supabase.functions.invoke("notify-loan-status", { body: { application_id: app.id, status: next } }).catch(() => {});
    toast.success(`Marked ${STATUS_LABELS[next]}`);
    reload();
  }

  async function requestDocuments(app: any) {
    const { error } = await (supabase as any).from("financial_loan_applications")
      .update({ status: "documents_pending", documents_request_reason: "Additional documents required to proceed" })
      .eq("id", app.id);
    if (error) return toast.error(error.message);
    toast.success("Documents requested from customer");
    reload();
  }

  return (
    <FinancialLayout title="Loan Management" subtitle="Search, filter and process every loan application">
      <Card className="border-border bg-card">
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search name, email, phone, ID…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={status} onValueChange={(v) => setParam("status", v)}>
            <SelectTrigger className="w-[190px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {[...LOAN_FLOW, "rejected"].map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={month} onValueChange={(v) => setParam("month", v)}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {new Date(`${m}-01`).toLocaleString("default", { month: "long", year: "numeric" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => exportCsv("loan-applications", rows.map((a) => ({
            ID: a.id, Customer: a.buyer_name ?? a.customer_name, Phone: a.buyer_phone ?? a.customer_phone,
            Email: a.buyer_email ?? a.customer_email, Amount: a.loan_amount, Type: a.loan_type,
            Status: STATUS_LABELS[normalizeStatus(a.status)], RM: a.assigned_rm_name ?? "",
            Created: a.created_at, Updated: a.updated_at,
          })))}>
            <FileDown className="h-4 w-4 mr-2" /> Export
          </Button>
          {customer && (
            <Button variant="ghost" onClick={() => setParam("customer", "")}>Clear customer filter</Button>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? <Skeleton className="h-64" /> : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Loan</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Staff</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No applications found</TableCell></TableRow>
                ) : rows.map((a) => {
                  const s = normalizeStatus(a.status);
                  const d = docCounts[a.id];
                  return (
                    <TableRow key={a.id} className="border-border hover:bg-muted/30">
                      <TableCell className="font-mono text-xs">
                        <Link className="text-primary" to={`/dashboard/financial/applications/${a.id}`}>
                          {a.id.slice(0, 8).toUpperCase()}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{a.buyer_name ?? a.customer_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{a.buyer_phone ?? a.customer_phone ?? "—"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{lakhs(a.loan_amount)}</div>
                        <div className="text-xs text-muted-foreground capitalize">{(a.loan_type ?? "home loan").replace(/_/g, " ")}</div>
                      </TableCell>
                      <TableCell className="text-xs">{d ? `${d.verified}/${d.total} verified` : "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={STATUS_BADGE[s]}>{STATUS_LABELS[s]}</Badge></TableCell>
                      <TableCell className="text-sm">{a.assigned_rm_name ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(a.updated_at ?? a.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Link to={`/dashboard/financial/applications/${a.id}`}>
                          <Button size="icon" variant="ghost" title="View"><Eye className="h-4 w-4" /></Button>
                        </Link>
                        <Button size="icon" variant="ghost" title="Request documents" onClick={() => requestDocuments(a)}>
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Approve" onClick={() => quickStatus(a, "approved")}>
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Reject" onClick={() => quickStatus(a, "rejected")}>
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </FinancialLayout>
  );
}
