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
import { Lock, Unlock, XCircle, Timer, MapPin, CheckCircle2, ShieldCheck, CalendarClock, Archive } from "lucide-react";

const CLOSE_REASONS = ["Already Sold", "Already Rented", "Owner Cancelled"];

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
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<PropRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [verifyFor, setVerifyFor] = useState<PropRow | null>(null);
  const [verifyNotes, setVerifyNotes] = useState("");

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
      .select("id, title, city, district, state, price, needs_agent, lifecycle_status, queue_level, is_locked, hold_admin_id, hold_expires_at")
      .or(`id.in.(${ids.length ? ids.join(",") : "00000000-0000-0000-0000-000000000000"}),hold_admin_id.eq.${me}`);

    setTimers((t ?? []) as TimerRow[]);
    setProps((p ?? []) as PropRow[]);
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

  if (loading) return <Skeleton className="h-48 w-full" />;

  const held = props.filter((p) => p.hold_admin_id === uid);
  const queued = props.filter((p) => p.hold_admin_id !== uid && p.queue_level);

  const renderCard = (p: PropRow, mine: boolean) => {
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
    </div>
  );
}
