import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { PropertyStatusBadge } from "@/components/property/PropertyStatusBadge";
import { PropertyAuditLogDialog } from "@/components/property/PropertyAuditLogDialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Lock, History, Phone, Mail, Star, CalendarCheck2, CalendarClock, UserCheck, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import RateAgentDialog from "@/components/seller/RateAgentDialog";

interface Agent {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  photo_url?: string | null;
  avg_rating?: number | null;
  total_ratings?: number | null;
  sales_count?: number | null;
  verified?: boolean | null;
}

interface Row {
  id: string;
  title: string;
  lifecycle_status: string | null;
  edit_locked: boolean | null;
  expiry_date: string | null;
  assigned_agent_id: string | null;
  last_verified_at: string | null;
  visit_scheduled_date?: string | null;
  visit_scheduled_time?: string | null;
  visit_scheduled_notes?: string | null;
  visit_scheduled_at?: string | null;
  visit_confirmed_at?: string | null;
  reschedule_reason?: string | null;
  reschedule_preferred_date?: string | null;
  reschedule_preferred_time?: string | null;
  agent?: Agent | null;
}

const TIMELINE = [
  "submitted", "pending_admin_review", "agent_assigned", "agent_accepted",
  "visit_scheduled", "visit_confirmed", "under_verification", "verification_submitted",
  "pending_final_approval", "live_verified",
];

function daysUntil(iso?: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export function OwnerPropertyStatusPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState<string | null>(null);
  const [auditFor, setAuditFor] = useState<Row | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Reschedule dialog
  const [rescheduleTarget, setRescheduleTarget] = useState<Row | null>(null);
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const deleteListing = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await (supabase.from as any)("properties").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Listing deleted" });
      setRows((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally { setDeleting(null); }
  };
  const [prefDate, setPrefDate] = useState("");
  const [prefTime, setPrefTime] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await (supabase.from as any)("properties")
        .select("id, title, lifecycle_status, edit_locked, expiry_date, assigned_agent_id, last_verified_at, visit_scheduled_date, visit_scheduled_time, visit_scheduled_notes, visit_scheduled_at, visit_confirmed_at, reschedule_reason, reschedule_preferred_date, reschedule_preferred_time")
        .eq("submitted_by", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      const list: Row[] = data || [];
      const agentIds = Array.from(new Set(list.map(r => r.assigned_agent_id).filter(Boolean))) as string[];
      const agentsMap: Record<string, Agent> = {};
      if (agentIds.length) {
        const { data: ag } = await (supabase.from as any)("agents")
          .select("id, name, phone, email, photo_url, avg_rating, total_ratings, sales_count, verified")
          .in("id", agentIds);
        (ag || []).forEach((a: Agent) => { agentsMap[a.id!] = a; });
      }
      setRows(list.map(r => ({ ...r, agent: r.assigned_agent_id ? agentsMap[r.assigned_agent_id] : null })));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const renew = async (id: string) => {
    setRenewing(id);
    try {
      const { error } = await (supabase.rpc as any)("renew_property_listing_v2", { _property_id: id });
      if (error) throw error;
      toast({ title: "Renewal requested" });
      load();
    } catch (e: any) {
      toast({ title: "Renew failed", description: e.message, variant: "destructive" });
    } finally { setRenewing(null); }
  };

  const acceptSchedule = async (r: Row) => {
    setActing(r.id);
    try {
      const { data, error } = await supabase.functions.invoke("owner-accept-schedule", { body: { property_id: r.id } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Visit confirmed ✅", description: "Your agent has been notified." });
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setActing(null); }
  };

  const submitReschedule = async () => {
    if (!rescheduleTarget) return;
    if (!reason.trim()) { toast({ title: "Reason required", variant: "destructive" }); return; }
    setActing(rescheduleTarget.id);
    try {
      const { data, error } = await supabase.functions.invoke("owner-request-reschedule", {
        body: {
          property_id: rescheduleTarget.id,
          reason: reason.trim(),
          preferred_date: prefDate || null,
          preferred_time: prefTime || null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Reschedule request sent" });
      setRescheduleTarget(null); setReason(""); setPrefDate(""); setPrefTime("");
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setActing(null); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>;
  if (rows.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">My Listings — Status</h3>
      {rows.map((r) => {
        const stepIdx = TIMELINE.indexOf(r.lifecycle_status || "");
        const expDays = daysUntil(r.expiry_date);
        const showRenew = r.lifecycle_status === "expired";
        const showAgentDetails = !!r.agent && ["agent_accepted", "visit_scheduled", "visit_confirmed", "visit_reschedule_requested", "under_verification", "verification_submitted", "pending_final_approval", "live_verified", "live"].includes(r.lifecycle_status || "");
        const showVisitSchedule = ["visit_scheduled", "visit_confirmed", "visit_reschedule_requested"].includes(r.lifecycle_status || "");
        const canRespond = r.lifecycle_status === "visit_scheduled";

        return (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium truncate">{r.title}</span>
                  <PropertyStatusBadge status={r.lifecycle_status} />
                  {r.edit_locked && (
                    <Badge variant="outline" className="text-[10px]"><Lock className="w-3 h-3 mr-1" /> Locked</Badge>
                  )}
                </div>
                {expDays !== null && r.lifecycle_status?.startsWith("live") && (
                  <div className={`text-xs mt-1 ${expDays <= 7 ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                    Expires in {expDays} day{expDays === 1 ? "" : "s"}
                  </div>
                )}
                {stepIdx >= 0 && (
                  <div className="mt-3 flex gap-1">
                    {TIMELINE.map((s, i) => (
                      <div key={s} title={s.replace(/_/g, " ")}
                        className={`h-1.5 flex-1 rounded ${i <= stepIdx ? "bg-primary" : "bg-muted"}`} />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {showRenew && (
                  <Button size="sm" disabled={renewing === r.id} onClick={() => renew(r.id)}>
                    {renewing === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                    Renew
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setAuditFor(r)} className="text-xs">
                  <History className="w-3.5 h-3.5 mr-1" /> History
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10" disabled={deleting === r.id}>
                      {deleting === r.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />} Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes "{r.title}" and all its data. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteListing(r.id)} className="bg-destructive hover:bg-destructive/90">
                        Delete permanently
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Assigned Agent Card */}
            {showAgentDetails && r.agent && (
              <div className="mt-3 rounded-lg border bg-muted/40 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Verification Agent Assigned</span>
                  {r.agent.verified && <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600">Verified</Badge>}
                </div>
                <div className="flex items-start gap-3">
                  {r.agent.photo_url ? (
                    <img src={r.agent.photo_url} alt={r.agent.name || "Agent"} className="h-12 w-12 rounded-full object-cover border" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {(r.agent.name || "A").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{r.agent.name || "Agent"}</div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      {r.agent.phone && (
                        <a href={`tel:${r.agent.phone}`} className="flex items-center gap-1 hover:text-foreground"><Phone className="h-3 w-3" />{r.agent.phone}</a>
                      )}
                      {r.agent.email && (
                        <a href={`mailto:${r.agent.email}`} className="flex items-center gap-1 hover:text-foreground truncate"><Mail className="h-3 w-3" />{r.agent.email}</a>
                      )}
                      <span className="flex items-center gap-1"><Star className="h-3 w-3" />{Number(r.agent.avg_rating || 0).toFixed(1)} ({r.agent.total_ratings || 0})</span>
                      {(r.agent.sales_count ?? 0) > 0 && <span>{r.agent.sales_count} verifications</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Visit schedule section */}
            {showVisitSchedule && (
              <div className="mt-3 rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 mb-2">
                  {r.lifecycle_status === "visit_confirmed" ? (
                    <><CalendarCheck2 className="h-4 w-4 text-emerald-600" /><span className="text-xs font-semibold text-emerald-700">Visit Confirmed</span></>
                  ) : r.lifecycle_status === "visit_reschedule_requested" ? (
                    <><CalendarClock className="h-4 w-4 text-amber-600" /><span className="text-xs font-semibold text-amber-700">Reschedule Requested — awaiting agent</span></>
                  ) : (
                    <><CalendarClock className="h-4 w-4 text-blue-600" /><span className="text-xs font-semibold text-blue-700">Visit Proposed — please review</span></>
                  )}
                </div>
                <div className="text-sm">
                  <div><span className="text-muted-foreground">Date:</span> <strong>{r.visit_scheduled_date || "—"}</strong></div>
                  <div><span className="text-muted-foreground">Time:</span> <strong>{r.visit_scheduled_time || "—"}</strong></div>
                  {r.visit_scheduled_notes && (
                    <div className="mt-1"><span className="text-muted-foreground">Notes:</span> {r.visit_scheduled_notes}</div>
                  )}
                  {r.lifecycle_status === "visit_reschedule_requested" && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Your reason: <em>{r.reschedule_reason}</em>
                      {r.reschedule_preferred_date && <> · Preferred: {r.reschedule_preferred_date}{r.reschedule_preferred_time ? " " + r.reschedule_preferred_time : ""}</>}
                    </div>
                  )}
                </div>
                {canRespond && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={acting === r.id} onClick={() => acceptSchedule(r)}>
                      {acting === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarCheck2 className="w-4 h-4 mr-1" />}
                      Accept Schedule
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setRescheduleTarget(r); setReason(""); setPrefDate(""); setPrefTime(""); }}>
                      <CalendarClock className="w-4 h-4 mr-1" /> Request Reschedule
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
      {auditFor && (
        <PropertyAuditLogDialog
          propertyId={auditFor.id}
          propertyTitle={auditFor.title}
          open={!!auditFor}
          onOpenChange={(o) => !o && setAuditFor(null)}
        />
      )}

      {/* Reschedule dialog */}
      <Dialog open={!!rescheduleTarget} onOpenChange={(o) => !o && setRescheduleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a different visit time</DialogTitle>
            <DialogDescription>Your agent will be notified. You may suggest a preferred date and time.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Reason <span className="text-red-500">*</span></label>
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is the proposed time not workable for you?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Preferred date (optional)</label>
                <Input type="date" value={prefDate} onChange={(e) => setPrefDate(e.target.value)} min={new Date().toISOString().slice(0,10)} />
              </div>
              <div>
                <label className="text-xs font-medium">Preferred time (optional)</label>
                <Input type="time" value={prefTime} onChange={(e) => setPrefTime(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleTarget(null)}>Cancel</Button>
            <Button onClick={submitReschedule} disabled={!!acting}>{acting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send request"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
