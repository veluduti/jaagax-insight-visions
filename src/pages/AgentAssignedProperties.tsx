import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, MapPin, Phone, Mail, ChevronRight, CheckCircle2 } from "lucide-react";

type Row = {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  price: number | null;
  area_sqft: number | null;
  type: string | null;
  bhk: number | null;
  listing_status: string;
  submitted_by: string | null;
  created_at: string;
  seller?: { name?: string; phone?: string; email?: string } | null;
};

const NEXT_STATUS: Record<string, string> = {
  assigned_to_agent: "in_progress",
  in_progress: "verified",
};
const NEXT_LABEL: Record<string, string> = {
  assigned_to_agent: "Start verification",
  in_progress: "Mark as verified",
};

export default function AgentAssignedProperties() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: agent } = await (supabase.from as any)("agents")
        .select("id").eq("user_id", user.id).maybeSingle();
      if (!agent) { setRows([]); return; }

      const { data: props } = await (supabase.from as any)("properties")
        .select("id, title, city, locality, price, area_sqft, type, bhk, listing_status, submitted_by, created_at")
        .eq("assigned_agent_id", agent.id)
        .order("created_at", { ascending: false });

      const list: Row[] = props || [];
      // Fetch seller contact for each unique seller
      const sellerIds = Array.from(new Set(list.map((r) => r.submitted_by).filter(Boolean))) as string[];
      const sellersMap: Record<string, any> = {};
      if (sellerIds.length > 0) {
        const { data: sellers } = await (supabase.from as any)("profiles")
          .select("user_id, name, phone, email")
          .in("user_id", sellerIds);
        for (const s of sellers || []) sellersMap[s.user_id] = s;
      }
      setRows(list.map((r) => ({ ...r, seller: r.submitted_by ? sellersMap[r.submitted_by] : null })));
    } catch (e: any) {
      toast.error(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const advance = async (row: Row) => {
    const next = NEXT_STATUS[row.listing_status];
    if (!next) return;
    setUpdating(row.id);
    try {
      const updates: any = { listing_status: next, updated_at: new Date().toISOString() };
      if (next === "verified") updates.verified = true;

      const { error } = await (supabase.from as any)("properties")
        .update(updates).eq("id", row.id);
      if (error) throw error;

      // Sync agent_tasks
      const taskStatus = next === "in_progress" ? "in_progress" : "completed";
      await (supabase.from as any)("agent_tasks")
        .update({
          status: taskStatus,
          completed_at: taskStatus === "completed" ? new Date().toISOString() : null,
        })
        .eq("property_id", row.id);

      // Notify seller
      if (row.submitted_by) {
        await (supabase.from as any)("notifications").insert({
          user_id: row.submitted_by,
          title: next === "verified" ? "Verification complete ✅" : "Verification in progress",
          message: next === "verified"
            ? `Your property "${row.title}" was verified by the agent and is awaiting admin approval.`
            : `Your agent has started verifying "${row.title}".`,
          type: next === "verified" ? "success" : "info",
          link: "/dashboard/seller",
          metadata: { property_id: row.id },
        });
      }

      toast.success(`Status updated → ${next.replace("_", " ")}`);
      load();
    } catch (e: any) {
      toast.error(e.message || "Update failed");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Assigned Properties</h1>
          <p className="text-sm text-muted-foreground">
            Verify newly submitted listings, then send to admin for final approval.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            No properties assigned yet. New listings will appear here automatically.
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={r.listing_status === "verified" ? "default" : "secondary"} className="text-[10px]">
                        {r.listing_status.replace(/_/g, " ")}
                      </Badge>
                      {r.type && <Badge variant="outline" className="text-[10px]">{r.type}</Badge>}
                      {r.bhk && <Badge variant="outline" className="text-[10px]">{r.bhk} BHK</Badge>}
                    </div>
                    <Link to={`/property/${r.id}`} target="_blank" className="font-semibold hover:text-primary block truncate">
                      {r.title}
                    </Link>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {r.locality || "—"}, {r.city || "—"}
                    </div>

                    {r.seller && (
                      <div className="mt-3 p-2.5 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
                        <div className="font-medium text-foreground/90">Seller: {r.seller.name || "—"}</div>
                        {r.seller.phone && (
                          <a href={`tel:${r.seller.phone}`} className="flex items-center gap-1.5 text-primary">
                            <Phone className="h-3 w-3" /> {r.seller.phone}
                          </a>
                        )}
                        {r.seller.email && (
                          <a href={`mailto:${r.seller.email}`} className="flex items-center gap-1.5 text-primary">
                            <Mail className="h-3 w-3" /> {r.seller.email}
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="sm:w-44 flex sm:flex-col gap-2 shrink-0">
                    {NEXT_STATUS[r.listing_status] ? (
                      <Button
                        size="sm"
                        onClick={() => advance(r)}
                        disabled={updating === r.id}
                        className="w-full bg-gradient-to-r from-primary to-emerald-500"
                      >
                        {updating === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 mr-1" />
                        )}
                        {NEXT_LABEL[r.listing_status]}
                      </Button>
                    ) : (
                      <div className="text-xs text-emerald-600 flex items-center gap-1 justify-center">
                        <CheckCircle2 className="h-4 w-4" /> {r.listing_status}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
