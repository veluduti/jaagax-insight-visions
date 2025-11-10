import { motion } from "framer-motion";
import { 
  CheckCircle2, Waves, Dumbbell, TreePine, Shield, 
  Zap, Car, Baby, Users, Building2, Wind,
  Droplets, Sun, Home, GraduationCap, Wifi
} from "lucide-react";

interface PropertyAmenitiesProps {
  type: string;
  verified: boolean;
}

const PropertyAmenities = ({ type, verified }: PropertyAmenitiesProps) => {
  // Amenities with icons
  const getAmenitiesWithIcons = () => {
    const commonAmenities = [
      { name: "Power Backup", icon: Zap },
      { name: "Lift", icon: Building2 },
      { name: "Reserved Parking", icon: Car },
      { name: "Security / Fire Alarm", icon: Shield },
      { name: "Waste Disposal", icon: Wind },
      { name: "High Speed Internet", icon: Wifi },
    ];

    if (type.toLowerCase().includes("apartment") || type.toLowerCase().includes("flat")) {
      return [
        ...commonAmenities,
        { name: "Gymnasium", icon: Dumbbell },
        { name: "Swimming Pool", icon: Waves },
        { name: "Balcony", icon: Sun },
        { name: "Kids Play Area", icon: Baby },
        { name: "Clubhouse", icon: Users },
        { name: "Garden / Parks", icon: TreePine },
        { name: "Water Storage", icon: Droplets },
        { name: "Intercom Facility", icon: Building2 },
      ];
    }

    if (type.toLowerCase().includes("villa") || type.toLowerCase().includes("house")) {
      return [
        ...commonAmenities,
        { name: "Private Garden", icon: TreePine },
        { name: "Private Pool", icon: Waves },
        { name: "Terrace", icon: Sun },
        { name: "Servant Quarters", icon: Home },
        { name: "Study Room", icon: GraduationCap },
        { name: "Water Storage", icon: Droplets },
      ];
    }

    return commonAmenities;
  };

  const amenities = getAmenitiesWithIcons();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-panel rounded-xl p-6"
    >
      <h2 className="text-2xl font-bold mb-6">Features / Amenities</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {amenities.map((amenity, index) => {
          const Icon = amenity.icon;
          return (
            <div 
              key={index} 
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background/50 hover:bg-background/70 transition-colors text-center"
            >
              <Icon className="h-6 w-6 text-primary" />
              <span className="text-xs font-medium">{amenity.name}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default PropertyAmenities;
