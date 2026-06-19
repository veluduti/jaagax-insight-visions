import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, MapPin, User, ShieldCheck, UserPlus, History } from "lucide-react";
import { AssignAgentDialog } from "@/components/admin/AssignAgentDialog";
import { PropertyStatusBadge } from "@/components/property/PropertyStatusBadge";
import { PropertyAuditLogDialog } from "@/components/property/PropertyAuditLogDialog";

type Row = {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  price: number | null;
  type: string | null;
  bhk: number | null;
  lifecycle_status: string | null;
  is_live: boolean;
  verified: boolean | null;
  submitted_by: string | null;
  assigned_agent_id: string | null;
  created_at: string;
  listed_by: string | null;
  listed_by_role_snapshot: string | null;
  force_verification: boolean | null;
  seller?: { name?: string; phone?: string; email?: string } | null;
  agent?: { name?: string; phone?: string } | null;
};

const STATUS_TABS = [
  { v: "all", label: "All" },
  { v: "pending_admin_review", label: "Pending Review" },
  { v: "agent_assigned", label: "Awaiting Agent" },
  { v: "agent_accepted,visit_scheduled,under_verification", label: "In Verification" },
  { v: "pending_final_approval", label: "Final Approval" },
  { v: "live,live_verified", label: "Live" },
  { v: "rejected", label: "Rejected" },
  { v: "expired", label: "Expired" },
];

function isAgentPosted(r: Row) {
  return (r.listed_by_role_snapshot ?? r.listed_by) === "agent";
}

export default function AdminPropertiesPipeline() {
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [assignFor, setAssignFor] = useState<Row | null>(null);
  const [auditFor, setAuditFor] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      let q = (supabase.from as any)("properties")
        .select(
          "id, title, city, locality, price, type, bhk, lifecycle_status, is_live, verified, submitted_by, assigned_agent_id, created_at, listed_by, listed_by_role_snapshot, force_verification"
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (tab !== "all") {
        const statuses = tab.split(",");
        q = q.in("lifecycle_status", statuses);
      }
      const { data: props, error } = await q;
      if (error) throw error;

      const list: Row[] = props || [];
      const sellerIds = Array.from(new Set(list.map((r) => r.submitted_by).filter(Boolean))) as string[];
      const agentIds = Array.from(new Set(list.map((r) => r.assigned_agent_id).filter(Boolean))) as string[];
      const sellersMap: Record<string, any> = {};
      const agentsMap: Record<string, any> = {};
      if (sellerIds.length) {
        const { data } = await (supabase.from as any)("profiles")
          .select("user_id, name, phone, email").in("user_id", sellerIds);
        for (const s of data || []) sellersMap[s.user_id] = s;
      }
      if (agentIds.length) {
        const { data } = await (supabase.from as any)("agents")
          .select("id, name, phone").in("id", agentIds);
        for (const a of data || []) agentsMap[a.id] = a;
      }
      setRows(list.map((r) => ({
        ...r,
        seller: r.submitted_by ? sellersMap[r.submitted_by] : null,
        agent: r.assigned_agent_id ? agentsMap[r.assigned_agent_id] : null,
      })));
    } catch (e: any) {
      toast.error(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const updateStatus = async (row: Row, next: string, extra: any = {}) => {
    const { error } = await (supabase.from as any)("properties")
      .update({ lifecycle_status: next, ...extra }).eq("id", row.id);
    if (error) throw error;
  };

  const approveAgentPostedDirect = async (row: Row) => {
    // Agent-posted, no force_verification → goes straight to LIVE (no Verified badge)
    setActing(row.id);
    try {
      await updateStatus(row, "live", { published_at: new Date().toISOString() });
      if (row.submitted_by) {
        await (supabase.from as any)("notifications").insert({
          user_id: row.submitted_by,
          title: "Your listing is live 🎉",
          message: `"${row.title}" was approved and is now visible to buyers.`,
          type: "success", link: `/property/${row.id}`,
        });
      }
      toast.success("Listing is now live");
      load();
    } catch (e: any) {
      toast.error(e.message || "Approve failed");
    } finally { setActing(null); }
  };

  const approveFinalVerified = async (row: Row) => {
    setActing(row.id);
    try {
      await updateStatus(row, "live_verified", { published_at: new Date().toISOString() });
      if (row.submitted_by) {
        await (supabase.from as any)("notifications").insert({
          user_id: row.submitted_by,
          title: "Listing approved & verified ✅",
          message: `"${row.title}" is live with a Verified badge.`,
          type: "success", link: `/property/${row.id}`,
        });
      }
      if (row.assigned_agent_id) {
        await (supabase.from as any)("notifications").insert({
          user_id: row.assigned_agent_id,
          title: "Verification approved",
          message: `"${row.title}" is now Live + Verified.`,
          type: "success", link: "/dashboard/agent",
        });
      }
      toast.success("Listing approved & verified");
      load();
    } catch (e: any) {
      toast.error(e.message || "Approve failed");
    } finally { setActing(null); }
  };

  const reject = async (row: Row) => {
    const reason = window.prompt("Reason for rejection?") || "Not approved";
    setActing(row.id);
    try {
      await updateStatus(row, "rejected", { rejection_reason: reason });
      if (row.submitted_by) {
        await (supabase.from as any)("notifications").insert({
          user_id: row.submitted_by,
          title: "Property rejected",
          message: `"${row.title}" was rejected. Reason: ${reason}`,
          type: "alert", link: `/property/${row.id}`,
        });
      }
      toast.success("Property rejected");
      load();
    } catch (e: any) {
      toast.error(e.message || "Reject failed");
    } finally { setActing(null); }
  };

  const toggleForceVerification = async (row: Row, on: boolean) => {
    try {
      await (supabase.from as any)("properties")
        .update({ force_verification: on }).eq("id", row.id);
      toast.success(on ? "Verification enforced" : "Direct-approve enabled");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Properties Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Full lifecycle: submission → agent assignment → verification → live.
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mb-4">
          <TabsList className="flex flex-wrap h-auto">
            {STATUS_TABS.map((s) => (
              <TabsTrigger key={s.v} value={s.v} className="text-xs">{s.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">No properties in this state.</Card>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const agentPosted = isAgentPosted(r);
              const directApprovable = r.lifecycle_status === "pending_admin_review" && agentPosted && !r.force_verification;
              const needsAssignment = r.lifecycle_status === "pending_admin_review" && (!agentPosted || r.force_verification);
              const finalApprovable = r.lifecycle_status === "pending_final_approval";
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <PropertyStatusBadge status={r.lifecycle_status} />
                        {agentPosted && <Badge className="text-[10px] bg-amber-500 text-white">Agent posted</Badge>}
                        {r.force_verification && <Badge variant="outline" className="text-[10px]">Force verify</Badge>}
                        {r.type && <Badge variant="outline" className="text-[10px]">{r.type}</Badge>}
                        {r.bhk && <Badge variant="outline" className="text-[10px]">{r.bhk} BHK</Badge>}
                      </div>
                      <Link to={`/property/${r.id}`} target="_blank" className="font-semibold hover:text-primary block truncate">
                        {r.title}
                      </Link>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> {r.locality || "—"}, {r.city || "—"} · ₹ {r.price ? new Intl.NumberFormat("en-IN").format(r.price) : "—"}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2 mt-3 text-xs">
                        <div className="p-2 rounded bg-muted/40 border border-border">
                          <div className="text-muted-foreground flex items-center gap-1 mb-0.5"><User className="h-3 w-3" /> Owner</div>
                          <div className="font-medium">{r.seller?.name || "—"}</div>
                          {r.seller?.phone && <div className="text-muted-foreground">{r.seller.phone}</div>}
                        </div>
                        <div className="p-2 rounded bg-muted/40 border border-border">
                          <div className="text-muted-foreground flex items-center gap-1 mb-0.5"><ShieldCheck className="h-3 w-3" /> Agent</div>
                          <div className="font-medium">{r.agent?.name || "Unassigned"}</div>
                          {r.agent?.phone && <div className="text-muted-foreground">{r.agent.phone}</div>}
                        </div>
                      </div>
                    </div>

                    <div className="lg:w-56 flex lg:flex-col gap-2 shrink-0">
                      {agentPosted && r.lifecycle_status === "pending_admin_review" && (
                        <div className="flex items-center gap-2 text-xs">
                          <Switch id={`fv-${r.id}`} checked={!!r.force_verification}
                            onCheckedChange={(v) => toggleForceVerification(r, !!v)} />
                          <Label htmlFor={`fv-${r.id}`}>Require verification</Label>
                        </div>
                      )}

                      {directApprovable && (
                        <Button size="sm" disabled={acting === r.id} onClick={() => approveAgentPostedDirect(r)} className="w-full">
                          {acting === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                          Approve → Live
                        </Button>
                      )}

                      {needsAssignment && (
                        <Button size="sm" variant="outline" onClick={() => setAssignFor(r)} className="w-full">
                          <UserPlus className="h-3.5 w-3.5 mr-1" /> Assign agent
                        </Button>
                      )}

                      {finalApprovable && (
                        <Button size="sm" disabled={acting === r.id} onClick={() => approveFinalVerified(r)} className="w-full bg-gradient-to-r from-primary to-emerald-500">
                          {acting === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                          Approve & Verify
                        </Button>
                      )}

                      {(directApprovable || needsAssignment || finalApprovable) && (
                        <Button size="sm" variant="outline" disabled={acting === r.id} onClick={() => reject(r)}
                          className="w-full border-destructive/50 text-destructive hover:bg-destructive/10">
                          Reject
                        </Button>
                      )}

                      <Button size="sm" variant="ghost" onClick={() => setAuditFor(r)} className="w-full text-xs">
                        <History className="h-3.5 w-3.5 mr-1" /> Audit log
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {assignFor && (
          <AssignAgentDialog
            propertyId={assignFor.id}
            propertyTitle={assignFor.title}
            open={!!assignFor}
            onOpenChange={(o) => !o && setAssignFor(null)}
            onAssigned={load}
          />
        )}

        {auditFor && (
          <PropertyAuditLogDialog
            propertyId={auditFor.id}
            propertyTitle={auditFor.title}
            open={!!auditFor}
            onOpenChange={(o) => !o && setAuditFor(null)}
          />
        )}
      </div>
    </div>
  );
}
