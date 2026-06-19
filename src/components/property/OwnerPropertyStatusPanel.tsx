import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PropertyStatusBadge } from "@/components/property/PropertyStatusBadge";
import { PropertyAuditLogDialog } from "@/components/property/PropertyAuditLogDialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Lock, History } from "lucide-react";

interface Row {
  id: string;
  title: string;
  lifecycle_status: string | null;
  edit_locked: boolean | null;
  expiry_date: string | null;
  assigned_agent_id: string | null;
  last_verified_at: string | null;
  agent?: { name?: string | null } | null;
}

const TIMELINE = [
  "submitted","pending_admin_review","agent_assigned","agent_accepted",
  "visit_scheduled","under_verification","verification_submitted",
  "pending_final_approval","live_verified",
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

  const load = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase.from as any)("properties")
        .select("id, title, lifecycle_status, edit_locked, expiry_date, assigned_agent_id, last_verified_at")
        .eq("submitted_by", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      const list: Row[] = data || [];
      const agentIds = Array.from(new Set(list.map(r => r.assigned_agent_id).filter(Boolean))) as string[];
      const agentsMap: Record<string, any> = {};
      if (agentIds.length) {
        const { data: ag } = await (supabase.from as any)("agents").select("id, name").in("id", agentIds);
        (ag || []).forEach((a: any) => { agentsMap[a.id] = a; });
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

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>;
  if (rows.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">My Listings — Status</h3>
      {rows.map((r) => {
        const stepIdx = TIMELINE.indexOf(r.lifecycle_status || "");
        const expDays = daysUntil(r.expiry_date);
        const showRenew = r.lifecycle_status === "expired";
        return (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium truncate">{r.title}</span>
                  <PropertyStatusBadge status={r.lifecycle_status} />
                  {r.edit_locked && (
                    <Badge variant="outline" className="text-[10px]">
                      <Lock className="w-3 h-3 mr-1" /> Locked
                    </Badge>
                  )}
                </div>
                {r.agent?.name && (
                  <div className="text-xs text-muted-foreground">Assigned agent: <strong>{r.agent.name}</strong></div>
                )}
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
              </div>
            </div>
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
    </div>
  );
}
