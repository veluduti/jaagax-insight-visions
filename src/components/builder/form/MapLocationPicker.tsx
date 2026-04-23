import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface MapLocationPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  label?: string;
  height?: string;
}

/**
 * Bayut-style interactive map with a draggable red pin.
 * Click anywhere to move the pin; drag to fine-tune.
 * Emits lat/lng changes via onChange.
 */
const MapLocationPicker = ({
  lat,
  lng,
  onChange,
  label = "Pin the exact project location",
  height = "320px",
}: MapLocationPickerProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  // Sensible defaults: Hyderabad center if no coords yet
  const startLat = lat ?? 17.385;
  const startLng = lng ?? 78.4867;
  const hasCoords = lat !== null && lng !== null;

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken =
      import.meta.env.VITE_MAPBOX_TOKEN ||
      import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN ||
      "pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbHR4Y3B1ZGcxMnprMmpsYjIwOG10cXh6In0.HuoJqW9PJdDjLK5O5LJRAQ";

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [startLng, startLat],
      zoom: hasCoords ? 15 : 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      "top-right",
    );

    // Build draggable red pin
    const buildMarkerElement = () => {
      const el = document.createElement("div");
      el.style.cssText = "width:30px;height:42px;cursor:grab;";
      el.innerHTML = `
        <svg viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:30px;height:42px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35))">
          <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.716 23.284 0 15 0z" fill="#EA4335"/>
          <circle cx="15" cy="14" r="6" fill="#B31412"/>
        </svg>`;
      return el;
    };

    if (hasCoords) {
      marker.current = new mapboxgl.Marker({ element: buildMarkerElement(), draggable: true, anchor: "bottom" })
        .setLngLat([startLng, startLat])
        .addTo(map.current);
      marker.current.on("dragend", () => {
        const ll = marker.current!.getLngLat();
        onChange(Number(ll.lat.toFixed(6)), Number(ll.lng.toFixed(6)));
      });
    }

    // Click to place / move marker
    map.current.on("click", (e) => {
      const { lng: clickLng, lat: clickLat } = e.lngLat;
      if (!marker.current) {
        marker.current = new mapboxgl.Marker({ element: buildMarkerElement(), draggable: true, anchor: "bottom" })
          .setLngLat([clickLng, clickLat])
          .addTo(map.current!);
        marker.current.on("dragend", () => {
          const ll = marker.current!.getLngLat();
          onChange(Number(ll.lat.toFixed(6)), Number(ll.lng.toFixed(6)));
        });
      } else {
        marker.current.setLngLat([clickLng, clickLat]);
      }
      onChange(Number(clickLat.toFixed(6)), Number(clickLng.toFixed(6)));
    });

    return () => {
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External lat/lng change → re-center
  useEffect(() => {
    if (!map.current || lat === null || lng === null) return;
    map.current.flyTo({ center: [lng, lat], zoom: 15, duration: 800 });
    if (!marker.current) {
      const el = document.createElement("div");
      el.style.cssText = "width:30px;height:42px;cursor:grab;";
      el.innerHTML = `<svg viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:30px;height:42px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35))"><path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.716 23.284 0 15 0z" fill="#EA4335"/><circle cx="15" cy="14" r="6" fill="#B31412"/></svg>`;
      marker.current = new mapboxgl.Marker({ element: el, draggable: true, anchor: "bottom" })
        .setLngLat([lng, lat])
        .addTo(map.current);
      marker.current.on("dragend", () => {
        const ll = marker.current!.getLngLat();
        onChange(Number(ll.lat.toFixed(6)), Number(ll.lng.toFixed(6)));
      });
    } else {
      marker.current.setLngLat([lng, lat]);
    }
  }, [lat, lng, onChange]);

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      <div
        ref={mapContainer}
        style={{ width: "100%", height }}
        className="rounded-xl overflow-hidden border border-border"
      />
      {lat !== null && lng !== null && (
        <p className="text-xs text-muted-foreground mt-2">
          Pinned: <span className="font-mono">{lat.toFixed(5)}, {lng.toFixed(5)}</span> — drag the pin to fine-tune
        </p>
      )}
    </div>
  );
};

export default MapLocationPicker;
