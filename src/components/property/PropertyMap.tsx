import { memo } from "react";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import GoogleStaticMarkerMap from "@/components/location/GoogleStaticMarkerMap";

interface PropertyMapProps {
  lat: number | null;
  lng: number | null;
  verified: boolean;
}

const PropertyMap = ({ lat, lng, verified }: PropertyMapProps) => {
  const navigate = useNavigate();
  const hasCoordinates =
    lat !== null && lat !== undefined && !Number.isNaN(Number(lat)) &&
    lng !== null && lng !== undefined && !Number.isNaN(Number(lng));

  if (!hasCoordinates) return null;

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

      <GoogleStaticMarkerMap
        lat={Number(lat)}
        lng={Number(lng)}
        height="400px"
        zoom={14}
        variant={verified ? "verified" : "default"}
      />
    </motion.div>
  );
};

export default memo(PropertyMap);
