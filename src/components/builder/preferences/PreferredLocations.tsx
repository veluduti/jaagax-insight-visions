import { useEffect, useState, useCallback } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Trash2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fromTable } from "@/lib/supabaseHelper";
import {
  getPreferredLocations,
  getLocationStats,
  getRecommendationLocations,
  removePreferredLocation,
  PreferredLocation,
} from "@/services/locationPreferenceService";
import AddLocationModal from "./AddLocationModal";
import { toast } from "sonner";

export default function PreferredLocations() {
  const [builderId, setBuilderId] = useState<string | null>(null);
  const [locations, setLocations] = useState<PreferredLocation[]>([]);
  const [recommendations, setRecommendations] = useState<PreferredLocation[]>([]);
  const [stats, setStats] = useState({ total: 0, preferred: 0, visited: 0, searched: 0 });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const [list, s, recs] = await Promise.all([
        getPreferredLocations(id),
        getLocationStats(id),
        getRecommendationLocations(id),
      ]);
      setLocations(list);
      setStats(s);
      setRecommendations(recs.slice(0, 5));
    } catch (e: any) {
      toast.error(e.message || "Failed to load locations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: bp } = await fromTable("builder_profiles")
        .select("id")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (bp?.id) {
        setBuilderId(bp.id);
        load(bp.id);
      } else {
        setLoading(false);
      }
    })();
  }, [load]);

  const handleRemove = async (id: string) => {
    try {
      await removePreferredLocation(id);
      toast.success("Removed");
      if (builderId) load(builderId);
    } catch (e: any) {
      toast.error(e.message || "Failed to remove");
    }
  };

  const typeColor = (t: string) => {
    if (t === "preferred") return "bg-emerald-50 text-emerald-600 border-emerald-200";
    if (t === "visited") return "bg-amber-50 text-amber-600 border-amber-200";
    return "bg-indigo-50 text-indigo-600 border-indigo-200";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Preferred Locations</h1>
            <p className="text-muted-foreground">Manage your target cities for recommendations & alerts</p>
          </div>
          <Button onClick={() => setModalOpen(true)} disabled={!builderId}>
            <Plus className="h-4 w-4 mr-2" /> Add Location
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Preferred", value: stats.preferred, color: "text-emerald-600" },
            { label: "Visited", value: stats.visited, color: "text-amber-600" },
            { label: "Searched", value: stats.searched, color: "text-indigo-600" },
          ].map((s) => (
            <Card key={s.label} className="border-border shadow-sm">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {recommendations.length > 0 && (
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" /> Recommended Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {recommendations.map((r) => (
                  <Badge key={r.id} variant="outline" className="border-border">
                    {r.city}{r.locality ? `, ${r.locality}` : ""}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>All Locations</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : locations.length === 0 ? (
              <p className="text-muted-foreground text-sm">No locations yet. Add your first preferred location.</p>
            ) : (
              <div className="divide-y divide-border">
                {locations.map((l) => (
                  <div key={l.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-foreground">
                          {l.city}{l.locality ? `, ${l.locality}` : ""} {l.pincode ? `(${l.pincode})` : ""}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          Source: {l.source.replace("_", " ")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={typeColor(l.location_type)}>
                        {l.location_type}
                      </Badge>
                      <Button size="icon" variant="ghost" onClick={() => handleRemove(l.id)}>
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {builderId && (
          <AddLocationModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            builderProfileId={builderId}
            onAdded={() => load(builderId)}
          />
        )}
      </div>
    </div>
  );
}
