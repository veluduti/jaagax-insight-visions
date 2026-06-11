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
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const hasCoords = lat !== null && lng !== null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));
  const startLat = hasCoords ? Number(lat) : defaultCenter.lat;
  const startLng = hasCoords ? Number(lng) : defaultCenter.lng;

  // Init once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const google = await loadGoogleMaps();
        if (cancelled || !containerRef.current || mapRef.current) return;

        mapRef.current = new google.maps.Map(containerRef.current, {
          center: { lat: startLat, lng: startLng },
          zoom: hasCoords ? 16 : 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });

        if (hasCoords) {
          markerRef.current = new google.maps.Marker({
            position: { lat: startLat, lng: startLng },
            map: mapRef.current,
            draggable: true,
            animation: google.maps.Animation.DROP,
          });
          markerRef.current.addListener("dragend", () => {
            const p = markerRef.current.getPosition();
            onChangeRef.current(Number(p.lat().toFixed(6)), Number(p.lng().toFixed(6)));
          });
        }

        mapRef.current.addListener("click", (e: any) => {
          const clat = e.latLng.lat();
          const clng = e.latLng.lng();
          if (!markerRef.current) {
            markerRef.current = new google.maps.Marker({
              position: { lat: clat, lng: clng },
              map: mapRef.current,
              draggable: true,
            });
            markerRef.current.addListener("dragend", () => {
              const p = markerRef.current.getPosition();
              onChangeRef.current(Number(p.lat().toFixed(6)), Number(p.lng().toFixed(6)));
            });
          } else {
            markerRef.current.setPosition({ lat: clat, lng: clng });
          }
          onChangeRef.current(Number(clat.toFixed(6)), Number(clng.toFixed(6)));
        });
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
    if (!mapRef.current || !hasCoords) return;
    const pos = { lat: Number(lat), lng: Number(lng) };
    mapRef.current.panTo(pos);
    mapRef.current.setZoom(16);
    if (!markerRef.current) {
      const google = (window as any).google;
      markerRef.current = new google.maps.Marker({
        position: pos,
        map: mapRef.current,
        draggable: true,
      });
      markerRef.current.addListener("dragend", () => {
        const p = markerRef.current.getPosition();
        onChangeRef.current(Number(p.lat().toFixed(6)), Number(p.lng().toFixed(6)));
      });
    } else {
      markerRef.current.setPosition(pos);
    }
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
