import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search, MapPin, Bed, IndianRupee, Building2, Trash2, Pencil, Bell, BellOff, Eye, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface SavedSearch {
  id: string;
  name: string;
  filters: any;
  alerts_enabled: boolean;
  last_count: number;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

const formatBudget = (n?: number | null) => {
  if (!n) return null;
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(0)}L`;
  return `₹${n}`;
};

const buildQuery = (f: any) => {
  let q = supabase.from("properties").select("*", { count: "exact", head: true });
  if (f?.city) q = q.ilike("city", `%${f.city}%`);
  if (f?.locality) q = q.ilike("locality", `%${f.locality}%`);
  if (f?.bhk && f.bhk !== "any") q = q.eq("bhk", Number(f.bhk));
  if (f?.propertyType && f.propertyType !== "any") q = q.eq("type", f.propertyType);
  if (f?.priceMax) q = q.lte("price", Number(f.priceMax));
  if (f?.priceMin) q = q.gte("price", Number(f.priceMin));
  return q;
};

export default function SavedSearchesPanel() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<SavedSearch | null>(null);
  const [editName, setEditName] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await (supabase as any)
      .from("saved_searches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const list: SavedSearch[] = data || [];
    setSearches(list);
    setLoading(false);

    // Refresh property counts in parallel
    const newCounts: Record<string, number> = {};
    await Promise.all(
      list.map(async (s) => {
        const { count } = await buildQuery(s.filters);
        newCounts[s.id] = count || 0;
        if ((count || 0) !== s.last_count) {
          await (supabase as any)
            .from("saved_searches")
            .update({ last_count: count || 0, last_checked_at: new Date().toISOString() })
            .eq("id", s.id);

          // If new properties matched & alerts enabled → create notification
          if (s.alerts_enabled && (count || 0) > s.last_count && s.last_count > 0) {
            const diff = (count || 0) - s.last_count;
            await (supabase as any).from("notifications").insert({
              user_id: user.id,
              type: "property",
              title: `${diff} new propert${diff > 1 ? "ies" : "y"} match "${s.name}"`,
              message: `New listings now match your saved search.`,
              link: `/map?savedSearch=${s.id}`,
            });
          }
        }
      }),
    );
    setCounts(newCounts);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleAlerts = async (s: SavedSearch) => {
    await (supabase as any)
      .from("saved_searches")
      .update({ alerts_enabled: !s.alerts_enabled })
      .eq("id", s.id);
    setSearches((prev) => prev.map((x) => (x.id === s.id ? { ...x, alerts_enabled: !x.alerts_enabled } : x)));
    toast({ title: s.alerts_enabled ? "Alerts disabled" : "Alerts enabled" });
  };

  const deleteSearch = async (id: string) => {
    await (supabase as any).from("saved_searches").delete().eq("id", id);
    setSearches((prev) => prev.filter((x) => x.id !== id));
    toast({ title: "Saved search deleted" });
  };

  const viewResults = (s: SavedSearch) => {
    const f = s.filters || {};
    const params = new URLSearchParams();
    if (f.city) params.set("city", f.city);
    if (f.locality) params.set("locality", f.locality);
    if (f.bhk) params.set("beds", String(f.bhk));
    if (f.propertyType) params.set("propertyType", f.propertyType);
    if (f.priceMax) params.set("priceMax", String(f.priceMax));
    if (f.transactionType) params.set("transactionType", f.transactionType);
    navigate(`/map?${params.toString()}`);
  };

  const saveEdit = async () => {
    if (!editing) return;
    await (supabase as any)
      .from("saved_searches")
      .update({ name: editName })
      .eq("id", editing.id);
    setSearches((prev) => prev.map((x) => (x.id === editing.id ? { ...x, name: editName } : x)));
    setEditing(null);
    toast({ title: "Search updated" });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">Loading saved searches…</CardContent>
      </Card>
    );
  }

  if (searches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saved Searches</CardTitle>
          <CardDescription>Save searches to get alerts when new properties match</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No saved searches yet</h3>
            <p className="text-muted-foreground mb-4">
              Use the bookmark button on the map to save a search and get instant alerts on matches.
            </p>
            <Button onClick={() => navigate("/map")}>
              <Plus className="h-4 w-4 mr-2" />
              Start Searching
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Saved Searches</CardTitle>
            <CardDescription>
              {searches.length} saved · Get notified when new properties match
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => navigate("/map")}>
            <Plus className="h-4 w-4 mr-1" /> New Search
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {searches.map((s) => {
            const f = s.filters || {};
            const liveCount = counts[s.id] ?? s.last_count;
            const newOnes = Math.max(0, liveCount - s.last_count);
            return (
              <div
                key={s.id}
                className="rounded-xl border border-border/60 bg-card/60 p-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-semibold text-foreground truncate">{s.name}</h4>
                      {newOnes > 0 && (
                        <Badge className="bg-primary text-primary-foreground">+{newOnes} new</Badge>
                      )}
                      {!s.alerts_enabled && (
                        <Badge variant="secondary" className="text-xs">Alerts off</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
                      {(f.city || f.locality) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[f.locality, f.city].filter(Boolean).join(", ")}
                        </span>
                      )}
                      {f.bhk && f.bhk !== "any" && (
                        <span className="flex items-center gap-1">
                          <Bed className="h-3 w-3" />
                          {f.bhk} BHK
                        </span>
                      )}
                      {f.propertyType && f.propertyType !== "any" && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {f.propertyType}
                        </span>
                      )}
                      {(f.priceMax || f.priceMin) && (
                        <span className="flex items-center gap-1">
                          <IndianRupee className="h-3 w-3" />
                          {formatBudget(f.priceMin)}{f.priceMin && f.priceMax ? " – " : "Up to "}{formatBudget(f.priceMax)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{liveCount}</span> properties found · Updated{" "}
                      {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
                      {s.alerts_enabled ? (
                        <Bell className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <Switch checked={s.alerts_enabled} onCheckedChange={() => toggleAlerts(s)} />
                    </div>
                    <Button size="sm" onClick={() => viewResults(s)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(s);
                        setEditName(s.name);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteSearch(s.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Saved Search</DialogTitle>
            <DialogDescription>Give your search a memorable name</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="search-name">Search name</Label>
            <Input id="search-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
