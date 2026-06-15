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
import { MapPin, Plus, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Loc {
  id: string;
  location_type: "city" | "locality";
  location_name: string;
  is_auto_suggested: boolean;
}

export default function PreferredLocations({ userId }: { userId: string }) {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"city" | "locality">("city");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const sb: any = supabase;
    const { data } = await sb
      .from("preferred_locations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setLocs((data || []) as Loc[]);
    setLoading(false);

    // Auto-suggest from recent searches / favorites (best-effort, non-blocking)
    try {
      const { data: favs } = await sb
        .from("favorites")
        .select("property_id")
        .eq("user_id", userId)
        .limit(5);
      if (favs?.length) {
        const ids = favs.map((f: any) => f.property_id);
        const { data: props } = await sb.from("properties").select("city").in("id", ids);
        const cities = Array.from(new Set((props || []).map((p: any) => p.city).filter(Boolean))) as string[];
        for (const c of cities) {
          await sb
            .from("preferred_locations")
            .insert({ user_id: userId, location_type: "city", location_name: c, is_auto_suggested: true })
            .then(() => {})
            .catch(() => {});
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
    toast.success("Location added to alerts");
    load();
  };

  const remove = async (id: string) => {
    const sb: any = supabase;
    await sb.from("preferred_locations").delete().eq("id", id);
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5 text-emerald-500" /> Preferred Locations
        </CardTitle>
        <CardDescription>Get notified about new listings, projects & price drops in these places.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <Select value={type} onValueChange={(v) => setType(v as any)}>
            <SelectTrigger className="w-[120px]">
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
            className="flex-1 min-w-[160px]"
          />
          <Button onClick={add} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : locs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No preferred locations yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {locs.map((l) => (
              <Badge key={l.id} variant="outline" className="gap-1.5 py-1 pr-1 pl-2">
                {l.is_auto_suggested && <Sparkles className="h-3 w-3 text-amber-500" />}
                <span className="text-xs">
                  {l.location_name} · {l.location_type}
                </span>
                <button
                  onClick={() => remove(l.id)}
                  className="rounded-full hover:bg-muted p-0.5"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
