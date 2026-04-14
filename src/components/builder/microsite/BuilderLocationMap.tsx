import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface BuilderLocationMapProps {
  lat: number;
  lng: number;
  builderName: string;
  height?: string;
}

const BuilderLocationMap = ({ lat, lng, builderName, height = "400px" }: BuilderLocationMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || "pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbHR4Y3B1ZGcxMnprMmpsYjIwOG10cXh6In0.HuoJqW9PJdDjLK5O5LJRAQ";

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [lng, lat],
      zoom: 15,
    });

    // Red marker with builder name popup (Google Maps style)
    const markerEl = document.createElement("div");
    markerEl.style.cssText = `
      width: 30px; height: 42px; position: relative; cursor: pointer;
    `;
    // Red pin SVG (Google Maps style)
    markerEl.innerHTML = `
      <svg viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:30px;height:42px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
        <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.716 23.284 0 15 0z" fill="#EA4335"/>
        <circle cx="15" cy="14" r="6" fill="#B31412"/>
      </svg>
    `;

    // Label element
    const labelEl = document.createElement("div");
    labelEl.style.cssText = `
      position: absolute; left: 50%; transform: translateX(-50%);
      top: -8px; white-space: nowrap;
      background: white; color: #1a1a1a; font-size: 13px; font-weight: 600;
      padding: 4px 10px; border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.18);
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    labelEl.textContent = builderName;

    // Wrapper
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "position: relative; display: flex; flex-direction: column; align-items: center;";
    wrapper.appendChild(labelEl);
    wrapper.appendChild(markerEl);

    new mapboxgl.Marker({ element: wrapper, anchor: "bottom" })
      .setLngLat([lng, lat])
      .addTo(map.current);

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [lat, lng, builderName]);

  return <div ref={mapContainer} style={{ width: "100%", height }} className="rounded-xl overflow-hidden" />;
};

export default BuilderLocationMap;
