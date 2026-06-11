import { memo, useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/googleMaps";
import { useInView } from "@/hooks/useInView";

interface GoogleStaticMarkerMapProps {
  lat: number;
  lng: number;
  label?: string;
  height?: string;
  zoom?: number;
  variant?: "default" | "verified";
}

/**
 * Display-only Google Map with a single marker and optional label tooltip.
 * Lazy-loaded via IntersectionObserver. Uses classic google.maps.Marker.
 */
const GoogleStaticMarkerMap = ({
  lat,
  lng,
  label,
  height = "400px",
  zoom = 15,
  variant = "default",
}: GoogleStaticMarkerMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [inViewRef, inView] = useInView<HTMLDivElement>({ rootMargin: "300px" });

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    (async () => {
      try {
        const google = await loadGoogleMaps();
        if (cancelled || !containerRef.current || mapRef.current) return;

        mapRef.current = new google.maps.Map(containerRef.current, {
          center: { lat, lng },
          zoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });

        const marker = new google.maps.Marker({
          position: { lat, lng },
          map: mapRef.current,
          icon: variant === "verified"
            ? {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 14,
                fillColor: "#10b981",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 3,
              }
            : undefined,
        });

        if (label) {
          const info = new google.maps.InfoWindow({
            content: `<div style="font-weight:600;font-size:13px;padding:2px 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a">${label.replace(/[<>&]/g, "")}</div>`,
            disableAutoPan: true,
          });
          info.open({ map: mapRef.current, anchor: marker });
        }
      } catch (err) {
        console.error("[GoogleStaticMarkerMap] load failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inView, lat, lng, label, zoom, variant]);

  return (
    <div ref={inViewRef} style={{ width: "100%", height }} className="rounded-xl overflow-hidden bg-muted">
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

export default memo(GoogleStaticMarkerMap);
