import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PlanPropertyList from "@/components/smartvisit/PlanPropertyList";
import { supabase } from "@/integrations/supabase/client";
import { listPlansForAdmin, reviewPlan, getAgentsPublic, statusLabel, inr, errMsg, type SmartVisitPlan } from "@/services/smartVisitService";

/** Approval chain: agent → state admin (agent's state) → global admin → live. */
export default function SmartVisitReviewPanel() {
  const [isGlobal, setIsGlobal] = useState<boolean | null>(null);
  const [status, setStatus] = useState("");
  const [plans, setPlans] = useState<SmartVisitPlan[]>([]);
  const [agents, setAgents] = useState<Record<string, any>>({});
  const [form, setForm] = useState<Record<string, { mp: number; hp: number; reason: string; notes: string }>>({});

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await (supabase as any).rpc("is_global_admin", { _uid: u.user?.id });
      setIsGlobal(!!data);
      setStatus(data ? "pending_review" : "pending_state_review");
    })();
  }, []);

  const myQueue = isGlobal ? "pending_review" : "pending_state_review";

  const load = async () => {
    if (!status) return;
    const p = await listPlansForAdmin(status).catch(() => []);
    setPlans(p);
    setForm(Object.fromEntries(p.map((x) => [x.id, { mp: Number(x.price_meeting_point), hp: Number(x.price_home_pickup), reason: "", notes: x.admin_notes || "" }])));
    const a = await getAgentsPublic([...new Set(p.map((x) => x.agent_id))]);
    setAgents(Object.fromEntries(a.map((r: any) => [r.id, r])));
  };
  useEffect(() => { load(); }, [status]);

  const decide = async (p: SmartVisitPlan, approve: boolean) => {
    const f = form[p.id];
    if (approve && (f.mp <= 0 || f.hp <= 0)) return toast.error("Prices must be more than 0");
    if (!approve && !f.reason.trim()) return toast.error("Please give a reason for rejecting");
    try {
      await reviewPlan(p.id, approve
        ? { status: isGlobal ? "approved" : "pending_review", price_meeting_point: f.mp, price_home_pickup: f.hp, admin_notes: f.notes.trim() || undefined }
        : { status: "rejected", rejection_reason: f.reason.trim(), admin_notes: f.notes.trim() || undefined });
      toast.success(approve
        ? (isGlobal ? "Approved — now live for customers" : "Approved — sent to global admin for final approval")
        : "Rejected — agent notified");
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const updatePrices = async (p: SmartVisitPlan) => {
    const f = form[p.id];
    try { await reviewPlan(p.id, { status: "approved", price_meeting_point: f.mp, price_home_pickup: f.hp }); toast.success("Prices updated for customers"); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  if (isGlobal === null) return null;
  const filters = ["pending_state_review", "pending_review", "approved", "rejected", "completed", "cancelled", "all"];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <div>
          <CardTitle className="text-lg">Smart Visit plans</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {isGlobal ? "Final approval. Plans arrive after the state admin approves (or directly if the state has no admin)."
              : "First approval for agents in your state. Approved plans go to the global admin for final approval."}
          </p>
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {filters.map((s) => (
              <SelectItem key={s} value={s}>{s === "all" ? "All" : statusLabel[s]}{s === myQueue ? " (your queue)" : ""}</SelectItem>))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        {plans.length === 0 && <p className="text-sm text-muted-foreground">No plans here.</p>}
        {plans.map((p) => {
          const f = form[p.id]; const ag = agents[p.agent_id];
          if (!f) return null;
          const canDecide = p.status === myQueue;
          return (
            <div key={p.id} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-semibold">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.visit_date} · {p.start_time} · {p.city || "N/A"} · {p.state_name || "State N/A"} · {p.max_seats} seats · Agent {ag?.name || "N/A"} ({ag?.agent_code || "—"})</p>
                  <p className="text-xs text-muted-foreground">Meeting point: {p.meeting_point || "N/A"}</p>
                  {p.state_reviewed_at && p.status !== "rejected" && <p className="text-xs text-primary">✓ Approved by state admin</p>}
                </div>
                <Badge variant="secondary">{statusLabel[p.status] || p.status}</Badge>
              </div>
              {p.description && <p className="text-sm">{p.description}</p>}
              <PlanPropertyList ids={p.property_ids} />
              {p.rejection_reason && <p className="text-sm text-destructive">Rejected by {p.rejected_by_level === "state" ? "state admin" : "global admin"}: {p.rejection_reason}</p>}
              {(canDecide || (isGlobal && p.status === "approved")) && (
                <div className="space-y-2">
                  <div className="grid sm:grid-cols-2 gap-2">
                    <div><Label className="text-xs">Meeting point price / person (₹)</Label>
                      <Input type="number" value={f.mp} onChange={(e) => setForm({ ...form, [p.id]: { ...f, mp: Number(e.target.value) } })} /></div>
                    <div><Label className="text-xs">Home pickup price / person (₹)</Label>
                      <Input type="number" value={f.hp} onChange={(e) => setForm({ ...form, [p.id]: { ...f, hp: Number(e.target.value) } })} /></div>
                  </div>
                  <p className="text-xs text-muted-foreground">Agent asked: {inr(p.price_meeting_point)} / {inr(p.price_home_pickup)}</p>
                  {canDecide ? (
                    <>
                      <Textarea placeholder="Note (optional)" value={f.notes} onChange={(e) => setForm({ ...form, [p.id]: { ...f, notes: e.target.value } })} />
                      <Input placeholder="Reason (required to reject)" value={f.reason} onChange={(e) => setForm({ ...form, [p.id]: { ...f, reason: e.target.value } })} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => decide(p, true)}>{isGlobal ? "Final approve" : "Approve & send to global"}</Button>
                        <Button size="sm" variant="destructive" onClick={() => decide(p, false)}>Reject</Button>
                      </div>
                    </>
                  ) : <Button size="sm" variant="outline" onClick={() => updatePrices(p)}>Update prices</Button>}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
