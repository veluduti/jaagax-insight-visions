import { useEffect, useRef, useState } from "react";
import { MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadGoogleMaps } from "@/lib/googleMaps";
import { CITY_CENTRES } from "@/lib/hyderabadPropertyRadius";
import { agentPublicLabel } from "@/lib/agentPrivacy";
import { toArray, type DiscoveryAgent } from "@/lib/agentDiscovery";

/**
 * Agents have no saved coordinates, so markers sit at the known city centre
 * of the agent's primary city (approximate, labelled as such). Agents whose
 * city has no known centre are not pinned.
 */

const CENTRE_LOOKUP: Record<string, [number, number]> = Object.fromEntries(
  Object.entries(CITY_CENTRES).map(([k, v]) => [k.toLowerCase(), v]),
);

export const agentCityCentre = (agent: DiscoveryAgent): [number, number] | null => {
  const city = (toArray(agent.cities_served)[0] || agent.city || "").toLowerCase().trim();
  return CENTRE_LOOKUP[city] || null;
};

interface Props {
  agents: DiscoveryAgent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onProfile: (agent: DiscoveryAgent) => void;
}

const AgentDiscoveryMap = ({ agents, selectedId, onSelect, onProfile }: Props) => {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const googleRef = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const pinned = agents
    .map((a) => ({ agent: a, centre: agentCityCentre(a) }))
    .filter((p): p is { agent: DiscoveryAgent; centre: [number, number] } => !!p.centre);
  const selected = agents.find((a) => a.id === selectedId);

  useEffect(() => {
    // Maps cannot be validated from the sandbox's unauthorized localhost origin.
    if (window.location.hostname === "localhost") {
      setError("Map preview is available on the published website.");
      return;
    }
    let cancelled = false;
    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !container.current) return;
        googleRef.current = google;
        map.current = new google.maps.Map(container.current, {
          center: { lat: 17.385, lng: 78.4867 },
          zoom: 10,
          clickableIcons: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        setReady(true);
      })
      .catch(() => setError("The map could not load. You can still browse agents."));
    return () => {
      cancelled = true;
      markers.current.forEach((m) => m.setMap(null));
      if (googleRef.current && map.current)
        googleRef.current.maps.event.clearInstanceListeners(map.current);
    };
  }, []);

  useEffect(() => {
    if (!ready || !map.current || !googleRef.current) return;
    markers.current.forEach((m) => m.setMap(null));
    const google = googleRef.current;
    const bounds = new google.maps.LatLngBounds();
    markers.current = pinned.map(({ agent, centre }) => {
      const position = { lat: centre[0], lng: centre[1] };
      bounds.extend(position);
      const rating = Number(agent.avg_rating || 0);
      const marker = new google.maps.Marker({
        map: map.current,
        position,
        title: agentPublicLabel(agent),
        label: {
          text: rating > 0 ? `★ ${rating.toFixed(1)}` : agentPublicLabel(agent),
          color: "hsl(145 65% 32%)",
          fontWeight: "700",
          fontSize: "12px",
        },
      });
      marker.addListener("click", () => selectRef.current(agent.id));
      return marker;
    });
    if (pinned.length) {
      map.current.fitBounds(bounds, 60);
      if (pinned.length === 1) map.current.setZoom(12);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents, ready]);

  useEffect(() => {
    const p = pinned.find((p) => p.agent.id === selectedId);
    if (p && map.current) map.current.panTo({ lat: p.centre[0], lng: p.centre[1] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div
      className="relative h-[560px] overflow-hidden rounded-lg border border-border bg-muted lg:h-[650px]"
      aria-label="Agent locations map"
    >
      <div ref={container} className="absolute inset-0" />
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center text-muted-foreground">
          <MapPin className="h-9 w-9 text-primary" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {!error && ready && !pinned.length && (
        <p className="absolute left-3 right-3 top-3 rounded-md bg-card p-3 text-xs">
          These agents have no known city location yet.
        </p>
      )}
      {!error && ready && pinned.length > 0 && (
        <p className="absolute left-3 top-3 rounded-md bg-card/95 px-3 py-1.5 text-[11px] text-muted-foreground shadow">
          Markers show approximate city locations
        </p>
      )}
      {selected && (
        <div className="absolute bottom-4 left-3 right-3 flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-lg">
          {selected.photo_url ? (
            <img
              src={selected.photo_url}
              alt={agentPublicLabel(selected)}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {agentPublicLabel(selected).slice(0, 2)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{agentPublicLabel(selected)}</p>
            <p className="truncate text-xs text-muted-foreground">
              {selected.agency_name || toArray(selected.cities_served)[0] || selected.city || ""}
            </p>
            <Button
              variant="link"
              onClick={() => onProfile(selected)}
              className="h-6 p-0 text-xs"
            >
              View Profile <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentDiscoveryMap;
