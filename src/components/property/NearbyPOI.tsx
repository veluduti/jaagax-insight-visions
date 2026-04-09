import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { School, Hospital, ShoppingBag, Train, MapPin, Utensils, Trees, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface NearbyPOIProps {
  city: string;
  lat: number | null;
  lng: number | null;
}

interface POIItem {
  name: string;
  rating: number | null;
  distance: string;
  address: string;
  open_now: boolean | null;
}

const poiIcons: Record<string, any> = {
  school: School,
  hospital: Hospital,
  shopping_mall: ShoppingBag,
  transit_station: Train,
  restaurant: Utensils,
  park: Trees,
  default: MapPin,
};

const poiLabels: Record<string, string> = {
  school: "Schools",
  hospital: "Hospitals",
  shopping_mall: "Shopping Malls",
  transit_station: "Transit Stations",
  restaurant: "Restaurants",
  park: "Parks",
};

const poiColors: Record<string, string> = {
  school: "bg-blue-500/10 text-blue-500",
  hospital: "bg-red-500/10 text-red-500",
  shopping_mall: "bg-purple-500/10 text-purple-500",
  transit_station: "bg-green-500/10 text-green-500",
  restaurant: "bg-orange-500/10 text-orange-500",
  park: "bg-emerald-500/10 text-emerald-500",
};

const NearbyPOI = ({ city, lat, lng }: NearbyPOIProps) => {
  const [poiData, setPoiData] = useState<Record<string, POIItem[]> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lat && lng) {
      fetchNearbyPlaces();
    }
  }, [lat, lng]);

  const fetchNearbyPlaces = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('nearby-places', {
        body: { lat, lng },
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setPoiData(data.data);
      } else {
        setError(data?.error || 'Failed to fetch nearby places');
      }
    } catch (e) {
      console.error('Error fetching nearby places:', e);
      setError('Unable to load nearby places');
    } finally {
      setLoading(false);
    }
  };

  if (!lat || !lng) {
    return (
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Nearby Places
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Location coordinates not available for this property.</p>
        </CardContent>
      </Card>
    );
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
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Finding nearby places...</span>
            </div>
          )}

          {error && (
            <p className="text-muted-foreground text-sm text-center py-4">{error}</p>
          )}

          {poiData && !loading && Object.entries(poiData).map(([type, items]) => {
            if (!items || items.length === 0) return null;
            const Icon = poiIcons[type] || poiIcons.default;
            const colorClass = poiColors[type] || "bg-gray-500/10 text-gray-500";
            const label = poiLabels[type] || type;

            return (
              <div key={type} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold">{label}</h3>
                  <Badge variant="secondary" className="ml-auto">
                    {items.length}
                  </Badge>
                </div>

                <div className="space-y-2 pl-10">
                  {items.map((poi, idx) => (
                    <div
                      key={idx}
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
                      {poi.distance && (
                        <span className="text-sm text-muted-foreground">{poi.distance}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {poiData && !loading && Object.values(poiData).every(items => !items || items.length === 0) && (
            <p className="text-muted-foreground text-sm text-center py-4">No nearby places found for this location.</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default NearbyPOI;
