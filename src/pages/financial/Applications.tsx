import { useEffect, useState } from "react";
import FinancialLayout from "@/components/financial/FinancialLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CheckCircle2, Eye, FileText, XCircle, Clock } from "lucide-react";

type App = any;
const STATUS_COLOR: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  documents_pending: "bg-primary/10 text-primary border-border",
  under_review: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  approved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  rejected: "bg-red-500/20 text-red-300 border-red-500/40",
  disbursed: "bg-primary/10 text-primary border-border",
};
const DOC_TYPES = ["aadhaar", "pan", "salary_slips", "bank_statements", "itr", "property_documents"];

export default function FinancialApplications() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [selected, setSelected] = useState<App | null>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [rejectReason, setRejectReason] = useState("");
  const [disburseAmount, setDisburseAmount] = useState("");

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    const { data: prov } = await (supabase as any).from("financial_providers").select("id").eq("user_id", u.user.id).maybeSingle();
    if (!prov) { setLoading(false); return; }
    setProviderId(prov.id);
    const [{ data: a }, { data: t }] = await Promise.all([
      (supabase as any).from("financial_loan_applications").select("*").eq("provider_id", prov.id).order("created_at", { ascending: false }),
      (supabase as any).from("financial_team_members").select("id,name").eq("provider_id", prov.id).eq("is_active", true),
    ]);
    setApps(a ?? []); setTeam(t ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function openApp(a: App) {
    setSelected(a);
    const { data } = await (supabase as any).from("financial_loan_documents").select("*").eq("application_id", a.id);
    setDocs(data ?? []);
  }

  async function setStatus(status: string, extra: any = {}) {
    if (!selected) return;
    const upd: any = { status, ...extra, updated_at: new Date().toISOString() };
    if (status === "approved") upd.approved_at = new Date().toISOString();
    if (status === "rejected") upd.rejected_at = new Date().toISOString();
    if (status === "disbursed") upd.disbursed_at = new Date().toISOString();
    const { error } = await (supabase as any).from("financial_loan_applications").update(upd).eq("id", selected.id);
    if (error) { toast.error(error.message); return; }
    await (supabase as any).from("financial_notifications").insert({
      provider_id: providerId, title: `Application ${status}`,
      message: `${selected.buyer_name ?? "Customer"}'s application is now ${status}`, link: "/dashboard/financial/applications",
    });
    toast.success(`Marked ${status}`); setSelected(null); load();
  }

  async function assignRM(rmId: string) {
    if (!selected) return;
    const rm = team.find((t) => t.id === rmId);
    await (supabase as any).from("financial_loan_applications").update({
      assigned_rm_id: rmId, assigned_rm_name: rm?.name, updated_at: new Date().toISOString(),
    }).eq("id", selected.id);
    toast.success(`Assigned ${rm?.name}`);
    setSelected({ ...selected, assigned_rm_name: rm?.name });
  }

  async function docStatus(docId: string, status: string) {
    const { error } = await (supabase as any).rpc("update_financial_loan_document_status",
      { _document_id: docId, _status: status, _notes: null });
    if (error) { toast.error(error.message); return; }
    toast.success(`Document ${status}`);
    setDocs((d) => d.map((x) => x.id === docId ? { ...x, verified_status: status } : x));
  }

  async function ensureDoc(type: string) {
    if (!selected) return;
    const { data, error } = await (supabase as any).from("financial_loan_documents")
      .insert({ application_id: selected.id, document_type: type, verified_status: "missing" }).select().single();
    if (error) { toast.error(error.message); return; }
    setDocs((d) => [...d, data]);
    toast.success(`Requested ${type}`);
  }

  return (
    <FinancialLayout title="Loan Applications" subtitle="Manage active loan workflows">
      <Card className="border-border bg-card backdrop-blur-md">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? <Skeleton className="h-64 bg-card" /> : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-primary">ID</TableHead>
                  <TableHead className="text-primary">Customer</TableHead>
                  <TableHead className="text-primary">Loan Amount</TableHead>
                  <TableHead className="text-primary">Status</TableHead>
                  <TableHead className="text-primary">Assigned RM</TableHead>
                  <TableHead className="text-primary">Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No applications yet</TableCell></TableRow>
                ) : apps.map((a) => (
                  <TableRow key={a.id} className="border-border hover:bg-primary/10">
                    <TableCell className="font-mono text-xs">{a.id.slice(0, 8)}</TableCell>
                    <TableCell>{a.buyer_name ?? "—"}</TableCell>
                    <TableCell>₹{(Number(a.loan_amount) / 100000).toFixed(1)}L</TableCell>
                    <TableCell><Badge className={STATUS_COLOR[a.status]}>{a.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-foreground">{a.assigned_rm_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => openApp(a)} className="text-primary hover:bg-primary/10">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl bg-card border-border text-foreground max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-primary">Application #{selected.id.slice(0, 8)}</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="details">
                <TabsList className="bg-card">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="docs">Documents</TabsTrigger>
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="space-y-3 pt-4 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <Info label="Name" value={selected.buyer_name} />
                    <Info label="Phone" value={selected.buyer_phone} />
                    <Info label="Email" value={selected.buyer_email} />
                    <Info label="Property" value={selected.property_title} />
                    <Info label="Property Value" value={selected.property_value ? `₹${Number(selected.property_value).toLocaleString()}` : "—"} />
                    <Info label="Loan Amount" value={`₹${Number(selected.loan_amount).toLocaleString()}`} />
                    <Info label="Tenure (months)" value={selected.tenure_months} />
                    <Info label="Employment" value={selected.employment_type} />
                    <Info label="Monthly Income" value={selected.monthly_income ? `₹${Number(selected.monthly_income).toLocaleString()}` : "—"} />
                  </div>
                </TabsContent>
                <TabsContent value="docs" className="space-y-2 pt-4">
                  {DOC_TYPES.map((dt) => {
                    const d = docs.find((x) => x.document_type === dt);
                    return (
                      <div key={dt} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border bg-card">
                        <div className="flex items-center gap-2 capitalize">
                          <FileText className="h-4 w-4 text-primary" />
                          <span>{dt.replace("_", " ")}</span>
                          {d ? <Badge className={STATUS_COLOR[d.verified_status] || "bg-zinc-700"}>{d.verified_status}</Badge>
                            : <Badge variant="outline" className="border-border text-muted-foreground"><Clock className="h-3 w-3 mr-1" />Not requested</Badge>}
                        </div>
                        <div className="flex gap-1">
                          {!d && <Button size="sm" variant="outline" className="border-border" onClick={() => ensureDoc(dt)}>Request</Button>}
                          {d && d.file_path && <Button size="sm" variant="outline" onClick={() => window.open(d.file_path, "_blank")}>Download</Button>}
                          {d && <>
                            <Button size="sm" className="bg-emerald-600" onClick={() => docStatus(d.id, "verified")}><CheckCircle2 className="h-4 w-4" /></Button>
                            <Button size="sm" variant="destructive" onClick={() => docStatus(d.id, "rejected")}><XCircle className="h-4 w-4" /></Button>
                          </>}
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>
                <TabsContent value="actions" className="space-y-4 pt-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Assign Relationship Manager</p>
                    <Select onValueChange={assignRM}>
                      <SelectTrigger className="bg-card border-border"><SelectValue placeholder={selected.assigned_rm_name ?? "Select RM"} /></SelectTrigger>
                      <SelectContent>
                        {team.length === 0 ? <SelectItem value="none" disabled>No team members</SelectItem>
                          : team.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={() => setStatus("under_review")} variant="outline">Mark Under Review</Button>
                    <Button onClick={() => setStatus("documents_pending")} variant="outline">Request Documents</Button>
                    <Button onClick={() => setStatus("approved")} className="bg-emerald-600 hover:bg-emerald-700">Approve</Button>
                  </div>
                  <div className="space-y-2">
                    <Textarea placeholder="Rejection reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                      className="bg-card border-border" />
                    <Button variant="destructive" className="w-full" onClick={() => setStatus("rejected", { rejection_reason: rejectReason })}>Reject Application</Button>
                  </div>
                  {selected.status === "approved" && (
                    <div className="space-y-2 p-3 rounded-lg border border-border bg-primary/10">
                      <Input placeholder="Disbursed amount" type="number" value={disburseAmount}
                        onChange={(e) => setDisburseAmount(e.target.value)} className="bg-card border-border" />
                      <Button className="w-full bg-primary text-primary-foreground"
                        onClick={() => setStatus("disbursed", { disbursed_amount: Number(disburseAmount) })}>
                        Mark as Disbursed
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </FinancialLayout>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-foreground">{value ?? "—"}</p>
    </div>
  );
}
