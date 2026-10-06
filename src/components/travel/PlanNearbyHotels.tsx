import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Hotel, Loader2, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { searchHotels } from "@/services/hotelChannelService";
import { boardLabel, ratePlanSellPrice, type CanonicalProperty } from "@/types/hotelCanonical";
import { HOTEL_IMAGE_FALLBACK, resolveHotelImage } from "@/lib/hotelImage";
import { canonicalizeCity } from "@/lib/cityNormalizer";

type Stay = { hotel: CanonicalProperty; image: string };

export default function PlanNearbyHotels({ destination }: { destination?: string | null }) {
  const city = (destination?.trim() ?? "").split(",")[0].trim();
  const [stays, setStays] = useState<Stay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [expandedHotel, setExpandedHotel] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let alive = true;
    setStays([]);
    setError(false);
    setExpandedHotel(null);
    if (!city) return;
    setLoading(true);
    const cities = Array.from(new Set(city.split(/\s+(?:and|to)\s+|\s*[&/]\s*/i).map(canonicalizeCity).filter(Boolean))).slice(0, 4);
    void Promise.all(cities.map((city) => searchHotels({ city, limit: showAll ? 18 : 6 }))).then(async (results) => {
      const unique = new Map(results.flatMap((result) => result.results ?? []).filter((hotel) => hotel.jaagaHotelId).map((hotel) => [hotel.jaagaHotelId, hotel]));
      const matches = await Promise.all(Array.from(unique.values()).slice(0, showAll ? 18 : 6).map(async (hotel) => ({
        hotel, image: await resolveHotelImage(hotel.jaaga?.images?.[0]),
      })));
      if (alive) setStays(matches);
    }).catch(() => { if (alive) setError(true); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [city, showAll]);

  if (!city) return null;
  return <section id="plan-nearby-hotels" aria-label="Nearby hotels for your plan" className="mt-12 scroll-mt-40 border-t border-border pt-8">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-2xl font-semibold"><Hotel className="h-5 w-5 text-primary" />Hotels near your journey</h2><p className="mt-1 text-sm text-muted-foreground">Stays in {city}</p></div>
      <Button variant="outline" onClick={() => setShowAll((current) => !current)}>{showAll ? "Show fewer stays" : "Browse stays"}<ArrowRight className="h-4 w-4" /></Button>
    </div>
    {loading ? <div role="status" className="flex items-center gap-2 py-6 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Finding nearby hotels…</div> : error ?
      <p role="alert" className="text-sm text-muted-foreground">Hotel suggestions could not be loaded. Browse stays to search again.</p> : !stays.length ?
      <p className="text-sm text-muted-foreground">No listed hotels found in {city} yet.</p> :
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{stays.map(({ hotel, image }) => {
        const prices = hotel.rooms.flatMap((room) => room.ratePlans.map(ratePlanSellPrice)).filter((price) => Number.isFinite(price) && price > 0);
        const price = prices.length ? Math.min(...prices) : null;
        const href = `/hotels/${hotel.jaagaHotelId}`;
        return <Card key={hotel.jaagaHotelId} className="overflow-hidden">
          <img src={image} alt={hotel.propertyInfo.name ?? "Hotel"} loading="lazy" className="aspect-[16/10] w-full object-cover" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = HOTEL_IMAGE_FALLBACK; }} />
          <CardContent className="p-4"><div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{hotel.propertyInfo.name ?? "Hotel"}</h3>{hotel.propertyInfo.starRating ? <span className="flex shrink-0 items-center gap-1 text-xs"><Star className="h-3.5 w-3.5 text-primary" />{hotel.propertyInfo.starRating}</span> : null}</div>
            <p className="mt-2 flex items-start gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" />{[hotel.jaaga?.locality, hotel.propertyInfo.cityName].filter(Boolean).join(", ") || city}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold">{price ? `From ₹${price.toLocaleString("en-IN")}` : "Rates at booking"}</p><Button size="sm" aria-expanded={expandedHotel === hotel.jaagaHotelId} onClick={() => setExpandedHotel((current) => current === hotel.jaagaHotelId ? null : hotel.jaagaHotelId)}>{expandedHotel === hotel.jaagaHotelId ? "Hide rooms" : "View rooms"}<ArrowRight className="h-4 w-4" /></Button></div>
            {expandedHotel === hotel.jaagaHotelId && <div className="mt-4 space-y-3 border-t border-border pt-4">
              {hotel.jaaga?.description && <p className="text-sm text-muted-foreground">{hotel.jaaga.description}</p>}
              {hotel.rooms.length ? hotel.rooms.map((room, index) => {
                const rates = room.ratePlans.map(ratePlanSellPrice).filter((value) => Number.isFinite(value) && value > 0);
                const roomPrice = rates.length ? Math.min(...rates) : null;
                return <div key={room.jaagaRoomId ?? room.roomId ?? index} className="border-b border-border pb-3 text-sm last:border-0">
                  <p className="font-medium">{room.roomName || "Room"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{room.settings.maxOccupancy ? `Up to ${room.settings.maxOccupancy} guests · ` : ""}{boardLabel(room.ratePlans[0]?.board)}</p>
                  <p className="mt-1 font-semibold">{roomPrice ? `₹${roomPrice.toLocaleString("en-IN")} / night` : "Rates at booking"}</p>
                </div>;
              }) : <p className="text-sm text-muted-foreground">Room details are not available yet.</p>}
              <Button asChild size="sm" variant="outline"><Link to={href}>Book this stay<ArrowRight className="h-4 w-4" /></Link></Button>
            </div>}
          </CardContent>
        </Card>;
      })}</div>}
  </section>;
}