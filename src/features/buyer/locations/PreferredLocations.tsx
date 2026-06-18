import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Plus, Trash2, Bell, BellOff, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import AddLocation from "./AddLocation";

interface BuyerLocation {
  id: string;
  name: string;
  city: string | null;
  locality: string | null;
  radius_km: number;
  notifications_enabled: boolean;
  last_notification_at: string | null;
  created_at: string;
}

export function PreferredLocations() {
  const [items, setItems] = useState<BuyerLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data, error } = await (supabase as any)
      .from("buyer_preferred_locations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as BuyerLocation[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let chan: any;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      chan = supabase
        .channel("buyer_locations:" + user.id)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "buyer_preferred_locations", filter: `user_id=eq.${user.id}` },
          () => load())
        .subscribe();
    })();
    return () => { if (chan) supabase.removeChannel(chan); };
  }, [load]);

  const toggleNotify = async (loc: BuyerLocation) => {
    const next = !loc.notifications_enabled;
    setItems((p) => p.map((x) => x.id === loc.id ? { ...x, notifications_enabled: next } : x));
    const { error } = await (supabase as any)
      .from("buyer_preferred_locations")
      .update({ notifications_enabled: next })
      .eq("id", loc.id);
    if (error) { toast.error(error.message); load(); }
    else toast.success(next ? "Alerts enabled" : "Alerts paused");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this saved location?")) return;
    const { error } = await (supabase as any).from("buyer_preferred_locations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Location removed");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Preferred Locations</h3>
          <p className="text-sm text-muted-foreground">Get alerts for new properties in areas you care about.</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Location
        </Button>
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <MapPin className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No locations saved yet.</p>
            <Button onClick={() => setAddOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Add your first location</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((loc) => (
            <Card key={loc.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{loc.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[loc.locality, loc.city].filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(loc.id)} aria-label="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Radius {loc.radius_km} km</Badge>
                  <Badge variant={loc.notifications_enabled ? "default" : "outline"} className="gap-1">
                    {loc.notifications_enabled ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
                    {loc.notifications_enabled ? "Alerts on" : "Alerts off"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-1 border-t">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Last notification:{" "}
                    {loc.last_notification_at
                      ? formatDistanceToNow(new Date(loc.last_notification_at), { addSuffix: true })
                      : "—"}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Notify</span>
                    <Switch checked={loc.notifications_enabled} onCheckedChange={() => toggleNotify(loc)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddLocation open={addOpen} onOpenChange={setAddOpen} onSaved={load} />
    </div>
  );
}

export default PreferredLocations;
