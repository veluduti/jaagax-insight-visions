import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Wifi, Car, Coffee, Dumbbell, Waves, Utensils, Tv, Wind, ShieldCheck,
  Clock, Sparkles, ParkingCircle, Accessibility, Dog, Cigarette,
  Globe, CreditCard, BedDouble, Building2, Phone, Mail
} from "lucide-react";

const amenityIconMap: Record<string, React.ReactNode> = {
  "Free WiFi": <Wifi className="h-5 w-5" />,
  "WiFi": <Wifi className="h-5 w-5" />,
  "Swimming Pool": <Waves className="h-5 w-5" />,
  "Pool": <Waves className="h-5 w-5" />,
  "Gym": <Dumbbell className="h-5 w-5" />,
  "Fitness Center": <Dumbbell className="h-5 w-5" />,
  "Restaurant": <Utensils className="h-5 w-5" />,
  "Bar": <Utensils className="h-5 w-5" />,
  "Spa": <Sparkles className="h-5 w-5" />,
  "Business Center": <Building2 className="h-5 w-5" />,
  "Room Service": <Clock className="h-5 w-5" />,
  "Parking": <ParkingCircle className="h-5 w-5" />,
  "Free Parking": <ParkingCircle className="h-5 w-5" />,
  "AC": <Wind className="h-5 w-5" />,
  "Air Conditioning": <Wind className="h-5 w-5" />,
  "24/7 Security": <ShieldCheck className="h-5 w-5" />,
  "Laundry": <Clock className="h-5 w-5" />,
  "Concierge": <Globe className="h-5 w-5" />,
  "Breakfast": <Coffee className="h-5 w-5" />,
  "Complimentary Breakfast": <Coffee className="h-5 w-5" />,
  "TV": <Tv className="h-5 w-5" />,
};

interface HotelSpecsGridProps {
  hotel: {
    amenities: string[] | null;
    total_rooms?: number;
    star_rating: number | null;
    check_in_time?: string;
    check_out_time?: string;
    pet_friendly?: boolean;
    wheelchair_accessible?: boolean;
    smoking_allowed?: boolean;
    languages_spoken?: string[];
    accepts_cards?: boolean;
    address: string | null;
  };
}

const HotelSpecsGrid = ({ hotel }: HotelSpecsGridProps) => {
  const quickSpecs = [
    { label: "Total Rooms", value: hotel.total_rooms || "200+", icon: <BedDouble className="h-4 w-4" /> },
    { label: "Star Rating", value: `${hotel.star_rating || 3} Star`, icon: <Sparkles className="h-4 w-4" /> },
    { label: "Check-in", value: hotel.check_in_time || "14:00", icon: <Clock className="h-4 w-4" /> },
    { label: "Check-out", value: hotel.check_out_time || "12:00", icon: <Clock className="h-4 w-4" /> },
    { label: "Pet Friendly", value: hotel.pet_friendly ? "Yes" : "No", icon: <Dog className="h-4 w-4" /> },
    { label: "Wheelchair Access", value: hotel.wheelchair_accessible ? "Yes" : "No", icon: <Accessibility className="h-4 w-4" /> },
    { label: "Smoking", value: hotel.smoking_allowed ? "Allowed" : "No Smoking", icon: <Cigarette className="h-4 w-4" /> },
    { label: "Card Payment", value: hotel.accepts_cards ? "Accepted" : "Cash Only", icon: <CreditCard className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-8">
      {/* Key Specifications */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Key Specifications
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickSpecs.map((spec, i) => (
            <motion.div
              key={spec.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1 text-primary">{spec.icon}<span className="text-xs text-muted-foreground">{spec.label}</span></div>
              <p className="font-semibold text-sm">{spec.value}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Amenities Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Amenities & Facilities
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {(hotel.amenities || []).map((amenity, i) => (
            <motion.div
              key={amenity}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/40 hover:bg-primary/5 hover:border-primary/20 transition-all"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                {amenityIconMap[amenity] || <ShieldCheck className="h-5 w-5" />}
              </div>
              <span className="text-sm font-medium">{amenity}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Languages */}
      {hotel.languages_spoken && hotel.languages_spoken.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Languages Spoken
          </h3>
          <div className="flex flex-wrap gap-2">
            {hotel.languages_spoken.map((lang) => (
              <Badge key={lang} variant="outline" className="py-1.5 px-3">{lang}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelSpecsGrid;
