import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Hotel, Star, ArrowRight } from "lucide-react";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80";

const RADIUS_STEPS = [5, 10, 20, 50, 100];

interface Props {
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  propertyTitle?: string | null;
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatPrice(p: number | null | undefined) {
  const n = Number(p) || 0;
  if (!n) return "Price on request";
  return `₹${n.toLocaleString("en-IN")}/night`;
}

/**
 * Hotels near a property. Starts at 5km and widens (10 → 20 → 50 → 100km).
 * Renders nothing when no hotels can be matched.
 */
const NearbyPropertyHotels = ({ latitude, longitude, city, propertyTitle }: Props) => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [radius, setRadius] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  const hasCoords =
    latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined;

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from("partner_hotels")
          .select("id,name,city,locality,images,price_per_night,star_rating,latitude,longitude")
          .eq("is_active", true)
          .limit(400);
        if (error) console.error("[NearbyPropertyHotels]", error);
        if (!alive) return;

        const rows = (data || []) as any[];

        const cityMatches = city
          ? rows.filter((r) =>
              String(r.city || "").toLowerCase().includes(String(city).toLowerCase()),
            )
          : [];

        if (!hasCoords) {
          setRadius(null);
          setItems(cityMatches.slice(0, 12));
          return;
        }

        const withDistance = rows
          .filter((r) => r.latitude != null && r.longitude != null)
          .map((r) => ({
            ...r,
            _distance: distanceKm(
              Number(latitude),
              Number(longitude),
              Number(r.latitude),
              Number(r.longitude),
            ),
          }))
          .sort((a, b) => a._distance - b._distance);

        let picked: any[] = [];
        let usedRadius: number | null = null;
        for (const step of RADIUS_STEPS) {
          const inRange = withDistance.filter((r) => r._distance <= step);
          if (inRange.length) {
            picked = inRange;
            usedRadius = step;
            if (inRange.length >= 3) break;
          }
        }

        if (!picked.length) {
          setRadius(null);
          setItems(cityMatches.slice(0, 12));
        } else {
          setRadius(usedRadius);
          setItems(picked.slice(0, 12));
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [latitude, longitude, city, hasCoords]);

  if (!loading && items.length === 0) return null;

  const visible = expanded ? items : items.slice(0, 4);

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Hotel className="h-5 w-5 text-primary" />
            Nearby Hotels
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {radius
              ? `Stays within ${radius} km of ${propertyTitle || "this property"}`
              : `Stays in ${city || "this area"}`}
          </p>
        </div>
        {city && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(`/hotels?city=${encodeURIComponent(city)}`, "_blank")}
          >
            Browse all <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {visible.map((h) => (
              <Card
                key={h.id}
                onClick={() => window.open(`/hotels/${h.id}`, "_blank")}
                className="overflow-hidden cursor-pointer group hover:shadow-lg transition-shadow"
              >
                <div className="relative h-36 overflow-hidden bg-muted">
                  <img
                    src={Array.isArray(h.images) && h.images.length ? h.images[0] : FALLBACK_IMG}
                    alt={h.name || "Hotel"}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => ((e.currentTarget as HTMLImageElement).src = FALLBACK_IMG)}
                  />
                  {h.star_rating ? (
                    <Badge className="absolute top-2 left-2 gap-1 text-[10px]">
                      <Star className="h-3 w-3" /> {h.star_rating}
                    </Badge>
                  ) : null}
                  {typeof h._distance === "number" && (
                    <Badge variant="secondary" className="absolute bottom-2 right-2 text-[10px]">
                      {h._distance < 1
                        ? `${Math.round(h._distance * 1000)} m away`
                        : `${h._distance.toFixed(1)} km away`}
                    </Badge>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold line-clamp-1">{h.name || "Hotel"}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {[h.locality, h.city].filter(Boolean).join(", ") || "N/A"}
                    </span>
                  </div>
                  <div className="text-base font-bold text-primary mt-2">
                    {formatPrice(h.price_per_night)}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {items.length > 4 && !expanded && (
            <div className="flex justify-center mt-5">
              <Button variant="outline" onClick={() => setExpanded(true)}>
                Show more hotels
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default NearbyPropertyHotels;
