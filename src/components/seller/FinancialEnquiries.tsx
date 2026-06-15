import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Banknote, Plus, Phone, Mail, MessageSquare, Paperclip, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Enquiry {
  id: string;
  loan_type: string;
  amount_requested: number | null;
  status: string;
  documents: any[];
  notes: string | null;
  created_at: string;
}

const STATUS_STEPS = ["applied", "verification", "approved", "disbursed"];

export default function FinancialEnquiries({ userId }: { userId: string }) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ loan_type: "home_loan", amount_requested: "", notes: "" });
  const [docUrl, setDocUrl] = useState("");
  const [docTarget, setDocTarget] = useState<Enquiry | null>(null);

  const load = async () => {
    const sb: any = supabase;
    const { data } = await sb
      .from("financial_enquiries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setEnquiries((data || []) as Enquiry[]);
    setLoading(false);
  };

  useEffect(() => {
    if (userId) load();
  }, [userId]);

  const submit = async () => {
    if (!form.amount_requested) return toast.error("Enter loan amount");
    const sb: any = supabase;
    const { error } = await sb.from("financial_enquiries").insert({
      user_id: userId,
      loan_type: form.loan_type,
      amount_requested: Number(form.amount_requested),
      notes: form.notes || null,
      status: "applied",
    });
    if (error) return toast.error(error.message);
    toast.success("Enquiry submitted. An advisor will reach out within 24h.");
    setOpen(false);
    setForm({ loan_type: "home_loan", amount_requested: "", notes: "" });
    load();
  };

  const addDoc = async () => {
    if (!docTarget || !docUrl.trim()) return;
    const sb: any = supabase;
    const docs = [...(docTarget.documents || []), { url: docUrl, uploaded_at: new Date().toISOString() }];
    await sb.from("financial_enquiries").update({ documents: docs }).eq("id", docTarget.id);
    toast.success("Document added");
    setDocUrl("");
    setDocTarget(null);
    load();
  };

  const deactivate = async (id: string) => {
    const reason = window.prompt("Reason for closing this enquiry?");
    if (!reason) return;
    const sb: any = supabase;
    await sb.from("financial_enquiries").update({ status: "closed", deactivated_reason: reason }).eq("id", id);
    toast.success("Enquiry deactivated");
    load();
  };

  const statusIndex = (s: string) => STATUS_STEPS.indexOf(s);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Banknote className="h-5 w-5 text-emerald-500" /> Financial Enquiries
            </CardTitle>
            <CardDescription>Track loan applications and chat with your advisor</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <Plus className="h-3 w-3 mr-1" /> New Loan Application
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Apply for a loan</DialogTitle>
                <DialogDescription>We'll connect you with a verified advisor.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs">Loan type</label>
                  <Select value={form.loan_type} onValueChange={(v) => setForm({ ...form, loan_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home_loan">Home Loan</SelectItem>
                      <SelectItem value="mortgage">Mortgage / LAP</SelectItem>
                      <SelectItem value="investment">Investment Loan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs">Amount needed (₹)</label>
                  <Input
                    type="number"
                    value={form.amount_requested}
                    onChange={(e) => setForm({ ...form, amount_requested: e.target.value })}
                    placeholder="e.g. 5000000"
                  />
                </div>
                <div>
                  <label className="text-xs">Notes</label>
                  <Textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={submit} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  Submit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : enquiries.length === 0 ? (
          <div className="text-center py-8">
            <Banknote className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No loan enquiries yet</p>
          </div>
        ) : (
          enquiries.map((e) => (
            <div key={e.id} className="p-3 rounded-lg border bg-muted/20 space-y-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-semibold capitalize">{e.loan_type.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">
                    ₹{Number(e.amount_requested || 0).toLocaleString("en-IN")} •{" "}
                    {new Date(e.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {e.status}
                </Badge>
              </div>

              {/* Loan Status Tracking */}
              <div className="flex items-center gap-1">
                {STATUS_STEPS.map((s, i) => {
                  const reached = i <= statusIndex(e.status);
                  return (
                    <div key={s} className="flex-1 flex items-center">
                      <div
                        className={`h-2 flex-1 rounded ${
                          reached ? "bg-emerald-500" : "bg-muted"
                        }`}
                      />
                      {i < STATUS_STEPS.length - 1 && <div className="w-1" />}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground -mt-2">
                {STATUS_STEPS.map((s) => (
                  <span key={s} className="capitalize">
                    {s}
                  </span>
                ))}
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => setDocTarget(e)}>
                  <Paperclip className="h-3 w-3 mr-1" /> Add Document ({e.documents?.length || 0})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.info("Advisor chat coming soon — use the call/email buttons.")}
                >
                  <MessageSquare className="h-3 w-3 mr-1" /> EMI Chat
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href="tel:+911800123456">
                    <Phone className="h-3 w-3 mr-1" /> Call Advisor
                  </a>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href="mailto:advisor@jaagax.com">
                    <Mail className="h-3 w-3 mr-1" /> Email
                  </a>
                </Button>
                {e.status !== "closed" && e.status !== "disbursed" && (
                  <Button size="sm" variant="ghost" className="text-rose-500" onClick={() => deactivate(e.id)}>
                    <X className="h-3 w-3 mr-1" /> Deactivate
                  </Button>
                )}
                {e.status === "disbursed" && (
                  <Badge className="bg-emerald-500 text-white">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Disbursed
                  </Badge>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={!!docTarget} onOpenChange={(o) => !o && setDocTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit additional document</DialogTitle>
            <DialogDescription>
              Paste a link to your salary slip, bank statement or IT return (use a cloud share link).
            </DialogDescription>
          </DialogHeader>
          <Input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://drive.google.com/…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocTarget(null)}>
              Cancel
            </Button>
            <Button onClick={addDoc} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
