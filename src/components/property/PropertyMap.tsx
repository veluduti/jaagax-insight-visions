import { memo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useInView } from "@/hooks/useInView";

interface PropertyMapProps {
  lat: number | null;
  lng: number | null;
  verified: boolean;
}

const PropertyMap = ({ lat, lng, verified }: PropertyMapProps) => {
  const hasCoordinates =
    lat !== null && lat !== undefined && !Number.isNaN(Number(lat)) &&
    lng !== null && lng !== undefined && !Number.isNaN(Number(lng));

  const validLat = hasCoordinates ? Number(lat) : 0;
  const validLng = hasCoordinates ? Number(lng) : 0;
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const navigate = useNavigate();
  const [inViewRef, inView] = useInView<HTMLDivElement>({ rootMargin: "300px" });

  useEffect(() => {
    if (!hasCoordinates || !inView) return;
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken =
      import.meta.env.VITE_MAPBOX_TOKEN ||
      import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN ||
      "pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbHR4Y3B1ZGcxMnprMmpsYjIwOG10cXh6In0.HuoJqW9PJdDjLK5O5LJRAQ";

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [validLng, validLat],
      zoom: 14,
    });

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
      el.textContent = "✓";
      el.style.color = "white";
    } else {
      el.style.background = "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))";
      el.style.boxShadow = "0 0 20px hsl(var(--primary) / 0.6)";
      el.textContent = "📍";
    }

    new mapboxgl.Marker(el).setLngLat([validLng, validLat]).addTo(map.current);
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [validLat, validLng, verified, hasCoordinates, inView]);

  // STRICT: hide the entire location section when we have no real coordinates
  if (!hasCoordinates) return null;

  return (
    <motion.div
      ref={inViewRef}
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
    </motion.div>
  );
};

export default memo(PropertyMap);

