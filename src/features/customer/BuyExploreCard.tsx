import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, Map, PieChart, ArrowLeftRight, UserSearch, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { openInNewTab, propertyPath } from "@/lib/openInNewTab";

interface PropRow {
  id: string;
  slug?: string | null;
  title: string | null;
  city: string | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  images: any;
  status: string | null;
}

const TOOLS = [
  { label: "Explore Map", icon: Map, path: "/map" },
  { label: "Visit Analytics", icon: PieChart, path: "/visit/analytics" },
  { label: "Compare", icon: ArrowLeftRight, path: "/compare" },
  { label: "Find Agent", icon: UserSearch, path: "/agents" },
  { label: "Property Value", icon: IndianRupee, path: "/valuation" },
];

const firstImage = (images: any): string | null => {
  if (Array.isArray(images) && images.length) return typeof images[0] === "string" ? images[0] : images[0]?.url ?? null;
  if (typeof images === "string" && images.startsWith("http")) return images;
  return null;
};

/** Left column "Buy & Explore" card: discovery shortcuts + recommended properties. */
export default function BuyExploreCard({ onNavigateTab }: { onNavigateTab: (id: string) => void }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PropRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("properties")
          .select("id,slug,title,city,property_type,bedrooms,bathrooms,area_sqft,images,status")
          .in("status", ["live", "live_verified"])
          .order("created_at", { ascending: false })
          .limit(24);
        if (!cancelled) setRows((data as PropRow[]) || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cities = useMemo(
    () => Array.from(new Set(rows.map((r) => r.city).filter(Boolean) as string[])).sort(),
    [rows],
  );
  const visible = (city === "all" ? rows : rows.filter((r) => r.city === city)).slice(0, 4);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Compass className="h-4 w-4 text-primary" />
          Buy & Explore
        </CardTitle>
        <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onNavigateTab("buying")}>
          View all
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {TOOLS.map((t) => (
            <Button key={t.label} variant="outline" size="sm" className="gap-2 rounded-full" onClick={() => navigate(t.path)}>
              <t.icon className="h-4 w-4 text-primary" />
              {t.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Recommended Properties</h3>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="h-9 w-[160px] bg-background">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent className="z-50 bg-background">
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No properties to recommend yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {visible.map((p) => {
              const img = firstImage(p.images);
              return (
                <div key={p.id} className="overflow-hidden rounded-xl border bg-card">
                  <div className="flex h-36 items-center justify-center bg-muted">
                    {img ? (
                      <img src={img} alt={p.title || "Property"} loading="lazy" className="h-36 w-full object-cover" />
                    ) : (
                      <span className="text-xs text-muted-foreground">No image</span>
                    )}
                  </div>
                  <div className="space-y-1 p-3">
                    <div className="truncate text-sm font-semibold">
                      {p.bedrooms ? `${p.bedrooms} BHK • ` : ""}
                      {p.property_type || p.title || "Property"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[p.bedrooms ? `${p.bedrooms} BHK` : null, p.bathrooms ? `${p.bathrooms} Baths` : null, p.area_sqft ? `${p.area_sqft} sq ft` : null]
                        .filter(Boolean)
                        .join(" • ") || "Details on request"}
                    </div>
                    {p.status === "live_verified" && <Badge variant="secondary">Verified</Badge>}
                    <button
                      type="button"
                      className="block pt-1 text-xs font-medium text-primary hover:underline"
                      onClick={() => openInNewTab(propertyPath(p as any))}
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
