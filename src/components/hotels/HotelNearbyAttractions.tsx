import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Landmark, TreePine, ShoppingBag, Building2, Plane, Train, Utensils, Navigation2 } from "lucide-react";

interface Attraction {
  name: string;
  type: string;
  distance: string;
  icon: React.ReactNode;
}

const cityAttractions: Record<string, Attraction[]> = {
  Hyderabad: [
    { name: "Rajiv Gandhi International Airport", type: "Transport", distance: "30 km", icon: <Plane className="h-4 w-4" /> },
    { name: "Secunderabad Railway Station", type: "Transport", distance: "12 km", icon: <Train className="h-4 w-4" /> },
    { name: "Inorbit Mall", type: "Shopping", distance: "2 km", icon: <ShoppingBag className="h-4 w-4" /> },
    { name: "KBR National Park", type: "Nature", distance: "5 km", icon: <TreePine className="h-4 w-4" /> },
    { name: "Charminar", type: "Landmark", distance: "15 km", icon: <Landmark className="h-4 w-4" /> },
    { name: "HITEC City Tech Hub", type: "Business", distance: "1 km", icon: <Building2 className="h-4 w-4" /> },
    { name: "Paradise Restaurant", type: "Dining", distance: "3 km", icon: <Utensils className="h-4 w-4" /> },
    { name: "Financial District", type: "Business", distance: "4 km", icon: <Building2 className="h-4 w-4" /> },
  ],
  Vijayawada: [
    { name: "Gannavaram Airport", type: "Transport", distance: "18 km", icon: <Plane className="h-4 w-4" /> },
    { name: "Vijayawada Junction", type: "Transport", distance: "3 km", icon: <Train className="h-4 w-4" /> },
    { name: "Kanaka Durga Temple", type: "Landmark", distance: "5 km", icon: <Landmark className="h-4 w-4" /> },
    { name: "Prakasam Barrage", type: "Landmark", distance: "4 km", icon: <Landmark className="h-4 w-4" /> },
    { name: "PVR Cinemas", type: "Entertainment", distance: "1 km", icon: <ShoppingBag className="h-4 w-4" /> },
    { name: "Amaravati Capital", type: "Development", distance: "25 km", icon: <Building2 className="h-4 w-4" /> },
  ],
};

interface HotelNearbyAttractionsProps {
  city: string;
  locality: string;
}

const HotelNearbyAttractions = ({ city, locality }: HotelNearbyAttractionsProps) => {
  const attractions = cityAttractions[city] || cityAttractions["Hyderabad"];

  const typeColors: Record<string, string> = {
    Transport: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    Shopping: "bg-pink-500/10 text-pink-600 border-pink-500/20",
    Nature: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    Landmark: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    Business: "bg-violet-500/10 text-violet-600 border-violet-500/20",
    Dining: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    Entertainment: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    Development: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Navigation2 className="h-5 w-5 text-primary" />
          Nearby Attractions & Landmarks
        </h3>
        <p className="text-sm text-muted-foreground mt-1">Key places near {locality}, {city}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {attractions.map((attraction, i) => (
          <motion.div
            key={attraction.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="hover:border-primary/20 transition-colors">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  {attraction.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attraction.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className={`text-[10px] py-0 ${typeColors[attraction.type] || ""}`}>
                      {attraction.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />{attraction.distance}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Nearby Properties CTA */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/10">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Properties Near This Hotel</h4>
            <p className="text-xs text-muted-foreground">
              Explore residential projects and properties within {locality} for a convenient property hunt.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HotelNearbyAttractions;
