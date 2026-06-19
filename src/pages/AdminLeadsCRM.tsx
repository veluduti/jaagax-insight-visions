import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Phone, MessageCircle, MailIcon, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Lead = {
  id: string;
  property_id: string;
  lead_user_id: string | null;
  lead_name: string | null;
  lead_phone: string | null;
  lead_email: string | null;
  owner_id: string | null;
  assigned_agent_id: string | null;
  source: "call" | "whatsapp" | "inquiry" | string;
  status: "new" | "contacted" | "closed" | string;
  notes: string | null;
  created_at: string;
  property?: { title: string | null; city: string | null; locality: string | null } | null;
  owner?: { name?: string | null; phone?: string | null } | null;
  agent?: { name?: string | null; phone?: string | null } | null;
};

const STATUS_TABS = [
  { v: "all", label: "All" },
  { v: "new", label: "New" },
  { v: "contacted", label: "Contacted" },
  { v: "closed", label: "Closed" },
];

const SOURCE_COLORS: Record<string, string> = {
  call: "bg-emerald-500/20 text-emerald-700 border-emerald-500/30",
  whatsapp: "bg-green-500/20 text-green-700 border-green-500/30",
  inquiry: "bg-blue-500/20 text-blue-700 border-blue-500/30",
};

export default function AdminLeadsCRM() {
  const [tab, setTab] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Lead[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      let q = (supabase.from as any)("property_leads")
        .select("id, property_id, lead_user_id, lead_name, lead_phone, lead_email, owner_id, assigned_agent_id, source, status, notes, created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (tab !== "all") q = q.eq("status", tab);
      if (sourceFilter !== "all") q = q.eq("source", sourceFilter);
      const { data, error } = await q;
      if (error) throw error;
      const list: Lead[] = data || [];

      const propIds = Array.from(new Set(list.map((r) => r.property_id).filter(Boolean))) as string[];
      const userIds = Array.from(new Set([
        ...list.map((r) => r.owner_id),
        ...list.map((r) => r.assigned_agent_id),
      ].filter(Boolean))) as string[];

      const [{ data: props }, { data: users }] = await Promise.all([
        propIds.length
          ? (supabase.from as any)("properties").select("id, title, city, locality").in("id", propIds)
          : Promise.resolve({ data: [] }),
        userIds.length
          ? (supabase.from as any)("profiles").select("id, name, phone").in("id", userIds)
          : Promise.resolve({ data: [] }),
      ]);
      const propMap: Record<string, any> = {};
      (props || []).forEach((p: any) => { propMap[p.id] = p; });
      const userMap: Record<string, any> = {};
      (users || []).forEach((u: any) => { userMap[u.id] = u; });

      list.forEach((r) => {
        r.property = propMap[r.property_id] || null;
        r.owner = r.owner_id ? userMap[r.owner_id] : null;
        r.agent = r.assigned_agent_id ? userMap[r.assigned_agent_id] : null;
      });
      setRows(list);
    } catch (e: any) {
      toast.error(e.message || "Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab, sourceFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      [r.lead_name, r.lead_phone, r.lead_email, r.property?.title, r.property?.city, r.property?.locality, r.notes]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, search]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      const { error } = await (supabase.from as any)("property_leads")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success("Lead updated");
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (e: any) {
      toast.error(e.message || "Update failed");
    } finally {
      setUpdating(null);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { new: 0, contacted: 0, closed: 0 };
    rows.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [rows]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Leads CRM</h1>
            <p className="text-sm text-muted-foreground">Property enquiries — historical agent preserved per lead.</p>
          </div>
          <div className="flex gap-2 text-xs">
            <Badge variant="outline">New: {counts.new || 0}</Badge>
            <Badge variant="outline">Contacted: {counts.contacted || 0}</Badge>
            <Badge variant="outline">Closed: {counts.closed || 0}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {STATUS_TABS.map((t) => (
                <TabsTrigger key={t.v} value={t.v} className="text-xs">{t.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="inquiry">Inquiry</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, property…" className="pl-9 h-9" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">No leads found.</Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge className={`text-[10px] border ${SOURCE_COLORS[r.source] || "bg-muted"}`}>{r.source}</Badge>
                      <Badge variant={r.status === "new" ? "default" : r.status === "closed" ? "outline" : "secondary"} className="text-[10px]">{r.status}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <Link to={`/property/${r.property_id}`} target="_blank" className="font-semibold hover:text-primary inline-flex items-center gap-1">
                      {r.property?.title || "Untitled property"} <ExternalLink className="h-3 w-3" />
                    </Link>
                    {(r.property?.locality || r.property?.city) && (
                      <div className="text-xs text-muted-foreground">{[r.property?.locality, r.property?.city].filter(Boolean).join(", ")}</div>
                    )}

                    <div className="grid sm:grid-cols-3 gap-2 mt-3 text-xs">
                      <div className="p-2 rounded bg-muted/40 border border-border">
                        <div className="text-muted-foreground mb-0.5">Lead</div>
                        <div className="font-medium">{r.lead_name || "—"}</div>
                        {r.lead_phone && (
                          <a href={`tel:${r.lead_phone}`} className="text-muted-foreground flex items-center gap-1 hover:text-primary">
                            <Phone className="h-3 w-3" /> {r.lead_phone}
                          </a>
                        )}
                        {r.lead_email && (
                          <a href={`mailto:${r.lead_email}`} className="text-muted-foreground flex items-center gap-1 hover:text-primary">
                            <MailIcon className="h-3 w-3" /> {r.lead_email}
                          </a>
                        )}
                      </div>
                      <div className="p-2 rounded bg-muted/40 border border-border">
                        <div className="text-muted-foreground mb-0.5">Owner</div>
                        <div className="font-medium">{r.owner?.name || "—"}</div>
                        {r.owner?.phone && <div className="text-muted-foreground">{r.owner.phone}</div>}
                      </div>
                      <div className="p-2 rounded bg-muted/40 border border-border">
                        <div className="text-muted-foreground mb-0.5">Agent (snapshot)</div>
                        <div className="font-medium">{r.agent?.name || "Unassigned"}</div>
                        {r.agent?.phone && <div className="text-muted-foreground">{r.agent.phone}</div>}
                      </div>
                    </div>

                    {r.notes && (
                      <div className="mt-2 text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-2">{r.notes}</div>
                    )}
                  </div>

                  <div className="lg:w-48 flex lg:flex-col gap-2 shrink-0">
                    {r.lead_phone && (
                      <Button size="sm" variant="outline" asChild className="flex-1 lg:w-full">
                        <a href={`tel:${r.lead_phone}`}><Phone className="h-3.5 w-3.5 mr-1" /> Call</a>
                      </Button>
                    )}
                    {r.lead_phone && (
                      <Button size="sm" variant="outline" asChild className="flex-1 lg:w-full">
                        <a href={`https://wa.me/${r.lead_phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                          <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
                        </a>
                      </Button>
                    )}
                    <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)} disabled={updating === r.id}>
                      <SelectTrigger className="h-9 text-xs flex-1 lg:w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
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
