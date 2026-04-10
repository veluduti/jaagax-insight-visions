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
  tier?: string;
}

const BuilderAmenitiesSection = ({ amenities, unitTypes, tier = "standard" }: Props) => {
  if ((!amenities || amenities.length === 0) && (!unitTypes || unitTypes.length === 0)) return null;

  return (
    <div className="p-6 space-y-5 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.06]">
      {unitTypes?.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-zinc-200">
            <Sparkles className="h-4 w-4 text-violet-400" /> Unit Configurations
          </h3>
          <div className="flex flex-wrap gap-2">
            {unitTypes.map((u: string) => (
              <Badge key={u} variant="outline" className="text-xs px-3 py-1.5 rounded-full border-white/[0.08] text-zinc-400 bg-white/[0.03]">
                {u}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {amenities?.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-zinc-200">
            <Shield className="h-4 w-4 text-violet-400" /> Amenities Offered
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
            {amenities.map((a: string) => {
              const Icon = amenityIcons[a] || Shield;
              return (
                <div key={a} className="flex flex-col items-center gap-2 p-3.5 text-center rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-violet-500/20 hover:bg-violet-500/[0.04] transition-all duration-200 group">
                  <Icon className="h-5 w-5 text-violet-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] text-zinc-500 leading-tight">{a}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BuilderAmenitiesSection;
