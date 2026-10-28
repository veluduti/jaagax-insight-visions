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

// Approximate centres of common Hyderabad-region localities agents serve.
const LOCALITY_CENTRES: Record<string, [number, number]> = {
  balanagar: [17.4795, 78.4421], moosapet: [17.4699, 78.4271], kukatpally: [17.4948, 78.3996],
  madhapur: [17.4483, 78.3915], gachibowli: [17.4401, 78.3489], "hitec city": [17.4504, 78.3808],
  hitech: [17.4504, 78.3808], kondapur: [17.4698, 78.3578], "jubilee hills": [17.4326, 78.4071],
  "banjara hills": [17.4156, 78.4347], ameerpet: [17.4375, 78.4482], secunderabad: [17.4399, 78.4983],
  begumpet: [17.4447, 78.4664], miyapur: [17.4968, 78.3614], kompally: [17.5357, 78.4859],
  uppal: [17.4058, 78.5591], "lb nagar": [17.3457, 78.5522], dilsukhnagar: [17.3688, 78.5247],
  manikonda: [17.4053, 78.3866], "financial district": [17.4156, 78.3410], nizampet: [17.5167, 78.3833],
  bachupally: [17.5440, 78.3640], alwal: [17.5047, 78.5132], medchal: [17.6297, 78.4814],
};

export const agentCityCentre = (agent: DiscoveryAgent): [number, number] | null => {
  const localities = [...toArray((agent as any).localities_served), (agent as any).locality]
    .filter(Boolean)
    .map((l: string) => String(l).toLowerCase().trim());
  for (const l of localities) if (LOCALITY_CENTRES[l]) return LOCALITY_CENTRES[l];
  const city = (toArray(agent.cities_served)[0] || agent.city || "").toLowerCase().trim();
  return LOCALITY_CENTRES[city] || CENTRE_LOOKUP[city] || null;
};

/** Spread agents sharing the same point so every marker stays visible. */
const spread = (items: { agent: DiscoveryAgent; centre: [number, number] }[]) => {
  const seen: Record<string, number> = {};
  return items.map((p) => {
    const key = p.centre.join(",");
    const n = (seen[key] = (seen[key] ?? -1) + 1);
    if (!n) return p;
    const angle = n * 2.4;
    const r = 0.006 * Math.sqrt(n);
    return { ...p, centre: [p.centre[0] + r * Math.sin(angle), p.centre[1] + r * Math.cos(angle)] as [number, number] };
  });
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

  const pinned = spread(
    agents
      .map((a) => ({ agent: a, centre: agentCityCentre(a) }))
      .filter((p): p is { agent: DiscoveryAgent; centre: [number, number] } => !!p.centre),
  );
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
