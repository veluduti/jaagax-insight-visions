import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { MapPin, Plus, X, Sparkles, MapPinned, TrendingUp, Search } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Loc {
  id: string;
  location_type: "city" | "locality";
  location_name: string;
  is_auto_suggested: boolean;
  created_at: string;
}

interface PreferredLocationsProps {
  userId: string;
  compact?: boolean;
}

export default function PreferredLocations({ userId, compact = false }: PreferredLocationsProps) {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"city" | "locality">("city");
  const [loading, setLoading] = useState(true);
  const [propertyCounts, setPropertyCounts] = useState<Record<string, number>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    const sb: any = supabase;

    const { data } = await sb
      .from("preferred_locations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const locations = (data || []) as Loc[];
    setLocs(locations);

    // Fetch property counts for each city location
    const cities = locations.filter((l) => l.location_type === "city").map((l) => l.location_name);
    if (cities.length > 0) {
      try {
        const { data: props } = await sb.from("properties").select("city").in("city", cities);
        const counts: Record<string, number> = {};
        (props || []).forEach((p: any) => {
          if (p.city) counts[p.city] = (counts[p.city] || 0) + 1;
        });
        setPropertyCounts(counts);
      } catch {
        /* ignore */
      }
    }

    setLoading(false);

    // Auto-suggest from agent's assigned properties / territories
    try {
      const { data: agentData } = await sb.from("agents").select("id").eq("user_id", userId).maybeSingle();
      if (agentData?.id) {
        const { data: assigned } = await sb
          .from("properties")
          .select("city")
          .eq("assigned_agent_id", agentData.id)
          .limit(5);
        const cities = Array.from(new Set((assigned || []).map((p: any) => p.city).filter(Boolean))) as string[];
        for (const c of cities) {
          const exists = locations.some((l) => l.location_name === c && l.location_type === "city");
          if (!exists) {
            await sb
              .from("preferred_locations")
              .insert({ user_id: userId, location_type: "city", location_name: c, is_auto_suggested: true })
              .then(() => {})
              .catch(() => {});
          }
        }
        if (cities.length > 0) {
          const { data: refreshed } = await sb
            .from("preferred_locations")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });
          setLocs((refreshed || []) as Loc[]);
        }
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (userId) load();
  }, [userId]);

  const add = async () => {
    if (!name.trim()) return;
    const sb: any = supabase;
    const { error } = await sb.from("preferred_locations").insert({
      user_id: userId,
      location_type: type,
      location_name: name.trim(),
      is_auto_suggested: false,
    });
    if (error) return toast.error(error.message);
    setName("");
    toast.success("Location added to your territory alerts");
    load();
  };

  const remove = async (id: string) => {
    const sb: any = supabase;
    await sb.from("preferred_locations").delete().eq("id", id);
    toast.success("Location removed");
    load();
  };

  const filtered = locs.filter((l) =>
    l.location_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const autoSuggested = filtered.filter((l) => l.is_auto_suggested);
  const manual = filtered.filter((l) => !l.is_auto_suggested);

  const Content = () => (
    <div className="space-y-4">
      {!compact && (
        <div className="flex gap-2 flex-wrap">
          <Select value={type} onValueChange={(v) => setType(v as any)}>
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="city">City</SelectItem>
              <SelectItem value="locality">Locality</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder={`Add ${type}…`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className="flex-1 min-w-[160px] h-9"
          />
          <Button onClick={add} className="bg-emerald-500 hover:bg-emerald-600 text-white h-9">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          <MapPinned className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No preferred locations yet.
          {compact && (
            <Button variant="link" size="sm" className="mt-1" onClick={() => setDialogOpen(true)}>
              Manage locations
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Manual locations */}
          {manual.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Your Territories
              </p>
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {manual.map((l) => (
                    <motion.div
                      key={l.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Badge
                        variant="outline"
                        className="gap-1.5 py-1.5 pr-1 pl-2.5 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
                      >
                        <MapPin className="h-3 w-3 text-primary" />
                        <span className="text-xs font-medium">
                          {l.location_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          · {l.location_type}
                        </span>
                        {propertyCounts[l.location_name] > 0 && (
                          <span className="text-[10px] text-emerald-600 font-semibold ml-0.5">
                            ({propertyCounts[l.location_name]} props)
                          </span>
                        )}
                        <button
                          onClick={() => remove(l.id)}
                          className="rounded-full hover:bg-destructive/10 hover:text-destructive p-0.5 ml-0.5 transition-colors"
                          aria-label="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Auto-suggested locations */}
          {autoSuggested.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                Auto-Suggested from Your Portfolio
              </p>
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {autoSuggested.map((l) => (
                    <motion.div
                      key={l.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Badge
                        variant="secondary"
                        className="gap-1.5 py-1.5 pr-1 pl-2.5 bg-amber-500/10 text-amber-700 border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                      >
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        <span className="text-xs font-medium">{l.location_name}</span>
                        <span className="text-[10px] opacity-70 capitalize">· {l.location_type}</span>
                        {propertyCounts[l.location_name] > 0 && (
                          <span className="text-[10px] font-semibold ml-0.5">
                            ({propertyCounts[l.location_name]})
                          </span>
                        )}
                        <button
                          onClick={() => remove(l.id)}
                          className="rounded-full hover:bg-destructive/10 hover:text-destructive p-0.5 ml-0.5 transition-colors"
                          aria-label="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Stats summary */}
          {!compact && locs.length > 0 && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{locs.length}</p>
                  <p className="text-[10px] text-muted-foreground">Tracked Locations</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">
                    {Object.values(propertyCounts).reduce((a, b) => a + b, 0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Properties in Area</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Compact card view (for dashboard embedding)
  if (compact) {
    return (
      <>
        <Card className="border-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-emerald-500" />
              Preferred Locations
            </CardTitle>
            <CardDescription className="text-xs">
              Get notified about new listings & price drops in your territories.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Content />
          </CardContent>
        </Card>

        {/* Full management dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-500" />
                Manage Preferred Locations
              </DialogTitle>
              <DialogDescription>
                Add or remove cities and localities you want to monitor for new property listings and leads.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={type} onValueChange={(v) => setType(v as any)}>
                  <SelectTrigger className="w-[120px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="city">City</SelectItem>
                    <SelectItem value="locality">Locality</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder={`Add ${type}…`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && add()}
                  className="flex-1 min-w-[160px] h-9"
                />
                <Button onClick={add} className="bg-emerald-500 hover:bg-emerald-600 text-white h-9">
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <Content />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Full page / section view
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-emerald-500" />
            Preferred Locations
          </CardTitle>
          <CardDescription>
            Track cities and localities to get notified about new listings, projects & price drops in your territories.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Content />
        </CardContent>
      </Card>
    </motion.div>
  );
}
