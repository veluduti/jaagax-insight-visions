import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface PropertyAmenitiesProps {
  type: string;
  verified: boolean;
}

const PropertyAmenities = ({ type, verified }: PropertyAmenitiesProps) => {
  // Common amenities based on property type
  const getAmenities = () => {
    const commonAmenities = [
      "Power Backup",
      "Lift",
      "Reserved Parking",
      "Security / Fire Alarm",
      "Waste Disposal",
    ];

    if (type.toLowerCase().includes("apartment") || type.toLowerCase().includes("flat")) {
      return [
        ...commonAmenities,
        "Gymnasium",
        "Swimming Pool",
        "Balcony",
        "Kids Play Area",
        "Clubhouse",
      ];
    }

    if (type.toLowerCase().includes("villa") || type.toLowerCase().includes("house")) {
      return [
        ...commonAmenities,
        "Private Garden",
        "Private Pool",
        "Terrace",
        "Servant Quarters",
        "Study Room",
      ];
    }

    return commonAmenities;
  };

  const amenities = getAmenities();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-panel rounded-xl p-6"
    >
      <h2 className="text-2xl font-bold mb-6">Amenities & Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {amenities.map((amenity, index) => (
          <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
            <span className="text-sm">{amenity}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default PropertyAmenities;
