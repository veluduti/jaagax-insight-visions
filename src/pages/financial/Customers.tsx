import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FinancialLayout from "@/components/financial/FinancialLayout";
import { useFinancialProvider } from "@/hooks/useFinancialProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Eye, FileDown, Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_BADGE, STATUS_LABELS, exportCsv, inr, normalizeStatus, calcEMI } from "@/lib/loanWorkflow";

type Customer = {
  key: string; buyer_id: string | null; name: string; email: string; phone: string;
  apps: any[]; total: number; active: number; closed: number; lastAt: string;
};

export default function FinancialCustomers() {
  const { applications, loading } = useFinancialProvider();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Customer | null>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);

  const customers: Customer[] = useMemo(() => {
    const map = new Map<string, Customer>();
    applications.forEach((a) => {
      const key = a.buyer_id ?? a.buyer_email ?? a.customer_email ?? a.id;
      const c = map.get(key) ?? {
        key, buyer_id: a.buyer_id ?? null,
        name: a.buyer_name ?? a.customer_name ?? "Customer",
        email: a.buyer_email ?? a.customer_email ?? "—",
        phone: a.buyer_phone ?? a.customer_phone ?? "—",
        apps: [], total: 0, active: 0, closed: 0, lastAt: a.created_at,
      };
      c.apps.push(a);
      c.total += 1;
      if (["closed", "rejected"].includes(a.status)) c.closed += 1; else c.active += 1;
      if (new Date(a.updated_at ?? a.created_at) > new Date(c.lastAt)) c.lastAt = a.updated_at ?? a.created_at;
      map.set(key, c);
    });
    const list = [...map.values()];
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter((c) => [c.name, c.email, c.phone].some((v) => String(v).toLowerCase().includes(s)));
  }, [applications, q]);

  async function openCustomer(c: Customer) {
    setOpen(c);
    const ids = c.apps.map((a) => a.id);
    const [{ data: d }, { data: n }] = await Promise.all([
      (supabase as any).from("financial_loan_documents").select("*").in("application_id", ids),
      (supabase as any).from("financial_application_notes").select("*").in("application_id", ids).order("created_at", { ascending: false }),
    ]);
    setDocs(d ?? []); setNotes(n ?? []);
  }

  return (
    <FinancialLayout title="Customers" subtitle="Everyone who applied through your institution">
      <Card><CardContent className="p-4 flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search customers…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => exportCsv("customers", customers.map((c) => ({
          Name: c.name, Email: c.email, Phone: c.phone, Applications: c.total, Active: c.active, Closed: c.closed,
        })))}><FileDown className="h-4 w-4 mr-2" /> Export</Button>
      </CardContent></Card>

      <Card><CardContent className="p-0 overflow-x-auto">
        {loading ? <Skeleton className="h-64" /> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Customer</TableHead><TableHead>Contact</TableHead>
              <TableHead>Applications</TableHead><TableHead>Active</TableHead>
              <TableHead>Closed</TableHead><TableHead>Last activity</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No customers yet</TableCell></TableRow>
              ) : customers.map((c) => (
                <TableRow key={c.key} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</div>
                    <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</div>
                  </TableCell>
                  <TableCell>{c.total}</TableCell>
                  <TableCell>{c.active}</TableCell>
                  <TableCell>{c.closed}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(c.lastAt).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openCustomer(c)}><Eye className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{open?.name}</DialogTitle></DialogHeader>
          {open && (
            <div className="space-y-5">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Personal Information</CardTitle></CardHeader>
                <CardContent className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Name</span><div>{open.name}</div></div>
                  <div><span className="text-muted-foreground">Phone</span><div>{open.phone}</div></div>
                  <div><span className="text-muted-foreground">Email</span><div>{open.email}</div></div>
                </CardContent></Card>

              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Loan History</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {open.apps.map((a) => {
                    const s = normalizeStatus(a.status);
                    const emi = a.emi_amount ?? calcEMI(a.sanction_amount ?? a.loan_amount, a.interest_rate, a.tenure_months);
                    return (
                      <div key={a.id} className="flex items-center justify-between border border-border rounded-lg p-3 text-sm">
                        <div>
                          <div className="font-medium">{inr(a.loan_amount)} · <span className="capitalize">{(a.loan_type ?? "home loan").replace(/_/g, " ")}</span></div>
                          <div className="text-xs text-muted-foreground">
                            {a.tenure_months ? `${Math.round(a.tenure_months / 12)} yrs · ` : ""}
                            EMI {emi ? inr(emi) : "—"} · {new Date(a.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={STATUS_BADGE[s]}>{STATUS_LABELS[s]}</Badge>
                          <Link to={`/dashboard/financial/applications/${a.id}`}>
                            <Button size="sm" variant="ghost">Open</Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </CardContent></Card>

              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Uploaded Documents</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {docs.length === 0 && <p className="text-muted-foreground">No documents.</p>}
                  {docs.map((d) => (
                    <div key={d.id} className="flex justify-between">
                      <span className="capitalize">{d.document_type.replace(/_/g, " ")}</span>
                      <Badge variant="outline" className="capitalize">{d.verified_status}</Badge>
                    </div>
                  ))}
                </CardContent></Card>

              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Communication & Internal Notes</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {notes.length === 0 && <p className="text-muted-foreground">No notes recorded.</p>}
                  {notes.map((n) => (
                    <div key={n.id} className="border-l-2 border-primary/40 pl-3">
                      <p>{n.note}</p>
                      <p className="text-xs text-muted-foreground">{n.author_name ?? "Staff"} · {new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </CardContent></Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </FinancialLayout>
  );
}
