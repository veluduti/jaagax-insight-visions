import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ShieldCheck, Clock, MapPin, CalendarClock, Archive } from "lucide-react";

type Row = {
  id: string;
  title: string | null;
  city: string | null;
  district: string | null;
  lifecycle_status: string | null;
  queue_level: string | null;
  needs_agent: boolean | null;
  agent_notes: string | null;
  is_locked: boolean | null;
  verification_visit_at: string | null;
  verification_visit_notes: string | null;
};

const OWNER_CLOSE_REASONS = ["Already Sold", "Already Rented", "No longer selling"];

const TRACKED_STATUSES = [
  "submitted", "country_queue", "country_hold", "state_queue", "state_hold",
  "district_queue", "district_hold", "owner_review", "pending_admin_review",
  "live", "agent_assigned",
];

const STAGE_TEXT: Record<string, string> = {
  submitted: "Submitted — entering the review queue",
  country_queue: "Waiting for a JAAGAX Country Admin to pick it up",
  country_hold: "A JAAGAX Country Admin is reviewing your property",
  state_queue: "Waiting for a JAAGAX State Admin to pick it up",
  state_hold: "A JAAGAX State Admin is reviewing your property",
  district_queue: "Waiting for a JAAGAX District Admin to pick it up",
  district_hold: "A JAAGAX District Admin is reviewing your property",
  pending_admin_review: "With the JAAGAX head office review team",
  live: "Live on JAAGAX",
  agent_assigned: "Live — your JAAGAX agent is handling buyer enquiries",
};

export default function OwnerVerificationReviewPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [closeFor, setCloseFor] = useState<Row | null>(null);
  const [closeReason, setCloseReason] = useState(OWNER_CLOSE_REASONS[0]);

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await (supabase as any)
      .from("properties")
      .select("id, title, city, district, lifecycle_status, queue_level, needs_agent, agent_notes, is_locked, verification_visit_at, verification_visit_notes")
      .eq("submitted_by", u.user.id)
      .in("lifecycle_status", TRACKED_STATUSES);
    setRows((data ?? []) as Row[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("owner-verification-review")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "properties" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const decide = async (id: string, approve: boolean) => {
    setBusy(id);
    try {
      const { error } = await (supabase as any).rpc("property_owner_decision", {
        _property_id: id,
        _approve: approve,
        _reason: approve ? null : (reason[id]?.trim() || "Changes not acceptable"),
      });
      if (error) throw error;
      toast.success(approve ? "Approved — your property is now live" : "Sent back to the JAAGAX admin");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit your decision");
    } finally {
      setBusy(null);
    }
  };

  const closeProperty = async () => {
    const r = closeFor!;
    setCloseFor(null);
    setBusy(r.id);
    try {
      const { error } = await (supabase as any).rpc("property_close", {
        _property_id: r.id, _reason: closeReason,
      });
      if (error) throw error;
      toast.success("Listing closed — it is removed from JAAGAX");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not close the listing");
    } finally {
      setBusy(null);
    }
  };

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />JAAGAX verification</CardTitle>
        <CardDescription>Live status of the properties you submitted for verification.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => {
          const awaiting = r.lifecycle_status === "owner_review";
          return (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{r.title || "Untitled property"}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{[r.city, r.district].filter(Boolean).join(", ") || "Location not set"}
                  </div>
                </div>
                {r.needs_agent ? <Badge>Agent requested</Badge> : <Badge variant="outline">Owner-managed</Badge>}
              </div>

              {awaiting ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    Verification complete. Please review the updates made by the JAAGAX admin.
                    {r.needs_agent && " On approval this admin becomes your assigned agent and your number stays hidden."}
                  </p>
                  {r.agent_notes && (
                    <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 p-2 whitespace-pre-wrap">{r.agent_notes}</p>
                  )}
                  <Textarea
                    rows={2}
                    placeholder="Reason (only needed if you reject)"
                    value={reason[r.id] ?? ""}
                    onChange={(e) => setReason((p) => ({ ...p, [r.id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busy === r.id} onClick={() => decide(r.id, true)}>Approve & publish</Button>
                    <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => decide(r.id, false)}>Reject changes</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {STAGE_TEXT[r.lifecycle_status ?? ""] ?? "In review"}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
