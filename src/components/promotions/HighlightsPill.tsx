import { motion } from "framer-motion";
import { 
  Wifi, Car, Trees, Dumbbell, Shield, School, 
  Hospital, ShoppingBag, Train, Plane, Waves, 
  Sun, Wind, Zap, Droplets
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HighlightsPillProps {
  highlights: string[];
}

const iconMap: Record<string, any> = {
  'Swimming Pool': Waves,
  'Gym': Dumbbell,
  'Clubhouse': Shield,
  '24/7 Security': Shield,
  'Smart Homes': Zap,
  'Green Building': Trees,
  'Metro Connectivity': Train,
  'Near Airport': Plane,
  'Gated Community': Shield,
  'Private Pool Option': Waves,
  'Golf Course': Trees,
  'Solar Powered': Sun,
  'Rainwater Harvesting': Droplets,
  'Organic Farm': Trees,
  'Near IT Hub': Wifi,
  'Covered Parking': Car,
};

const HighlightsPill = ({ highlights }: HighlightsPillProps) => {
  if (!highlights || highlights.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-2"
    >
      {highlights.slice(0, 4).map((highlight, i) => {
        const Icon = iconMap[highlight] || Shield;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
              "bg-white/10 backdrop-blur-sm text-white border border-white/10"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{highlight}</span>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default HighlightsPill;
