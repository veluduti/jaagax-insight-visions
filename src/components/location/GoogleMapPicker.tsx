import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/googleMaps";

interface GoogleMapPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  label?: string;
  height?: string;
  /** Optional fallback center when lat/lng not yet set. Defaults to Hyderabad. */
  defaultCenter?: { lat: number; lng: number };
}

/**
 * Interactive Google Map with a draggable red pin.
 * Click anywhere to move the pin; drag to fine-tune.
 * Uses classic google.maps.Marker (no AdvancedMarker → no mapId requirement).
 */
const GoogleMapPicker = ({
  lat,
  lng,
  onChange,
  label = "Pin the exact location",
  height = "320px",
  defaultCenter = { lat: 17.385, lng: 78.4867 },
}: GoogleMapPickerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const readyRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const hasCoords = lat !== null && lng !== null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));

  // Latest lat/lng in refs so async init reads fresh values.
  const latRef = useRef<number | null>(hasCoords ? Number(lat) : null);
  const lngRef = useRef<number | null>(hasCoords ? Number(lng) : null);
  latRef.current = hasCoords ? Number(lat) : null;
  lngRef.current = hasCoords ? Number(lng) : null;

  const ensureMarker = (google: any, pos: { lat: number; lng: number }) => {
    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        position: pos,
        map: mapRef.current,
        draggable: true,
        animation: google.maps.Animation.DROP,
      });
      markerRef.current.addListener("dragend", () => {
        const p = markerRef.current.getPosition();
        onChangeRef.current(Number(p.lat().toFixed(6)), Number(p.lng().toFixed(6)));
      });
    } else {
      markerRef.current.setPosition(pos);
    }
  };

  // Init once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const google = await loadGoogleMaps();
        if (cancelled || !containerRef.current || mapRef.current) return;

        // Read latest coords AFTER await, so any autocomplete pick during load wins.
        const currentLat = latRef.current;
        const currentLng = lngRef.current;
        const hasNow = currentLat !== null && currentLng !== null;
        const centerLat = hasNow ? currentLat! : defaultCenter.lat;
        const centerLng = hasNow ? currentLng! : defaultCenter.lng;

        mapRef.current = new google.maps.Map(containerRef.current, {
          center: { lat: centerLat, lng: centerLng },
          zoom: hasNow ? 17 : 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });

        if (hasNow) {
          ensureMarker(google, { lat: centerLat, lng: centerLng });
        }

        mapRef.current.addListener("click", (e: any) => {
          const clat = e.latLng.lat();
          const clng = e.latLng.lng();
          ensureMarker(google, { lat: clat, lng: clng });
          onChangeRef.current(Number(clat.toFixed(6)), Number(clng.toFixed(6)));
        });

        readyRef.current = true;
      } catch (err) {
        console.error("[GoogleMapPicker] load failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-center when external lat/lng changes (e.g. after autocomplete pick)
  useEffect(() => {
    if (!hasCoords) return;
    const pos = { lat: Number(lat), lng: Number(lng) };
    let cancelled = false;
    const apply = () => {
      if (cancelled) return;
      if (!mapRef.current || !readyRef.current) {
        // Map still initializing — retry shortly.
        setTimeout(apply, 60);
        return;
      }
      const google = (window as any).google;
      mapRef.current.panTo(pos);
      mapRef.current.setZoom(17);
      ensureMarker(google, pos);
    };
    apply();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, hasCoords]);

  return (
    <div>
      {label && <p className="text-xs text-muted-foreground mb-2">{label}</p>}
      <div
        ref={containerRef}
        style={{ width: "100%", height }}
        className="rounded-xl overflow-hidden border border-border bg-muted"
      />
      {hasCoords && (
        <p className="text-xs text-muted-foreground mt-2">
          Pinned: <span className="font-mono">{Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}</span> — drag the pin to fine-tune
        </p>
      )}
    </div>
  );
};

export default GoogleMapPicker;
