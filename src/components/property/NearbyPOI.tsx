import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { School, Hospital, ShoppingBag, Train, MapPin } from "lucide-react";
import { motion } from "framer-motion";

interface NearbyPOIProps {
  city: string;
  lat: number | null;
  lng: number | null;
}

// Mock POI data - will be replaced when poi table is created
const mockPOIs = [
  { id: '1', name: 'International School', type: 'school', distance: '0.5km', rating: 4.5 },
  { id: '2', name: 'Apollo Hospital', type: 'hospital', distance: '1.2km', rating: 4.8 },
  { id: '3', name: 'City Mall', type: 'mall', distance: '0.8km', rating: 4.2 },
  { id: '4', name: 'Metro Station', type: 'metro', distance: '0.3km', rating: 4.6 },
];

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
  // Group POIs by type
  const groupedPOIs = mockPOIs.reduce((acc, poi) => {
    if (!acc[poi.type]) acc[poi.type] = [];
    acc[poi.type].push(poi);
    return acc;
  }, {} as Record<string, typeof mockPOIs>);

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
                  {items.map((poi) => (
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
                        {poi.distance}
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