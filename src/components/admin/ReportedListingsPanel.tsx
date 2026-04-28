import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flag, Ban, EyeOff, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Report {
  id: string;
  property_id: string;
  reported_by: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  property?: { id: string; title: string; submitted_by: string | null; is_live: boolean | null } | null;
}

const REASON_LABEL: Record<string, string> = {
  fake: "Fake listing",
  wrong_info: "Wrong information",
  spam: "Spam / Duplicate",
  other: "Other",
};

const ReportedListingsPanel = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("property_reports")
      .select("*, property:properties(id, title, submitted_by, is_live)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setReports((data as Report[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string, notes?: string) => {
    const { data: auth } = await supabase.auth.getUser();
    await (supabase as any).from("property_reports").update({
      status,
      admin_notes: notes ?? null,
      resolved_by: auth.user?.id ?? null,
      resolved_at: new Date().toISOString(),
    }).eq("id", id);
  };

  const handleIgnore = async (r: Report) => {
    setBusy(r.id);
    await updateStatus(r.id, "ignored");
    toast.success("Report dismissed");
    setBusy(null);
    load();
  };

  const handleDisable = async (r: Report) => {
    if (!r.property_id) return;
    setBusy(r.id);
    const { error } = await (supabase as any).rpc("admin_block_property", {
      _property_id: r.property_id,
      _reason: `Reported as ${REASON_LABEL[r.reason] ?? r.reason}`,
    });
    if (error) { toast.error(error.message); setBusy(null); return; }
    await updateStatus(r.id, "actioned_disabled");
    toast.success("Listing disabled");
    setBusy(null);
    load();
  };

  const handleBan = async (r: Report) => {
    const ownerId = r.property?.submitted_by;
    if (!ownerId) { toast.error("No owner found for this listing"); return; }
    if (!confirm("Ban this user? All their live listings will be taken offline.")) return;
    setBusy(r.id);
    const { error } = await (supabase as any).rpc("admin_ban_user", {
      _user_id: ownerId,
      _reason: `Reported listing: ${REASON_LABEL[r.reason] ?? r.reason}`,
    });
    if (error) { toast.error(error.message); setBusy(null); return; }
    await updateStatus(r.id, "actioned_banned");
    toast.success("User banned and listings taken offline");
    setBusy(null);
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-destructive" />
          Reported Listings
          <Badge variant="secondary">{reports.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : reports.length === 0 ? (
          <p className="text-muted-foreground text-sm">No pending reports.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="font-semibold">
                      {r.property?.title ?? "Unknown listing"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant="destructive">{REASON_LABEL[r.reason] ?? r.reason}</Badge>
                </div>
                {r.details && (
                  <p className="text-sm text-muted-foreground">{r.details}</p>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => window.open(`/property/${r.property_id}`, "_blank")} className="gap-1">
                    <ExternalLink className="h-3 w-3" /> View
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => handleIgnore(r)} className="gap-1">
                    <Check className="h-3 w-3" /> Ignore
                  </Button>
                  <Button size="sm" variant="secondary" disabled={busy === r.id} onClick={() => handleDisable(r)} className="gap-1">
                    <EyeOff className="h-3 w-3" /> Disable Listing
                  </Button>
                  <Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => handleBan(r)} className="gap-1">
                    <Ban className="h-3 w-3" /> Ban User
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReportedListingsPanel;
