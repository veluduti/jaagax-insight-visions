import { useEffect, useRef, useState } from "react";
import { MapPin, ArrowRight, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadGoogleMaps } from "@/lib/googleMaps";
import { hasHotelMapCoordinates } from "@/lib/hotelMapCoordinates";
import type { DiscoveryHotel } from "./HotelResultRow";

export type MapHotel = DiscoveryHotel & { latitude?: number | null; longitude?: number | null };
export type HotelMapBounds = { north: number; south: number; east: number; west: number };
export default function HotelDiscoveryMap({ hotels, selectedId, onSelect, onDetails, onSearchArea }: { hotels: MapHotel[]; selectedId: string | null; onSelect: (id: string) => void; onDetails: (hotel: MapHotel) => void; onSearchArea: (bounds: HotelMapBounds | null) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const googleRef = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const selectRef = useRef(onSelect); selectRef.current = onSelect;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [areaApplied, setAreaApplied] = useState(false);
  const pinned = hotels.filter(hasHotelMapCoordinates);
  const selected = hotels.find(h => h.id === selectedId);
  useEffect(() => {
    // Maps cannot be validated from the sandbox's unauthorized localhost origin.
    if (window.location.hostname === "localhost") { setError("Map preview is available on the published website."); return; }
    let cancelled = false;
    loadGoogleMaps().then(google => {
      if (cancelled || !container.current) return;
      googleRef.current = google;
      map.current = new google.maps.Map(container.current, { center: { lat: 17.385, lng: 78.4867 }, zoom: 11, clickableIcons: false, mapTypeControl: false, streetViewControl: false, fullscreenControl: true });
      setReady(true);
    }).catch(() => setError("The map could not load. You can still browse and book stays."));
    return () => { cancelled = true; markers.current.forEach(m => m.setMap(null)); if (googleRef.current && map.current) googleRef.current.maps.event.clearInstanceListeners(map.current); };
  }, []);
  useEffect(() => {
    if (!ready || !map.current || !googleRef.current) return;
    markers.current.forEach(m => m.setMap(null));
    const google = googleRef.current;
    const bounds = new google.maps.LatLngBounds();
    const color = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
    markers.current = pinned.map(h => {
      const position = { lat: Number(h.latitude), lng: Number(h.longitude) };
      bounds.extend(position);
      const price = h.rental_period ? h.rental_price : h.price_per_night;
      const marker = new google.maps.Marker({ map: map.current, position, title: h.name, label: { text: price ? `₹${price.toLocaleString("en-IN")}` : "N/A", color: `hsl(${color})`, fontWeight: "700", fontSize: "12px" }, icon: { path: "M -38,-14 L 38,-14 L 38,14 L 6,14 L 0,22 L -6,14 L -38,14 Z", fillColor: getComputedStyle(document.documentElement).getPropertyValue("--card").trim() ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue("--card").trim()})` : "transparent", fillOpacity: 1, strokeColor: `hsl(${color})`, strokeWeight: 2 } });
      marker.addListener("click", () => selectRef.current(h.id));
      return marker;
    });
    if (pinned.length && !areaApplied) { map.current.fitBounds(bounds, 50); if (pinned.length === 1) map.current.setZoom(13); }
  }, [hotels, ready, areaApplied]);
  useEffect(() => { const h = pinned.find(h => h.id === selectedId); if (h && map.current) map.current.panTo({ lat: Number(h.latitude), lng: Number(h.longitude) }); }, [selectedId]);
  return <div className="relative h-[560px] overflow-hidden rounded-lg border border-border bg-muted lg:h-[650px]" aria-label="Hotel locations map"><div ref={container} className="absolute inset-0" />{error && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center text-muted-foreground"><MapPin className="h-9 w-9 text-primary" /><p className="text-sm">{error}</p></div>}{!error && ready && !pinned.length && <p className="absolute left-3 right-3 top-3 rounded-md bg-card p-3 text-xs">These stays have no saved map pins yet.</p>}{selected && <div className="absolute bottom-20 left-3 right-3 flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-lg">{selected.images?.[0] && <img src={selected.images[0]} alt={selected.name} className="h-16 w-20 rounded object-cover" />}<div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{selected.name}</p><p className="text-xs text-primary">₹{selected.price_per_night.toLocaleString("en-IN")} / night</p><Button variant="link" onClick={() => onDetails(selected)} className="h-6 p-0 text-xs">View Details <ArrowRight className="ml-1 h-3 w-3" /></Button></div></div>}<Button disabled={!ready} variant="secondary" className="absolute bottom-5 left-1/2 -translate-x-1/2 gap-2 shadow-lg" onClick={() => { if (areaApplied) { setAreaApplied(false); onSearchArea(null); return; } const b = map.current?.getBounds(); if (!b) return; setAreaApplied(true); onSearchArea({ north: b.getNorthEast().lat(), east: b.getNorthEast().lng(), south: b.getSouthWest().lat(), west: b.getSouthWest().lng() }); }}><LocateFixed className="h-4 w-4" />{areaApplied ? "Show all search results" : "Search in this area"}</Button></div>;
}