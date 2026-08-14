import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Lock, Unlock, XCircle, Timer, MapPin, CheckCircle2, ShieldCheck, CalendarClock, Archive, UserCheck, ClipboardCheck } from "lucide-react";
import { AssignAgentDialog } from "@/components/admin/AssignAgentDialog";

const CLOSE_REASONS = ["Already Sold", "Already Rented", "Owner Cancelled"];

const AGENT_STATE_LABEL: Record<string, string> = {
  pending: "awaiting response",
  accepted: "accepted",
  rejected: "declined",
};

type TimerRow = {
  property_id: string;
  level: string;
  status: string;
  expires_at: string;
  remaining_seconds: number | null;
};

type PropRow = {
  id: string;
  title: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  price: number | null;
  needs_agent: boolean | null;
  lifecycle_status: string | null;
  queue_level: string | null;
  is_locked: boolean | null;
  hold_admin_id: string | null;
  hold_expires_at: string | null;
  verification_visit_at: string | null;
  assigned_agent_id: string | null;
  agent_assignment_status: string | null;
  agent_response_deadline: string | null;
  agent_visit_at: string | null;
};

type VerificationRow = {
  id: string;
  property_id: string;
  photos: string[] | null;
  video_url: string | null;
  remarks: string | null;
  submitted_at: string | null;
};

const LEVEL_LABEL: Record<string, string> = {
  country: "Country",
  state: "State",
  district: "District",
};

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function Countdown({ to, paused, seconds }: { to?: string | null; paused?: boolean; seconds?: number | null }) {
  const now = useNow();
  const left = paused
    ? Math.max(0, seconds ?? 0)
    : to
      ? Math.max(0, Math.floor((new Date(to).getTime() - now) / 1000))
      : 0;
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const text = h > 0 ? `${h}h ${m}m` : `${m}m ${String(s).padStart(2, "0")}s`;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${left === 0 ? "text-destructive" : paused ? "text-muted-foreground" : "text-primary"}`}>
      <Timer className="h-3.5 w-3.5" />
      {paused ? `Paused · ${text} left` : left === 0 ? "Expired" : text}
    </span>
  );
}

export default function PropertyReviewQueuePanel({ readOnly = false }: { readOnly?: boolean }) {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [timers, setTimers] = useState<TimerRow[]>([]);
  const [props, setProps] = useState<PropRow[]>([]);
  const [oversight, setOversight] = useState<PropRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<PropRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [verifyFor, setVerifyFor] = useState<PropRow | null>(null);
  const [verifyNotes, setVerifyNotes] = useState("");
  const [visitFor, setVisitFor] = useState<PropRow | null>(null);
  const [visitAt, setVisitAt] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [closeFor, setCloseFor] = useState<PropRow | null>(null);
  const [closeReason, setCloseReason] = useState(CLOSE_REASONS[0]);
  const [assignFor, setAssignFor] = useState<PropRow | null>(null);
  const [reportFor, setReportFor] = useState<PropRow | null>(null);
  const [reportNotes, setReportNotes] = useState("");
  const [report, setReport] = useState<VerificationRow | null>(null);

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const me = u.user?.id ?? null;
    setUid(me);
    if (!me) { setLoading(false); return; }

    const { data: t } = await (supabase as any)
      .from("property_admin_timers")
      .select("property_id, level, status, expires_at, remaining_seconds")
      .eq("admin_id", me)
      .in("status", ["running", "paused", "held"]);

    const ids = Array.from(new Set(((t ?? []) as TimerRow[]).map((r) => r.property_id)));

    const { data: p } = await (supabase as any)
      .from("properties")
      .select("id, title, city, district, state, price, needs_agent, lifecycle_status, queue_level, is_locked, hold_admin_id, hold_expires_at, verification_visit_at, assigned_agent_id, agent_assignment_status, agent_response_deadline, agent_visit_at")
      .or(`id.in.(${ids.length ? ids.join(",") : "00000000-0000-0000-0000-000000000000"}),hold_admin_id.eq.${me}`);

    // Oversight: every submission inside this admin's geography, even when the
    // active queue belongs to a lower level (district owns the operation).
    const { data: scope } = await (supabase as any)
      .from("admin_scopes")
      .select("role, country, state, district")
      .eq("user_id", me)
      .eq("is_active", true)
      .maybeSingle();

    let overs: PropRow[] = [];
    if (scope) {
      let q = (supabase as any)
        .from("properties")
        .select("id, title, city, district, state, price, needs_agent, lifecycle_status, queue_level, is_locked, hold_admin_id, hold_expires_at, verification_visit_at, assigned_agent_id, agent_assignment_status, agent_response_deadline, agent_visit_at")
        .not("queue_level", "is", null)
        .order("queue_started_at", { ascending: false })
        .limit(100);
      if (scope.country) q = q.ilike("country", scope.country);
      if (scope.state) q = q.ilike("state", scope.state);
      if (scope.district) q = q.ilike("district", scope.district);
      const { data: o } = await q;
      const own = new Set([...(ids ?? []), ...(((p ?? []) as PropRow[]).map((r) => r.id))]);
      overs = ((o ?? []) as PropRow[]).filter((r) => !own.has(r.id));
    }

    setTimers((t ?? []) as TimerRow[]);
    setProps((p ?? []) as PropRow[]);
    setOversight(overs);
    setLoading(false);
  }, []);


  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("property-review-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "property_admin_timers" }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "properties" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const timerFor = useMemo(() => {
    const m = new Map<string, TimerRow>();
    timers.forEach((t) => m.set(t.property_id, t));
    return m;
  }, [timers]);

  const call = async (fn: string, args: Record<string, unknown>, ok: string) => {
    setBusy(String(args._property_id));
    try {
      const { data, error } = await (supabase as any).rpc(fn, args);
      if (error) throw error;
      toast.success(ok, {
        description: (data as any)?.escalated_to
          ? "Escalated to the next admin level."
          : undefined,
      });
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const openReport = async (p: PropRow) => {
    setReportFor(p);
    setReportNotes("");
    setReport(null);
    const { data } = await (supabase as any)
      .from("property_verifications")
      .select("id, property_id, photos, video_url, remarks, submitted_at")
      .eq("property_id", p.id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setReport((data ?? null) as VerificationRow | null);
  };

  if (loading) return <Skeleton className="h-48 w-full" />;

  const held = props.filter((p) => p.hold_admin_id === uid);
  const queued = props.filter((p) => p.hold_admin_id !== uid && p.queue_level);

  const renderCard = (p: PropRow, mine: boolean, monitorOnly = false) => {
    const t = timerFor.get(p.id);
    const lvl = p.queue_level ?? t?.level ?? "country";
    const lockedByOther = !!p.is_locked && !mine;
    return (
      <div key={p.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold truncate">{p.title || "Untitled property"}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />
              {[p.city, p.district, p.state].filter(Boolean).join(", ") || "Location not set"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{LEVEL_LABEL[lvl] ?? lvl} queue</Badge>
            {p.needs_agent ? (
              <Badge variant="default" className="gap-1"><ShieldCheck className="h-3 w-3" />Agent requested</Badge>
            ) : (
              <Badge variant="outline">Owner-managed</Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {mine ? (
            <Countdown to={p.hold_expires_at} />
          ) : (
            <Countdown to={t?.expires_at} paused={t?.status === "paused"} seconds={t?.remaining_seconds} />
          )}
          {p.price ? <span className="text-xs text-muted-foreground">₹{Number(p.price).toLocaleString("en-IN")}</span> : null}
          {lockedByOther && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />Held by another admin</Badge>}
          {p.lifecycle_status === "owner_review" && <Badge variant="secondary">Awaiting owner approval</Badge>}
          {p.verification_visit_at && (
            <Badge variant="outline" className="gap-1">
              <CalendarClock className="h-3 w-3" />
              Visit {new Date(p.verification_visit_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </Badge>
          )}
          {p.assigned_agent_id && (
            <Badge variant="outline" className="gap-1">
              <UserCheck className="h-3 w-3" />
              Agent {AGENT_STATE_LABEL[p.agent_assignment_status ?? ""] ?? p.agent_assignment_status}
            </Badge>
          )}
          {p.agent_visit_at && (
            <Badge variant="outline" className="gap-1">
              <CalendarClock className="h-3 w-3" />
              Agent visit {new Date(p.agent_visit_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </Badge>
          )}
        </div>

        {!readOnly && (
          <div className="flex flex-wrap gap-2 pt-1">
            {!mine && !lockedByOther && (
              <Button size="sm" disabled={busy === p.id} onClick={() => call("property_hold", { _property_id: p.id }, "Property held — it is locked to you")}>
                <Lock className="h-4 w-4 mr-1" /> Hold
              </Button>
            )}
            {mine && (
              <>
                <Button size="sm" variant="outline" asChild>
                  <a href={`/property/${p.id}`} target="_blank" rel="noreferrer">Open & verify</a>
                </Button>
                {p.lifecycle_status !== "owner_review" && (
                  <Button size="sm" variant="secondary" disabled={busy === p.id}
                    onClick={() => { setVisitFor(p); setVisitAt(""); setVisitNotes(""); }}>
                    <CalendarClock className="h-4 w-4 mr-1" />
                    {p.verification_visit_at ? "Reschedule visit" : "Schedule visit"}
                  </Button>
                )}
                {p.needs_agent && p.lifecycle_status !== "owner_review" &&
                  (!p.assigned_agent_id || p.agent_assignment_status === "rejected") && (
                  <Button size="sm" variant="secondary" disabled={busy === p.id} onClick={() => setAssignFor(p)}>
                    <UserCheck className="h-4 w-4 mr-1" /> Assign agent
                  </Button>
                )}
                {p.lifecycle_status === "verification_submitted" && (
                  <Button size="sm" disabled={busy === p.id} onClick={() => openReport(p)}>
                    <ClipboardCheck className="h-4 w-4 mr-1" /> Review agent report
                  </Button>
                )}
                {p.lifecycle_status !== "owner_review" && (
                  <Button size="sm" disabled={busy === p.id} onClick={() => { setVerifyFor(p); setVerifyNotes(""); }}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Submit verification to owner
                  </Button>
                )}
                <Button size="sm" variant="outline" disabled={busy === p.id}
                  onClick={() => call("property_release", { _property_id: p.id, _reason: "Released by admin" }, "Released — other admin timers resumed")}>
                  <Unlock className="h-4 w-4 mr-1" /> Release
                </Button>
                <Button size="sm" variant="destructive" disabled={busy === p.id} onClick={() => { setRejectFor(p); setRejectReason(""); }}>
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Button size="sm" variant="outline" disabled={busy === p.id}
                  onClick={() => { setCloseFor(p); setCloseReason(CLOSE_REASONS[0]); }}>
                  <Archive className="h-4 w-4 mr-1" /> Mark closed
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary" />Properties you are holding</CardTitle>
          <CardDescription>
            You own the verification of these listings. Complete the visit and verification, then send the changes to the
            owner for approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {held.length === 0 ? (
            <p className="text-sm text-muted-foreground">You are not holding any property right now.</p>
          ) : held.map((p) => renderCard(p, true))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Timer className="h-5 w-5 text-primary" />Review queue</CardTitle>
          <CardDescription>
            First admin to hold a property locks it. All other timers pause instantly. If no one holds it before the
            timers expire, the property escalates to the next admin level.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {queued.length === 0 ? (
            <p className="text-sm text-muted-foreground">No properties waiting in your queue.</p>
          ) : queued.map((p) => renderCard(p, false))}
        </CardContent>
      </Card>

      {/* Reject dialog */}
      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject property</DialogTitle>
            <DialogDescription>
              Rejected listings are never published. The owner is notified with your reason.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Fake property / duplicate / invalid documents / fraud — add detail"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={async () => {
                const p = rejectFor!;
                setRejectFor(null);
                await call("property_reject_review", { _property_id: p.id, _reason: rejectReason.trim() }, "Property rejected");
              }}
            >
              Reject property
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit verification dialog */}
      <Dialog open={!!verifyFor} onOpenChange={(o) => !o && setVerifyFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send verification to owner</DialogTitle>
            <DialogDescription>
              The owner reviews your updates and approves or rejects them. On approval the listing goes live
              {verifyFor?.needs_agent ? " and you become the assigned agent." : "."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Visit notes, corrections made, documents verified…"
            value={verifyNotes}
            onChange={(e) => setVerifyNotes(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyFor(null)}>Cancel</Button>
            <Button
              onClick={async () => {
                const p = verifyFor!;
                setVerifyFor(null);
                await call("property_submit_verification_to_owner", { _property_id: p.id, _notes: verifyNotes.trim() || null }, "Sent to owner for approval");
              }}
            >
              Send for approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule visit dialog */}
      <Dialog open={!!visitFor} onOpenChange={(o) => !o && setVisitFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule verification visit</DialogTitle>
            <DialogDescription>
              The visit must fall inside the visit window configured by the super admin. The owner is notified with the
              date and time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="visit-at">Visit date &amp; time</Label>
              <Input id="visit-at" type="datetime-local" value={visitAt} onChange={(e) => setVisitAt(e.target.value)} />
            </div>
            <Textarea
              placeholder="Notes for the owner (optional)"
              value={visitNotes}
              onChange={(e) => setVisitNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVisitFor(null)}>Cancel</Button>
            <Button
              disabled={!visitAt}
              onClick={async () => {
                const p = visitFor!;
                const when = new Date(visitAt).toISOString();
                setVisitFor(null);
                await call("property_schedule_verification_visit",
                  { _property_id: p.id, _visit_at: when, _notes: visitNotes.trim() || null },
                  "Visit scheduled — owner notified");
              }}
            >
              Schedule visit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close property dialog */}
      <Dialog open={!!closeFor} onOpenChange={(o) => !o && setCloseFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark property closed</DialogTitle>
            <DialogDescription>
              Closing removes the property from every country, state and district queue and from public listings
              immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={closeReason} onValueChange={setCloseReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLOSE_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseFor(null)}>Cancel</Button>
            <Button
              onClick={async () => {
                const p = closeFor!;
                setCloseFor(null);
                await call("property_close", { _property_id: p.id, _reason: closeReason }, "Property closed");
              }}
            >
              Close property
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign agent */}
      {assignFor && (
        <AssignAgentDialog
          propertyId={assignFor.id}
          propertyTitle={assignFor.title || "Untitled property"}
          open={!!assignFor}
          onOpenChange={(o) => !o && setAssignFor(null)}
          onAssigned={load}
        />
      )}

      {/* Review agent verification report */}
      <Dialog open={!!reportFor} onOpenChange={(o) => !o && setReportFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agent verification report</DialogTitle>
            <DialogDescription>
              Approve to send the verified listing to the owner for final confirmation, or send it back to the agent for
              rework.
            </DialogDescription>
          </DialogHeader>

          {!report ? (
            <p className="text-sm text-muted-foreground">No report found for this property yet.</p>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Submitted {report.submitted_at ? new Date(report.submitted_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}
              </div>
              {report.photos && report.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {report.photos.map((src, i) => (
                    <a key={i} href={src} target="_blank" rel="noreferrer" className="block">
                      <img src={src} alt={`Verification photo ${i + 1}`} loading="lazy"
                        className="h-24 w-full rounded-lg object-cover border border-border" />
                    </a>
                  ))}
                </div>
              )}
              {report.video_url && (
                <a className="text-sm text-primary underline" href={report.video_url} target="_blank" rel="noreferrer">
                  Watch video tour
                </a>
              )}
              {report.remarks && (
                <p className="text-sm whitespace-pre-wrap rounded-lg border border-border p-3">{report.remarks}</p>
              )}
            </div>
          )}

          <Textarea rows={3} placeholder="Notes for the agent / owner (optional)"
            value={reportNotes} onChange={(e) => setReportNotes(e.target.value)} />

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportFor(null)}>Cancel</Button>
            <Button variant="destructive"
              onClick={async () => {
                const p = reportFor!;
                setReportFor(null);
                await call("property_admin_review_verification",
                  { _property_id: p.id, _approve: false, _notes: reportNotes.trim() || null },
                  "Sent back to the agent for rework");
              }}>
              Request rework
            </Button>
            <Button
              onClick={async () => {
                const p = reportFor!;
                setReportFor(null);
                await call("property_admin_review_verification",
                  { _property_id: p.id, _approve: true, _notes: reportNotes.trim() || null },
                  "Report approved — sent to the owner for final approval");
              }}>
              Approve report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
