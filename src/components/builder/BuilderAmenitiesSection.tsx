import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Waves, Dumbbell, Car, Trees, Shield, Wifi, Wind, Droplets, Zap, Baby, Dog, Flower2, Gamepad2, BookOpen, Coffee, Sparkles } from "lucide-react";

const amenityIcons: Record<string, any> = {
  "Swimming Pool": Waves, "Gym": Dumbbell, "Parking": Car, "Garden": Trees,
  "Security": Shield, "Wi-Fi": Wifi, "AC": Wind, "Water Supply": Droplets,
  "Power Backup": Zap, "Kids Play Area": Baby, "Pet Friendly": Dog,
  "Landscaping": Flower2, "Game Room": Gamepad2, "Library": BookOpen, "Cafeteria": Coffee,
};

interface Props {
  amenities: string[];
  unitTypes: string[];
}

const BuilderAmenitiesSection = ({ amenities, unitTypes }: Props) => {
  if ((!amenities || amenities.length === 0) && (!unitTypes || unitTypes.length === 0)) return null;

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        {unitTypes?.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Unit Configurations
            </h3>
            <div className="flex flex-wrap gap-2">
              {unitTypes.map((u: string) => (
                <Badge key={u} variant="outline" className="text-xs px-3 py-1">{u}</Badge>
              ))}
            </div>
          </div>
        )}

        {amenities?.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Amenities Offered
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {amenities.map((a: string) => {
                const Icon = amenityIcons[a] || Shield;
                return (
                  <div key={a} className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-muted/50 text-center hover:bg-primary/5 transition-colors">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-[11px] text-muted-foreground leading-tight">{a}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BuilderAmenitiesSection;
