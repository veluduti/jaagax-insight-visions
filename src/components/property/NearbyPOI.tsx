import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { School, Hospital, ShoppingBag, Train, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface NearbyPOIProps {
  city: string;
  lat: number | null;
  lng: number | null;
}

interface POI {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  rating: number | null;
}

const poiIcons: Record<string, any> = {
  school: School,
  hospital: Hospital,
  mall: ShoppingBag,
  metro: Train,
  default: MapPin,
};

const poiColors: Record<string, string> = {
  school: "bg-blue-500/10 text-blue-500",
  hospital: "bg-red-500/10 text-red-500",
  mall: "bg-purple-500/10 text-purple-500",
  metro: "bg-green-500/10 text-green-500",
};

const NearbyPOI = ({ city, lat, lng }: NearbyPOIProps) => {
  // Default coordinates for distance calculation
  const validLat = lat ?? 17.385;
  const validLng = lng ?? 78.4867;
  const [pois, setPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNearbyPOI();
  }, [city]);

  const fetchNearbyPOI = async () => {
    try {
      const { data, error } = await supabase
        .from("poi")
        .select("*")
        .eq("city", city)
        .limit(12);

      if (error) throw error;
      setPois(data || []);
    } catch (error) {
      console.error("Error fetching POI:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
  };

  const groupedPOIs = pois.reduce((acc, poi) => {
    if (!acc[poi.type]) acc[poi.type] = [];
    acc[poi.type].push(poi);
    return acc;
  }, {} as Record<string, POI[]>);

  if (loading) {
    return null;
  }

  if (pois.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Nearby Places
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(groupedPOIs).map(([type, items]) => {
            const Icon = poiIcons[type.toLowerCase()] || poiIcons.default;
            const colorClass = poiColors[type.toLowerCase()] || "bg-gray-500/10 text-gray-500";

            return (
              <div key={type} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold capitalize">{type}s</h3>
                  <Badge variant="secondary" className="ml-auto">
                    {items.length}
                  </Badge>
                </div>

                <div className="space-y-2 pl-10">
                  {items.slice(0, 3).map((poi) => (
                    <div
                      key={poi.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{poi.name}</p>
                        {poi.rating && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-yellow-500">★</span>
                            <span className="text-xs text-muted-foreground">{poi.rating}/5</span>
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {calculateDistance(validLat, validLng, poi.lat, poi.lng)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default NearbyPOI;
