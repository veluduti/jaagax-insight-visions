import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ExternalLink, EyeOff, Trash2, Ban, Flag, Search, Loader2 } from "lucide-react";
import { useAdminScopeFilter, applyAdminScope } from "@/contexts/AdminScopeFilterContext";
import { toast } from "sonner";

type FilterKey = "all" | "active" | "expired" | "reported" | "rejected" | "blocked";

interface PropertyRow {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  verification_status: string | null;
  is_live: boolean | null;
  expiry_date: string | null;
  submitted_by: string | null;
  is_featured?: boolean | null;
  created_at?: string | null;
}

const TAB_LABEL: Record<FilterKey, string> = {
  all: "All",
  active: "Active",
  expired: "Expired",
  reported: "Reported",
  rejected: "Rejected",
  blocked: "Blocked",
};

const AllListingsPanel = () => {
  const { effective: scope } = useAdminScopeFilter();
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: props }, { data: reports }] = await Promise.all([
      applyAdminScope<any>(
        (supabase as any)
          .from("properties")
          .select("id, title, city, locality, verification_status, is_live, expiry_date, submitted_by, is_featured, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        scope,
      ),
      (supabase as any)
        .from("property_reports")
        .select("property_id")
        .eq("status", "pending"),
    ]);
    setRows((props as PropertyRow[]) || []);
    setReportedIds(new Set((reports || []).map((r: any) => r.property_id)));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [scope.country, scope.state, scope.district]);

  const filtered = useMemo(() => {
    const now = Date.now();
    let list = rows;
    if (filter === "active") {
      list = list.filter(r => r.is_live === true && r.verification_status === "approved");
    } else if (filter === "expired") {
      list = list.filter(r =>
        r.verification_status === "expired" ||
        (r.expiry_date && new Date(r.expiry_date).getTime() < now)
      );
    } else if (filter === "reported") {
      list = list.filter(r => reportedIds.has(r.id));
    } else if (filter === "rejected") {
      list = list.filter(r => r.verification_status === "rejected");
    } else if (filter === "blocked") {
      list = list.filter(r => (r.verification_status || "").toUpperCase() === "BLOCKED");
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(r =>
        (r.title || "").toLowerCase().includes(q) ||
        (r.city || "").toLowerCase().includes(q) ||
        (r.locality || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, filter, query, reportedIds]);

  const counts = useMemo(() => {
    const now = Date.now();
    return {
      all: rows.length,
      active: rows.filter(r => r.is_live === true && r.verification_status === "approved").length,
      expired: rows.filter(r => r.verification_status === "expired" || (r.expiry_date && new Date(r.expiry_date).getTime() < now)).length,
      reported: rows.filter(r => reportedIds.has(r.id)).length,
      rejected: rows.filter(r => r.verification_status === "rejected").length,
      blocked: rows.filter(r => (r.verification_status || "").toUpperCase() === "BLOCKED").length,
    };
  }, [rows, reportedIds]);

  const handleDisable = async (r: PropertyRow) => {
    setBusyId(r.id);
    const { error } = await (supabase as any).rpc("admin_block_property", {
      _property_id: r.id,
      _reason: "Disabled by admin",
    });
    if (error) toast.error(error.message); else toast.success("Listing disabled");
    setBusyId(null);
    load();
  };

  const handleDelete = async (r: PropertyRow) => {
    if (!confirm(`Permanently delete "${r.title}"? This cannot be undone.`)) return;
    setBusyId(r.id);
    const { error } = await supabase.from("properties").delete().eq("id", r.id);
    if (error) toast.error(error.message); else toast.success("Listing deleted");
    setBusyId(null);
    load();
  };

  const handleBan = async (r: PropertyRow) => {
    if (!r.submitted_by) { toast.error("No owner found"); return; }
    if (!confirm("Ban this user? All their live listings will be taken offline.")) return;
    setBusyId(r.id);
    const { error } = await (supabase as any).rpc("admin_ban_user", {
      _user_id: r.submitted_by,
      _reason: "Repeated abuse",
    });
    if (error) toast.error(error.message); else toast.success("User banned");
    setBusyId(null);
    load();
  };

  const statusBadge = (r: PropertyRow) => {
    const expired = r.verification_status === "expired" ||
      (r.expiry_date && new Date(r.expiry_date).getTime() < Date.now());
    if ((r.verification_status || "").toUpperCase() === "BLOCKED") return <Badge variant="destructive">Blocked</Badge>;
    if (r.verification_status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
    if (expired) return <Badge variant="secondary">Expired</Badge>;
    if (r.is_live && r.verification_status === "approved") return <Badge className="bg-emerald-600">Active</Badge>;
    if (r.verification_status === "pending") return <Badge variant="outline">Pending</Badge>;
    return <Badge variant="outline">{r.verification_status ?? "—"}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5" />
          All Listings
          <Badge variant="secondary">{rows.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
          <TabsList className="flex flex-wrap h-auto">
            {(Object.keys(TAB_LABEL) as FilterKey[]).map((k) => (
              <TabsTrigger key={k} value={k} className="gap-1">
                {TAB_LABEL[k]}
                <Badge variant="outline" className="ml-1">{counts[k]}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, city or locality..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading listings...
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">No listings found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium max-w-[260px] truncate">
                      <div className="flex items-center gap-2">
                        {r.title}
                        {r.is_featured && <Badge className="bg-amber-500 text-white">Featured</Badge>}
                        {reportedIds.has(r.id) && <Badge variant="destructive">Reported</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[r.locality, r.city].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell>{statusBadge(r)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.expiry_date ? new Date(r.expiry_date).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => window.open(`/property/${r.id}`, "_blank")} className="gap-1">
                          <ExternalLink className="h-3 w-3" /> View
                        </Button>
                        <Button size="sm" variant="secondary" disabled={busyId === r.id} onClick={() => handleDisable(r)} className="gap-1">
                          <EyeOff className="h-3 w-3" /> Disable
                        </Button>
                        <Button size="sm" variant="destructive" disabled={busyId === r.id} onClick={() => handleDelete(r)} className="gap-1">
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                        <Button size="sm" variant="destructive" disabled={busyId === r.id || !r.submitted_by} onClick={() => handleBan(r)} className="gap-1">
                          <Ban className="h-3 w-3" /> Ban User
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AllListingsPanel;
