import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MapPin, ExternalLink, Compass, Building2, Gem, Footprints, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDestinationRecommendations, SMART_STAY_PROPERTY_RADIUS_KM } from "@/services/smartStayRecommendationService";
import { destinationKey, mapsSearchUrl, RECOMMENDATION_GROUPS, uniqueDestinations, type RecommendationGroup } from "@/lib/smartStayRecommendations";

const groupIcons = { "Must-visit": Landmark, "Popular destinations": Compass, "Local experiences": Footprints, "Hidden gems": Gem };

function DestinationPlaces({ destination }: { destination: string }) {
  const [group, setGroup] = useState<RecommendationGroup>("Must-visit");
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["smart-stay-recommendations", destinationKey(destination)],
    queryFn: () => getDestinationRecommendations(destination), staleTime: 5 * 60 * 1000,
  });
  const places = data?.places.filter(p => p.group === group) ?? [];
  const Icon = groupIcons[group];
  return (
    <section className="min-w-0 border-t border-border pt-4" aria-label={`Explore ${destination}`}>
      <h4 className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 shrink-0 text-primary" />{destination}</h4>
      <div className="my-3 flex flex-wrap gap-1" role="group" aria-label={`Places in ${destination}`}>
        {RECOMMENDATION_GROUPS.map(g => {
          const GroupIcon = groupIcons[g];
          return <Button key={g} size="sm" variant={group === g ? "secondary" : "ghost"} aria-pressed={group === g} onClick={() => setGroup(g)} className="h-8 text-xs"><GroupIcon />{g}</Button>;
        })}
      </div>
      {isPending ? <p className="text-sm text-muted-foreground" role="status">Finding places and properties…</p> : isError ? (
        <div className="flex items-center gap-2 text-sm"><span>Recommendations are unavailable.</span><Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button></div>
      ) : <>
        <div className="grid gap-x-5 sm:grid-cols-2">
          {places.map(p => <div key={p.name} className="flex gap-2 border-b border-border/60 py-3">
            <Icon className="mt-1 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <a href={mapsSearchUrl(`${p.name}, ${destinationKey(destination)}`)} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1 text-sm font-medium hover:text-primary"><span>{p.name}</span><ExternalLink className="mt-0.5 h-3 w-3 shrink-0" /></a>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.reason}</p>
              {p.source && <a href={p.source} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-primary underline underline-offset-2">Tourism guide</a>}
            </div>
          </div>)}
        </div>
        {!places.length && <p className="text-sm text-muted-foreground">{data?.experienceError ? "Local recommendations are temporarily unavailable." : `No curated ${group.toLowerCase()} available for this destination yet.`}</p>}
        <Button variant="link" size="sm" asChild className="px-0"><a href={mapsSearchUrl(`${group === "Hidden gems" ? "offbeat places" : group.toLowerCase()} in ${destination}`)} target="_blank" rel="noopener noreferrer"><MapPin />Explore on map<ExternalLink /></a></Button>
        <div className="mt-4 border-t border-primary/20 pt-3">
          <h5 className="flex items-center gap-2 text-sm font-semibold text-primary"><Building2 className="h-4 w-4" />Nearby JaagaX properties</h5>
          {data?.propertyError ? <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">Properties could not be loaded.<Button size="sm" variant="ghost" onClick={() => refetch()}>Retry</Button></div> : !data?.properties.length ? <p className="mt-2 text-xs text-muted-foreground">No approved JaagaX properties found nearby.</p> : (
            <div className="mt-2 divide-y divide-border">
              {data.properties.map(p => <Link key={p.id} to={`/property/${p.slug || p.id}`} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-3 py-3 hover:text-primary">
                <div className="relative flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted"><Building2 className="h-6 w-6 text-muted-foreground" />{Array.isArray(p.images) && p.images[0] && <img src={p.images[0]} alt={p.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={e => { e.currentTarget.hidden = true; }} />}</div>
                <div className="min-w-0 flex-1"><div className="line-clamp-2 text-sm font-medium">{p.title}</div><p className="mt-1 text-xs text-muted-foreground">{[p.locality, p.city].filter(Boolean).join(", ")}</p><p className="text-xs text-muted-foreground">{p.distance_km != null ? `${Number(p.distance_km).toFixed(1)} km from destination centre · within ${SMART_STAY_PROPERTY_RADIUS_KM} km` : "In this destination · map pin unavailable"}</p></div>
                <Badge variant="outline" className="shrink-0 text-primary">Verified</Badge><ExternalLink className="hidden h-3 w-3 shrink-0 sm:block" />
              </Link>)}
            </div>
          )}
        </div>
      </>}
    </section>
  );
}

export default function FamousPlaces({ destinations }: { destinations: string[] }) {
  const cities = uniqueDestinations(destinations);
  if (!cities.length) return null;
  return <div className="mt-5 min-w-0 space-y-4">
    <h3 className="flex items-center gap-2 text-lg font-semibold"><Compass className="h-5 w-5 text-primary" />Explore your itinerary</h3>
    {cities.map(city => <DestinationPlaces key={destinationKey(city)} destination={city} />)}
  </div>;
}
