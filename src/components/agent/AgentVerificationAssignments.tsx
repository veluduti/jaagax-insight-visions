import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarClock, Camera, CheckCircle2, MapPin, ShieldCheck, Timer, XCircle } from "lucide-react";

type Assignment = {
  id: string;
  title: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  price: number | null;
  lifecycle_status: string | null;
  agent_assignment_status: string | null;
  agent_response_deadline: string | null;
  agent_visit_at: string | null;
  agent_notes: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  agent_assigned: "Awaiting your response",
  agent_accepted: "Accepted — schedule the visit",
  visit_scheduled: "Visit scheduled",
  under_verification: "Verification in progress",
  verification_submitted: "Report submitted — admin reviewing",
};

function fmt(dt?: string | null) {
  if (!dt) return "";
  return new Date(dt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function AgentVerificationAssignments() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Assignment[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const [declineFor, setDeclineFor] = useState<Assignment | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [visitFor, setVisitFor] = useState<Assignment | null>(null);
  const [visitAt, setVisitAt] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [reportFor, setReportFor] = useState<Assignment | null>(null);
  const [remarks, setRemarks] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const me = u.user?.id;
    if (!me) { setLoading(false); return; }
    const { data } = await (supabase as any)
      .from("properties")
      .select("id, title, city, district, state, price, lifecycle_status, agent_assignment_status, agent_response_deadline, agent_visit_at, agent_notes")
      .eq("assigned_agent_id", me)
      .in("lifecycle_status", ["agent_assigned", "agent_accepted", "visit_scheduled", "under_verification", "verification_submitted"])
      .order("agent_assigned_at", { ascending: false });
    setRows((data ?? []) as Assignment[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const call = async (fn: string, args: Record<string, unknown>, ok: string) => {
    setBusy(String(args._property_id));
    try {
      const { error } = await (supabase as any).rpc(fn, args);
      if (error) throw error;
      toast.success(ok);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const submitReport = async () => {
    if (!reportFor) return;
    if (files.length === 0) { toast.error("Add at least one site photo"); return; }
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const me = u.user?.id;
      const urls: string[] = [];
      for (const f of files) {
        const path = `${me}/${reportFor.id}/${Date.now()}-${f.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from("property-media").upload(path, f, { upsert: true });
        if (error) throw error;
        urls.push(supabase.storage.from("property-media").getPublicUrl(path).data.publicUrl);
      }
      const property = reportFor;
      setReportFor(null);
      setFiles([]);
      await call("property_agent_submit_report", {
        _property_id: property.id,
        _photos: urls,
        _geo_photos: [],
        _video_url: videoUrl.trim() || null,
        _remarks: remarks.trim() || null,
      }, "Verification report submitted to the admin");
      setRemarks("");
      setVideoUrl("");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />Verification assignments
          </CardTitle>
          <CardDescription>
            Properties a JAAGAX admin assigned to you. Accept, visit the site, and submit your verification report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No verification assignments right now.</p>
          ) : rows.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{p.title || "Untitled property"}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {[p.city, p.district, p.state].filter(Boolean).join(", ") || "Location not set"}
                  </div>
                </div>
                <Badge variant="secondary">{STATUS_LABEL[p.lifecycle_status ?? ""] ?? p.lifecycle_status}</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {p.agent_response_deadline && p.lifecycle_status === "agent_assigned" && (
                  <span className="inline-flex items-center gap-1 text-primary font-medium">
                    <Timer className="h-3.5 w-3.5" /> Respond before {fmt(p.agent_response_deadline)}
                  </span>
                )}
                {p.agent_visit_at && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3.5 w-3.5" /> Visit {fmt(p.agent_visit_at)}
                  </span>
                )}
                {p.price ? <span>₹{Number(p.price).toLocaleString("en-IN")}</span> : null}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" asChild>
                  <a href={`/property/${p.id}`} target="_blank" rel="noreferrer">Open listing</a>
                </Button>

                {p.lifecycle_status === "agent_assigned" && (
                  <>
                    <Button size="sm" disabled={busy === p.id}
                      onClick={() => call("property_agent_respond", { _property_id: p.id, _accept: true }, "Assignment accepted")}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Accept
                    </Button>
                    <Button size="sm" variant="destructive" disabled={busy === p.id}
                      onClick={() => { setDeclineFor(p); setDeclineReason(""); }}>
                      <XCircle className="h-4 w-4 mr-1" /> Decline
                    </Button>
                  </>
                )}

                {(p.lifecycle_status === "agent_accepted" || p.lifecycle_status === "visit_scheduled") && (
                  <Button size="sm" variant="secondary" disabled={busy === p.id}
                    onClick={() => { setVisitFor(p); setVisitAt(""); setVisitNotes(""); }}>
                    <CalendarClock className="h-4 w-4 mr-1" />
                    {p.agent_visit_at ? "Reschedule visit" : "Schedule visit"}
                  </Button>
                )}

                {p.lifecycle_status === "visit_scheduled" && (
                  <Button size="sm" disabled={busy === p.id}
                    onClick={() => call("property_agent_start_verification", { _property_id: p.id }, "Verification started")}>
                    Start verification
                  </Button>
                )}

                {p.lifecycle_status === "under_verification" && (
                  <Button size="sm" disabled={busy === p.id}
                    onClick={() => { setReportFor(p); setRemarks(""); setVideoUrl(""); setFiles([]); }}>
                    <Camera className="h-4 w-4 mr-1" /> Submit report
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Decline */}
      <Dialog open={!!declineFor} onOpenChange={(o) => !o && setDeclineFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline assignment</DialogTitle>
            <DialogDescription>The admin is notified and can assign another agent.</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} placeholder="Reason (too far, unavailable, conflict…)"
            value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineFor(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!declineReason.trim()}
              onClick={async () => {
                const p = declineFor!;
                setDeclineFor(null);
                await call("property_agent_respond", { _property_id: p.id, _accept: false, _reason: declineReason.trim() }, "Assignment declined");
              }}>
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule visit */}
      <Dialog open={!!visitFor} onOpenChange={(o) => !o && setVisitFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule site visit</DialogTitle>
            <DialogDescription>The owner is notified with the date and time you pick.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="agent-visit-at">Visit date &amp; time</Label>
              <Input id="agent-visit-at" type="datetime-local" value={visitAt} onChange={(e) => setVisitAt(e.target.value)} />
            </div>
            <Textarea rows={3} placeholder="Notes for the owner (optional)"
              value={visitNotes} onChange={(e) => setVisitNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVisitFor(null)}>Cancel</Button>
            <Button disabled={!visitAt}
              onClick={async () => {
                const p = visitFor!;
                const when = new Date(visitAt).toISOString();
                setVisitFor(null);
                await call("property_agent_schedule_visit",
                  { _property_id: p.id, _visit_at: when, _notes: visitNotes.trim() || null },
                  "Visit scheduled — owner notified");
              }}>
              Schedule visit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit report */}
      <Dialog open={!!reportFor} onOpenChange={(o) => !o && setReportFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit verification report</DialogTitle>
            <DialogDescription>
              Upload the site photos you captured during the visit. The reviewing admin checks the report before the
              owner gives final approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="report-photos">Site photos</Label>
              <Input id="report-photos" type="file" accept="image/*" multiple
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
              {files.length > 0 && <p className="text-[11px] text-muted-foreground">{files.length} photo(s) selected</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-video">Video tour link (optional)</Label>
              <Input id="report-video" placeholder="https://…" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
            </div>
            <Textarea rows={4} placeholder="What you verified on site: address, ownership documents, condition, corrections needed…"
              value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportFor(null)}>Cancel</Button>
            <Button disabled={uploading || files.length === 0} onClick={submitReport}>
              {uploading ? "Uploading…" : "Submit report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
