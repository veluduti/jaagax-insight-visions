import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import FinancialLayout from "@/components/financial/FinancialLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle2, XCircle, FileText, Mail, Phone, IndianRupee, Clock,
  ShieldCheck, Download, Plus, StickyNote,
} from "lucide-react";
import {
  LOAN_FLOW, REQUIRED_DOC_TYPES, STATUS_BADGE, STATUS_LABELS, calcEMI, inr, normalizeStatus,
} from "@/lib/loanWorkflow";

export default function FinancialApplicationDetail() {
  const { id } = useParams();
  const [app, setApp] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [reason, setReason] = useState("");
  const [docType, setDocType] = useState(REQUIRED_DOC_TYPES[0]);
  const [terms, setTerms] = useState({ interest_rate: "", processing_fee: "", sanction_amount: "", tenure_months: "", disbursed_amount: "" });

  const load = useCallback(async () => {
    if (!id) return;
    const [{ data: a }, { data: d }, { data: e }, { data: n }] = await Promise.all([
      (supabase as any).from("financial_loan_applications").select("*").eq("id", id).maybeSingle(),
      (supabase as any).from("financial_loan_documents").select("*").eq("application_id", id).order("uploaded_at"),
      (supabase as any).from("financial_application_events").select("*").eq("application_id", id).order("created_at", { ascending: false }),
      (supabase as any).from("financial_application_notes").select("*").eq("application_id", id).order("created_at", { ascending: false }),
    ]);
    setApp(a); setDocs(d ?? []); setEvents(e ?? []); setNotes(n ?? []);
    if (a) {
      setTerms({
        interest_rate: a.interest_rate ?? "", processing_fee: a.processing_fee ?? "",
        sanction_amount: a.sanction_amount ?? "", tenure_months: a.tenure_months ?? "",
        disbursed_amount: a.disbursed_amount ?? "",
      });
      const { data: t } = await (supabase as any).from("financial_team_members")
        .select("id,name").eq("provider_id", a.provider_id);
      setTeam(t ?? []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`fin-app-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "financial_loan_applications", filter: `id=eq.${id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "financial_loan_documents" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, load]);

  async function patch(update: any, msg = "Updated") {
    const { error } = await (supabase as any).from("financial_loan_applications").update(update).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(msg);
    load();
  }

  async function changeStatus(status: string, extra: any = {}) {
    const now = new Date().toISOString();
    const stamp: any = { approved: { approved_at: now }, rejected: { rejected_at: now }, disbursed: { disbursed_at: now }, closed: { closed_at: now } }[status] ?? {};
    await patch({ status, ...stamp, ...extra }, `Status set to ${STATUS_LABELS[status] ?? status}`);
    supabase.functions.invoke("notify-loan-status", { body: { application_id: id, status } }).catch(() => {});
  }

  async function verifyDoc(docId: string, verified_status: string) {
    const { error } = await (supabase as any).from("financial_loan_documents")
      .update({ verified_status }).eq("id", docId);
    if (error) return toast.error(error.message);
    toast.success(`Document ${verified_status}`);
    load();
  }

  async function requestDoc() {
    const { error } = await (supabase as any).from("financial_loan_documents").insert({
      application_id: id, document_type: docType, verified_status: "missing", request_reason: reason || null,
    });
    if (error) return toast.error(error.message);
    await patch({ status: "documents_pending", documents_request_reason: reason || `Please upload ${docType.replace(/_/g, " ")}` }, "Document requested");
    setReason("");
  }

  async function addNote() {
    if (!noteText.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("financial_application_notes").insert({
      application_id: id, note: noteText.trim(), author_id: u.user?.id,
      author_name: (u.user?.user_metadata as any)?.full_name ?? u.user?.email,
    });
    if (error) return toast.error(error.message);
    setNoteText(""); load();
  }

  async function saveTerms() {
    await patch({
      interest_rate: terms.interest_rate === "" ? null : Number(terms.interest_rate),
      processing_fee: terms.processing_fee === "" ? null : Number(terms.processing_fee),
      sanction_amount: terms.sanction_amount === "" ? null : Number(terms.sanction_amount),
      tenure_months: terms.tenure_months === "" ? null : Number(terms.tenure_months),
      disbursed_amount: terms.disbursed_amount === "" ? null : Number(terms.disbursed_amount),
      emi_amount: calcEMI(Number(terms.sanction_amount || app?.loan_amount), Number(terms.interest_rate), Number(terms.tenure_months || app?.tenure_months)) || null,
    }, "Loan terms saved");
  }

  if (loading) return <FinancialLayout title="Loan Profile"><Skeleton className="h-96" /></FinancialLayout>;
  if (!app) return <FinancialLayout title="Loan Profile"><p className="text-muted-foreground">Application not found.</p></FinancialLayout>;

  const s = normalizeStatus(app.status);
  const name = app.buyer_name ?? app.customer_name ?? "Customer";

  return (
    <FinancialLayout title={`Loan Profile · ${name}`} subtitle={`Application ${app.id.slice(0, 8).toUpperCase()}`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link to="/dashboard/financial/applications">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" /> Back to applications</Button>
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={STATUS_BADGE[s]}>{STATUS_LABELS[s]}</Badge>
          <Select value={s} onValueChange={(v) => changeStatus(v)}>
            <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[...LOAN_FLOW, "rejected"].map((x) => <SelectItem key={x} value={x}>{STATUS_LABELS[x]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => changeStatus("approved")}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="destructive" onClick={() => {
            const r = window.prompt("Rejection reason") ?? "";
            if (r) changeStatus("rejected", { rejection_reason: r });
          }}>
            <XCircle className="h-4 w-4 mr-1" /> Reject
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Customer Information</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Name</span><div className="font-medium">{name}</div></div>
              <div><span className="text-muted-foreground">Phone</span>
                <div className="font-medium flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{app.buyer_phone ?? app.customer_phone ?? "—"}</div></div>
              <div><span className="text-muted-foreground">Email</span>
                <div className="font-medium flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{app.buyer_email ?? app.customer_email ?? "—"}</div></div>
              <div><span className="text-muted-foreground">Monthly income</span><div className="font-medium">{inr(app.monthly_income)}</div></div>
            </CardContent>
          </Card>

          {/* Loan info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Loan Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <div><span className="text-muted-foreground">Requested</span><div className="font-medium">{inr(app.loan_amount)}</div></div>
                <div><span className="text-muted-foreground">Type</span><div className="font-medium capitalize">{(app.loan_type ?? "home loan").replace(/_/g, " ")}</div></div>
                <div><span className="text-muted-foreground">Property</span><div className="font-medium">{app.property_title ?? "—"}</div></div>
                <div><span className="text-muted-foreground">Property value</span><div className="font-medium">{inr(app.property_value)}</div></div>
                <div><span className="text-muted-foreground">EMI</span><div className="font-medium">{inr(app.emi_amount)}</div></div>
                <div><span className="text-muted-foreground">Applied on</span><div className="font-medium">{new Date(app.created_at).toLocaleDateString()}</div></div>
              </div>
              <Separator />
              <div className="grid sm:grid-cols-5 gap-3">
                <div><Label className="text-xs">Interest %</Label><Input value={terms.interest_rate} onChange={(e) => setTerms({ ...terms, interest_rate: e.target.value })} /></div>
                <div><Label className="text-xs">Processing fee</Label><Input value={terms.processing_fee} onChange={(e) => setTerms({ ...terms, processing_fee: e.target.value })} /></div>
                <div><Label className="text-xs">Sanction amt</Label><Input value={terms.sanction_amount} onChange={(e) => setTerms({ ...terms, sanction_amount: e.target.value })} /></div>
                <div><Label className="text-xs">Tenure (months)</Label><Input value={terms.tenure_months} onChange={(e) => setTerms({ ...terms, tenure_months: e.target.value })} /></div>
                <div><Label className="text-xs">Disbursed amt</Label><Input value={terms.disbursed_amount} onChange={(e) => setTerms({ ...terms, disbursed_amount: e.target.value })} /></div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveTerms}><IndianRupee className="h-4 w-4 mr-1" /> Save loan terms</Button>
                <Select value={app.assigned_rm_id ?? ""} onValueChange={(v) => {
                  const rm = team.find((t) => t.id === v);
                  patch({ assigned_rm_id: v, assigned_rm_name: rm?.name, assigned_rm: rm?.name }, `Assigned ${rm?.name}`);
                }}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder={app.assigned_rm_name ?? "Assign staff"} /></SelectTrigger>
                  <SelectContent>
                    {team.length === 0 ? <SelectItem value="none" disabled>No staff added</SelectItem>
                      : team.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Uploaded Documents</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {docs.length === 0 && <p className="text-sm text-muted-foreground">No documents yet.</p>}
              {docs.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 border border-border rounded-lg p-3">
                  <div>
                    <p className="font-medium capitalize text-sm">{d.document_type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.verified_status === "missing" ? "Requested from customer" : `Uploaded ${new Date(d.uploaded_at).toLocaleDateString()}`}
                      {d.request_reason ? ` · ${d.request_reason}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{d.verified_status}</Badge>
                    {(d.file_url || d.file_path) && (
                      <a href={d.file_url ?? d.file_path} target="_blank" rel="noreferrer">
                        <Button size="icon" variant="ghost"><Download className="h-4 w-4" /></Button>
                      </a>
                    )}
                    <Button size="icon" variant="ghost" title="Verify" onClick={() => verifyDoc(d.id, "verified")}>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Reject" onClick={() => verifyDoc(d.id, "rejected")}>
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              <Separator />
              <div className="flex flex-wrap gap-2 items-end">
                <div className="min-w-[180px]">
                  <Label className="text-xs">Request document</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REQUIRED_DOC_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Input className="flex-1 min-w-[200px]" placeholder="Reason shown to customer" value={reason} onChange={(e) => setReason(e.target.value)} />
                <Button onClick={requestDoc}><Plus className="h-4 w-4 mr-1" /> Request</Button>
              </div>
            </CardContent>
          </Card>

          {/* Internal notes */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><StickyNote className="h-4 w-4" /> Internal Notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea placeholder="Add an internal note (not visible to customer)" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
              <Button size="sm" onClick={addNote}>Add note</Button>
              {notes.map((n) => (
                <div key={n.id} className="text-sm border-l-2 border-primary/40 pl-3">
                  <p>{n.note}</p>
                  <p className="text-xs text-muted-foreground">{n.author_name ?? "Staff"} · {new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Timeline / history */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Timeline & Status History</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {events.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
              {events.map((e) => (
                <div key={e.id} className="flex gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div>
                    <p className="text-sm">{e.message}</p>
                    <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Verification History</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {docs.filter((d) => d.verified_status !== "missing").length === 0 && (
                <p className="text-muted-foreground">No verifications yet.</p>
              )}
              {docs.filter((d) => d.verified_status !== "missing").map((d) => (
                <div key={d.id} className="flex justify-between">
                  <span className="capitalize">{d.document_type.replace(/_/g, " ")}</span>
                  <Badge variant="outline" className="capitalize">{d.verified_status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </FinancialLayout>
  );
}
