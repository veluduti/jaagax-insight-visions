import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, MapPin, User, ShieldCheck, Send } from "lucide-react";

type Row = {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  price: number | null;
  type: string | null;
  bhk: number | null;
  listing_status: string;
  verification_status: string;
  is_live: boolean;
  submitted_by: string | null;
  assigned_agent_id: string | null;
  created_at: string;
  listed_by?: string | null;
  document_urls?: any;
  agent_data?: any;
  seller?: { name?: string; phone?: string; email?: string } | null;
  agent?: { name?: string; phone?: string } | null;
  is_trusted_agent_submission?: boolean;
};

const STATUS_TABS = [
  { v: "all", label: "All" },
  { v: "complete", label: "New" },
  { v: "assigned_to_agent", label: "Assigned" },
  { v: "in_progress", label: "In progress" },
  { v: "verified", label: "Verified" },
  { v: "published", label: "Published" },
];

export default function AdminPropertiesPipeline() {
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      let q = (supabase.from as any)("properties")
        .select("id, title, city, locality, price, type, bhk, listing_status, verification_status, is_live, submitted_by, assigned_agent_id, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (tab !== "all") q = q.eq("listing_status", tab);
      const { data: props, error } = await q;
      if (error) throw error;

      const list: Row[] = props || [];
      const sellerIds = Array.from(new Set(list.map((r) => r.submitted_by).filter(Boolean))) as string[];
      const agentIds = Array.from(new Set(list.map((r) => r.assigned_agent_id).filter(Boolean))) as string[];

      const sellersMap: Record<string, any> = {};
      const agentsMap: Record<string, any> = {};
      if (sellerIds.length > 0) {
        const { data } = await (supabase.from as any)("profiles")
          .select("user_id, name, phone, email").in("user_id", sellerIds);
        for (const s of data || []) sellersMap[s.user_id] = s;
      }
      if (agentIds.length > 0) {
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

  const publish = async (row: Row) => {
    setActing(row.id);
    try {
      const { error } = await (supabase.from as any)("properties")
        .update({
          listing_status: "published",
          verification_status: "approved",
          verified: true,
          is_live: true,
          published_at: new Date().toISOString(),
        }).eq("id", row.id);
      if (error) throw error;

      if (row.submitted_by) {
        await (supabase.from as any)("notifications").insert({
          user_id: row.submitted_by,
          title: "Your property is now live 🎉",
          message: `"${row.title}" has been approved and published.`,
          type: "success",
          link: `/property/${row.id}`,
        });
      }
      toast.success("Property published");
      load();
    } catch (e: any) {
      toast.error(e.message || "Publish failed");
    } finally {
      setActing(null);
    }
  };

  const reassign = async (row: Row) => {
    setActing(row.id);
    try {
      await (supabase.from as any)("properties")
        .update({ assigned_agent_id: null, listing_status: "complete" })
        .eq("id", row.id);
      await supabase.functions.invoke("auto-assign-agent", { body: { property_id: row.id } });
      toast.success("Re-assignment triggered");
      load();
    } catch (e: any) {
      toast.error(e.message || "Reassign failed");
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Properties Pipeline</h1>
            <p className="text-sm text-muted-foreground">
              All listings across the seller → agent → admin workflow.
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mb-4">
          <TabsList className="flex flex-wrap h-auto">
            {STATUS_TABS.map((s) => (
              <TabsTrigger key={s.v} value={s.v} className="text-xs">{s.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">No properties in this state.</Card>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px]">{r.listing_status.replace(/_/g, " ")}</Badge>
                      <Badge variant="outline" className="text-[10px]">{r.verification_status}</Badge>
                      {r.is_live && <Badge className="text-[10px] bg-emerald-500">Live</Badge>}
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
                        <div className="text-muted-foreground flex items-center gap-1 mb-0.5"><User className="h-3 w-3" /> Seller</div>
                        <div className="font-medium">{r.seller?.name || "—"}</div>
                        {r.seller?.phone && <div className="text-muted-foreground">{r.seller.phone}</div>}
                        {r.seller?.email && <div className="text-muted-foreground truncate">{r.seller.email}</div>}
                      </div>
                      <div className="p-2 rounded bg-muted/40 border border-border">
                        <div className="text-muted-foreground flex items-center gap-1 mb-0.5"><ShieldCheck className="h-3 w-3" /> Agent</div>
                        <div className="font-medium">{r.agent?.name || "Unassigned"}</div>
                        {r.agent?.phone && <div className="text-muted-foreground">{r.agent.phone}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="lg:w-48 flex lg:flex-col gap-2 shrink-0">
                    {!r.assigned_agent_id && (
                      <Button size="sm" variant="outline" disabled={acting === r.id}
                        onClick={() => reassign(r)} className="w-full">
                        {acting === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                        Auto-assign
                      </Button>
                    )}
                    {r.listing_status === "verified" && !r.is_live && (
                      <Button size="sm" disabled={acting === r.id}
                        onClick={() => publish(r)}
                        className="w-full bg-gradient-to-r from-primary to-emerald-500">
                        {acting === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                        Approve & publish
                      </Button>
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
