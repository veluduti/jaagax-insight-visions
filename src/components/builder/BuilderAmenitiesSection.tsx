import { Badge } from "@/components/ui/badge";
import { Waves, Dumbbell, Car, Trees, Shield, Wifi, Wind, Droplets, Zap, Baby, Dog, Flower2, Gamepad2, BookOpen, Coffee, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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

const tierCard = {
  luxury: "bg-[#0f1510]/80 backdrop-blur-md border border-[#2a3a20]/40 rounded-2xl",
  standard: "bg-white/80 dark:bg-[#141a12]/60 backdrop-blur-md border border-[#d4e0d0] dark:border-[#1e2e1a]/50 rounded-2xl",
  budget: "bg-white dark:bg-slate-800/60 border border-blue-100 dark:border-blue-800/30 rounded-2xl",
};

const tierHeading = {
  luxury: "text-[#c8b882]",
  standard: "text-[#2a3a28] dark:text-[#d0daca]",
  budget: "text-slate-800 dark:text-white",
};

const tierIcon = {
  luxury: "text-[#c8b882]",
  standard: "text-[#2a5a24] dark:text-emerald-400",
  budget: "text-blue-600 dark:text-blue-400",
};

const tierAmenityItem = {
  luxury: "bg-[#1a2a14]/60 border border-[#2a3a20]/30 hover:border-[#c8b882]/20 rounded-xl",
  standard: "bg-[#eaf2e8]/40 dark:bg-[#1a2a14]/30 border border-transparent hover:border-[#2a5a24]/20 rounded-xl",
  budget: "bg-blue-50/60 dark:bg-blue-900/10 border border-transparent hover:border-blue-200 rounded-xl",
};

const BuilderAmenitiesSection = ({ amenities, unitTypes, tier = "standard" }: Props) => {
  if ((!amenities || amenities.length === 0) && (!unitTypes || unitTypes.length === 0)) return null;

  const card = tierCard[tier as keyof typeof tierCard] || tierCard.standard;
  const heading = tierHeading[tier as keyof typeof tierHeading] || tierHeading.standard;
  const iconColor = tierIcon[tier as keyof typeof tierIcon] || tierIcon.standard;
  const itemStyle = tierAmenityItem[tier as keyof typeof tierAmenityItem] || tierAmenityItem.standard;

  return (
    <div className={cn("p-6 space-y-5", card)}>
      {unitTypes?.length > 0 && (
        <div>
          <h3 className={cn("font-semibold text-sm mb-3 flex items-center gap-2", heading)}>
            <Sparkles className={cn("h-4 w-4", iconColor)} /> Unit Configurations
          </h3>
          <div className="flex flex-wrap gap-2">
            {unitTypes.map((u: string) => (
              <Badge
                key={u}
                variant="outline"
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg",
                  tier === "luxury" ? "border-[#2a3a20]/50 text-[#8a9a78]" : ""
                )}
              >
                {u}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {amenities?.length > 0 && (
        <div>
          <h3 className={cn("font-semibold text-sm mb-3 flex items-center gap-2", heading)}>
            <Shield className={cn("h-4 w-4", iconColor)} /> Amenities Offered
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
            {amenities.map((a: string) => {
              const Icon = amenityIcons[a] || Shield;
              return (
                <div key={a} className={cn("flex flex-col items-center gap-2 p-3.5 text-center transition-all duration-200 group", itemStyle)}>
                  <Icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", iconColor)} />
                  <span className="text-[11px] text-muted-foreground leading-tight">{a}</span>
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
