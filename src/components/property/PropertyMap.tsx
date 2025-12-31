import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PropertyMapProps {
  lat: number | null;
  lng: number | null;
  verified: boolean;
}

const PropertyMap = ({ lat, lng, verified }: PropertyMapProps) => {
  // Default to Hyderabad center if coordinates are not available
  const validLat = lat ?? 17.385;
  const validLng = lng ?? 78.4867;
  const hasCoordinates = lat !== null && lng !== null;
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Use environment variable or fallback to a default public token
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || "pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbHR4Y3B1ZGcxMnprMmpsYjIwOG10cXh6In0.HuoJqW9PJdDjLK5O5LJRAQ";

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [validLng, validLat],
      zoom: hasCoordinates ? 14 : 11,
    });

    // Create custom marker
    const el = document.createElement("div");
    el.className = "property-marker";
    el.style.width = "50px";
    el.style.height = "50px";
    el.style.borderRadius = "50%";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.fontSize = "24px";

    if (verified) {
      el.style.background = "linear-gradient(135deg, #10b981, #059669)";
      el.style.boxShadow = "0 0 30px rgba(16, 185, 129, 0.8), 0 0 60px rgba(16, 185, 129, 0.4)";
      el.innerHTML = "✓";
      el.style.color = "white";
    } else {
      el.style.background = "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))";
      el.style.boxShadow = "0 0 20px hsl(var(--primary) / 0.6)";
      el.innerHTML = "📍";
    }

    if (hasCoordinates) {
      new mapboxgl.Marker(el).setLngLat([validLng, validLat]).addTo(map.current);
    }

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      map.current?.remove();
    };
  }, [validLat, validLng, verified, hasCoordinates]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-panel rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Location</h2>
        </div>
        <Button variant="outline" onClick={() => navigate("/map")}>
          View on Full Map
        </Button>
      </div>

      <div ref={mapContainer} className="w-full h-[400px] rounded-lg overflow-hidden" />

      {/* Nearby POIs placeholder */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div className="p-3 rounded-lg bg-background/50 text-center">
          <div className="text-2xl mb-1">🏫</div>
          <div className="text-xs text-muted-foreground">Schools Nearby</div>
          <div className="font-semibold">5</div>
        </div>
        <div className="p-3 rounded-lg bg-background/50 text-center">
          <div className="text-2xl mb-1">🏥</div>
          <div className="text-xs text-muted-foreground">Hospitals</div>
          <div className="font-semibold">3</div>
        </div>
        <div className="p-3 rounded-lg bg-background/50 text-center">
          <div className="text-2xl mb-1">🚇</div>
          <div className="text-xs text-muted-foreground">Metro</div>
          <div className="font-semibold">2 km</div>
        </div>
        <div className="p-3 rounded-lg bg-background/50 text-center">
          <div className="text-2xl mb-1">🏬</div>
          <div className="text-xs text-muted-foreground">Malls</div>
          <div className="font-semibold">4</div>
        </div>
      </div>
    </motion.div>
  );
};

export default PropertyMap;
