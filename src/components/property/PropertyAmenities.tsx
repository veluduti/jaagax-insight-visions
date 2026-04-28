import { motion } from "framer-motion";
import {
  CheckCircle2, Waves, Dumbbell, TreePine, Shield,
  Zap, Car, Baby, Users, Building2, Wind,
  Droplets, Sun, Home, GraduationCap, Wifi, Sparkles,
} from "lucide-react";

interface PropertyAmenitiesProps {
  /** Real amenities from the property record. Section is hidden if empty. */
  amenities?: string[] | null;
}

// Map a normalized amenity name to a Lucide icon
const ICON_MAP: Record<string, any> = {
  "power backup": Zap,
  "lift": Building2,
  "elevator": Building2,
  "reserved parking": Car,
  "parking": Car,
  "security": Shield,
  "fire alarm": Shield,
  "security / fire alarm": Shield,
  "waste disposal": Wind,
  "high speed internet": Wifi,
  "internet": Wifi,
  "wifi": Wifi,
  "gymnasium": Dumbbell,
  "gym": Dumbbell,
  "swimming pool": Waves,
  "pool": Waves,
  "private pool": Waves,
  "balcony": Sun,
  "kids play area": Baby,
  "kids' play area": Baby,
  "play area": Baby,
  "clubhouse": Users,
  "garden": TreePine,
  "garden / parks": TreePine,
  "private garden": TreePine,
  "park": TreePine,
  "water storage": Droplets,
  "intercom": Building2,
  "intercom facility": Building2,
  "terrace": Sun,
  "servant quarters": Home,
  "study room": GraduationCap,
};

const iconFor = (name: string) => {
  const key = name.trim().toLowerCase();
  return ICON_MAP[key] || Sparkles;
};

const PropertyAmenities = ({ amenities }: PropertyAmenitiesProps) => {
  const list = (amenities || [])
    .map((a) => (typeof a === "string" ? a.trim() : ""))
    .filter(Boolean);

  // STRICT: hide the entire section if no real amenities exist
  if (list.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-panel rounded-xl p-6"
    >
      <h2 className="text-2xl font-bold mb-6">Features / Amenities</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {list.map((amenity, index) => {
          const Icon = iconFor(amenity);
          return (
            <div
              key={`${amenity}-${index}`}
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background/50 hover:bg-background/70 transition-colors text-center"
            >
              <Icon className="h-6 w-6 text-primary" />
              <span className="text-xs font-medium capitalize">{amenity}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default PropertyAmenities;
