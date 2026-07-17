import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, XCircle, MessageSquare, MapPin, Ruler, Eye } from "lucide-react";
import { toast } from "sonner";
import LandRegistrationDetailDialog from "@/components/admin/LandRegistrationDetailDialog";

type Reg = any;

const STATUS_COLOR: Record<string, string> = {
  submitted: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-700 border-red-500/30",
  changes_requested: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  draft: "bg-muted text-muted-foreground border-border",
};

export default function AdminLandRegistrations() {
  const [rows, setRows] = useState<Reg[]>([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "mine" | "all">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [viewId, setViewId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    setUid(userData.user?.id ?? null);
    const { data, error } = await (supabase as any)
      .from("nl_land_registrations")
      .select("*")
      .neq("status", "draft")
      .order("submitted_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setRows([]);
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    if (filter === "pending") return rows.filter((r) => r.status === "submitted" || r.status === "changes_requested");
    if (filter === "mine") return rows.filter((r) => r.assigned_admin_id === uid);
    return rows;
  }, [rows, filter, uid]);

  async function review(id: string, decision: "approved" | "rejected" | "changes_requested") {
    if (busyId) return;
    const reason = reasons[id]?.trim() || null;
    if ((decision === "rejected" || decision === "changes_requested") && !reason) {
      toast.error("Please provide a reason.");
      return;
    }
    setBusyId(id);
    const { error } = await (supabase as any).rpc("review_land_registration", {
      _registration_id: id,
      _decision: decision,
      _reason: reason,
    });
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      decision === "approved" ? "Approved & published" : decision === "rejected" ? "Rejected" : "Changes requested",
    );
    setReasons((r) => ({ ...r, [id]: "" }));
    load();
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Land Registration Approvals</h1>
          <p className="text-sm text-muted-foreground">
            Approve, reject, or request changes on land registrations routed to you.
          </p>
        </div>
        <div className="flex gap-2">
          {(["pending", "mine", "all"] as const).map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
              {f === "pending" ? "Pending" : f === "mine" ? "Assigned to me" : "All"}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No land registrations in this view.</Card>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => {
            const isMine = r.assigned_admin_id === uid;
            const canAct = (r.status === "submitted" || r.status === "changes_requested") && isMine;
            return (
              <Card key={r.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{r.village || r.district || "Unnamed land"}</span>
                      <Badge className={STATUS_COLOR[r.status] ?? ""} variant="outline">
                        {r.status}
                      </Badge>
                      {r.assigned_admin_role && (
                        <Badge variant="outline" className="text-xs">
                          → {r.assigned_admin_role.replace("_", " ")}
                        </Badge>
                      )}
                      {isMine && <Badge variant="secondary" className="text-xs">Assigned to you</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {[r.village, r.mandal, r.district, r.state, r.country].filter(Boolean).join(", ") || "—"}
                      </span>
                      {r.total_area && (
                        <span className="flex items-center gap-1">
                          <Ruler className="h-3.5 w-3.5" />
                          {r.total_area} {r.area_unit || ""}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Owner: {r.owner_name || "—"} · {r.owner_phone || r.owner_email || ""} · Submitted:{" "}
                      {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—"}
                    </div>
                    {r.rejection_reason && (
                      <div className="text-xs text-red-600">Previous rejection: {r.rejection_reason}</div>
                    )}
                    {r.change_request_notes && (
                      <div className="text-xs text-blue-600">Change request: {r.change_request_notes}</div>
                    )}
                  </div>
                </div>

                {canAct ? (
                  <div className="space-y-2 border-t pt-3">
                    <Textarea
                      placeholder="Reason (required for reject / request changes)"
                      value={reasons[r.id] ?? ""}
                      onChange={(e) => setReasons((s) => ({ ...s, [r.id]: e.target.value }))}
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => review(r.id, "approved")}
                        disabled={busyId === r.id}
                        className="gap-1"
                      >
                        {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Approve & Publish
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => review(r.id, "rejected")}
                        disabled={busyId === r.id}
                        className="gap-1"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => review(r.id, "changes_requested")}
                        disabled={busyId === r.id}
                        className="gap-1"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Request Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  r.status === "submitted" && (
                    <div className="text-xs text-muted-foreground border-t pt-2">
                      View-only — only the assigned {r.assigned_admin_role?.replace("_", " ") || "admin"} or a Global
                      Admin can decide.
                    </div>
                  )
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
