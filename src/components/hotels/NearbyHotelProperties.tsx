import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getPublicPropertyView } from "@/lib/publicPropertyView";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, CheckCircle2, Home, ArrowRight } from "lucide-react";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80";

const RADIUS_STEPS = [5, 10, 20, 50, 100];

interface Props {
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  hotelName?: string | null;
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

function formatPrice(price: number | null | undefined) {
  const p = Number(price) || 0;
  if (!p) return "Price on request";
  if (p >= 10000000) return `₹${(p / 10000000).toFixed(2)} Cr`;
  if (p >= 100000) return `₹${(p / 100000).toFixed(2)} L`;
  return `₹${p.toLocaleString("en-IN")}`;
}

/**
 * Properties near a hotel. Starts at a 5km radius and widens
 * (10 → 20 → 50 → 100km) until at least a few listings are found.
 */
const NearbyHotelProperties = ({ latitude, longitude, city, hotelName }: Props) => {
  const navigate = useNavigate();
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
        const query = supabase
          .from("properties")
          .select("*")
          .neq("is_draft", true)
          .not("title", "is", null)
          .limit(400);

        const { data, error } = await query;
        if (error) console.error("[NearbyHotelProperties]", error);
        if (!alive) return;

        const rows = (data || []).map((row: any) => {
          const v = getPublicPropertyView(row);
          return v
            ? {
                ...row,
                title: v.title ?? row.title,
                city: v.city ?? row.city,
                locality: v.locality ?? row.locality,
                price: v.price ?? row.price,
                area_sqft: v.area_sqft ?? row.area_sqft,
                bedrooms: v.bedrooms ?? row.bedrooms,
                images: v.images?.length ? v.images : row.images,
              }
            : row;
        });

        const cityMatches = city
          ? rows.filter((r: any) =>
              String(r.city || "").toLowerCase().includes(String(city).toLowerCase()),
            )
          : [];
        const cityFallback = (cityMatches.length ? cityMatches : rows).slice(0, 12);

        if (!hasCoords) {
          setRadius(null);
          setItems(cityFallback);
          return;
        }

        const withDistance = rows
          .filter((r: any) => r.latitude != null && r.longitude != null)
          .map((r: any) => ({
            ...r,
            _distance: distanceKm(
              Number(latitude),
              Number(longitude),
              Number(r.latitude),
              Number(r.longitude),
            ),
          }))
          .sort((a: any, b: any) => a._distance - b._distance);

        let picked: any[] = [];
        let usedRadius: number | null = null;
        for (const step of RADIUS_STEPS) {
          const inRange = withDistance.filter((r: any) => r._distance <= step);
          if (inRange.length >= 3 || (inRange.length > 0 && step === RADIUS_STEPS[RADIUS_STEPS.length - 1])) {
            picked = inRange;
            usedRadius = step;
            break;
          }
          if (inRange.length > 0) {
            picked = inRange;
            usedRadius = step;
          }
        }
        if (!picked.length) {
          setRadius(null);
          setItems(cityFallback);
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
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            Properties near this hotel
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {radius
              ? `Verified listings within ${radius} km of ${hotelName || "the hotel"}`
              : `Listings in ${city || "this area"}`}
          </p>
        </div>
        {city && (
          <Button variant="ghost" size="sm" onClick={() => navigate(`/search?city=${encodeURIComponent(city)}`)}>
            Browse all <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visible.map((p) => (
              <Card
                key={p.id}
                onClick={() => window.open(`/property/${p.slug || p.id}`, "_blank")}
                className="overflow-hidden cursor-pointer group hover:shadow-lg transition-shadow"
              >
                <div className="relative h-40 overflow-hidden bg-muted">
                  <img
                    src={Array.isArray(p.images) && p.images.length ? p.images[0] : FALLBACK_IMG}
                    alt={p.title || "Property"}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => ((e.currentTarget as HTMLImageElement).src = FALLBACK_IMG)}
                  />
                  {p.verified && (
                    <Badge className="absolute top-2 left-2 gap-1 text-[10px]">
                      <CheckCircle2 className="h-3 w-3" /> Verified
                    </Badge>
                  )}
                  {typeof p._distance === "number" && (
                    <Badge variant="secondary" className="absolute bottom-2 right-2 text-[10px]">
                      {p._distance < 1
                        ? `${Math.round(p._distance * 1000)} m away`
                        : `${p._distance.toFixed(1)} km away`}
                    </Badge>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold line-clamp-1">{p.title || "Property"}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{[p.locality, p.city].filter(Boolean).join(", ") || "N/A"}</span>
                  </div>
                  <div className="text-lg font-bold text-primary mt-2">{formatPrice(p.price)}</div>
                  <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                    {p.bedrooms ? <span>{p.bedrooms} Beds</span> : null}
                    {p.bedrooms && p.area_sqft ? <span>•</span> : null}
                    {p.area_sqft ? <span>{p.area_sqft} sq.ft</span> : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {items.length > 4 && !expanded && (
            <div className="flex justify-center mt-5">
              <Button variant="outline" onClick={() => setExpanded(true)}>
                Show more properties
              </Button>
            </div>
          )}
          {expanded && (
            <div className="flex justify-center mt-5">
              <Button onClick={() => navigate(`/search${city ? `?city=${encodeURIComponent(city)}` : ""}`)}>
                View all properties <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default NearbyHotelProperties;
