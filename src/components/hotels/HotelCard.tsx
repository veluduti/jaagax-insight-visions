import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Wifi, Car, Coffee, Dumbbell, Waves, Utensils } from "lucide-react";

interface PartnerHotel {
  id: string;
  name: string;
  city: string;
  locality: string;
  address: string | null;
  star_rating: number | null;
  price_per_night: number;
  discount_percentage: number | null;
  amenities: string[] | null;
  images: string[] | null;
}

interface HotelCardProps {
  hotel: PartnerHotel;
  onViewDetails: (hotel: PartnerHotel) => void;
  onBookNow: (hotel: PartnerHotel) => void;
}

const amenityIcons: Record<string, React.ReactNode> = {
  'WiFi': <Wifi className="h-3 w-3" />,
  'Free WiFi': <Wifi className="h-3 w-3" />,
  'Parking': <Car className="h-3 w-3" />,
  'Free Parking': <Car className="h-3 w-3" />,
  'Breakfast': <Coffee className="h-3 w-3" />,
  'Complimentary Breakfast': <Coffee className="h-3 w-3" />,
  'Gym': <Dumbbell className="h-3 w-3" />,
  'Fitness Center': <Dumbbell className="h-3 w-3" />,
  'Pool': <Waves className="h-3 w-3" />,
  'Swimming Pool': <Waves className="h-3 w-3" />,
  'Restaurant': <Utensils className="h-3 w-3" />,
};

const HotelCard = ({ hotel, onViewDetails, onBookNow }: HotelCardProps) => {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-3 w-3 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} 
      />
    ));
  };

  const discountedPrice = hotel.discount_percentage 
    ? hotel.price_per_night * (1 - hotel.discount_percentage / 100)
    : hotel.price_per_night;

  const defaultImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=60";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden group cursor-pointer border-border/50 hover:border-primary/30 transition-all hover:shadow-lg">
        {/* Image Section */}
        <div className="relative h-48 overflow-hidden">
          <img 
            src={hotel.images?.[0] || defaultImage} 
            alt={hotel.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
           loading="lazy" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          
          {/* Discount Badge */}
          {hotel.discount_percentage && hotel.discount_percentage > 0 && (
            <Badge className="absolute top-3 left-3 bg-emerald-500 hover:bg-emerald-600 text-white border-0">
              {hotel.discount_percentage}% OFF
            </Badge>
          )}

          {/* Partner Badge */}
          <Badge variant="secondary" className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm">
            JaagaX Partner
          </Badge>

          {/* Star Rating */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1">
            {renderStars(hotel.star_rating || 3)}
          </div>

          {/* Location */}
          <div className="absolute bottom-3 right-3">
            <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-foreground border-0 gap-1">
              <MapPin className="h-3 w-3" />
              {hotel.locality}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Hotel Name & City */}
          <div>
            <h3 className="font-semibold text-lg line-clamp-1">{hotel.name}</h3>
            <p className="text-sm text-muted-foreground">{hotel.city}</p>
          </div>

          {/* Amenities */}
          {hotel.amenities && hotel.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {hotel.amenities.slice(0, 4).map((amenity, idx) => (
                <Badge key={idx} variant="outline" className="text-xs gap-1 py-0.5">
                  {amenityIcons[amenity] || null}
                  {amenity}
                </Badge>
              ))}
              {hotel.amenities.length > 4 && (
                <Badge variant="outline" className="text-xs py-0.5">
                  +{hotel.amenities.length - 4} more
                </Badge>
              )}
            </div>
          )}

          {/* Price Section */}
          <div className="flex items-end justify-between pt-2 border-t border-border/50">
            <div>
              {hotel.discount_percentage && hotel.discount_percentage > 0 && (
                <span className="text-sm text-muted-foreground line-through mr-2">
                  ₹{hotel.price_per_night.toLocaleString()}
                </span>
              )}
              <span className="text-xl font-bold text-foreground">
                ₹{Math.round(discountedPrice).toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">/night</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(hotel);
              }}
            >
              View Details
            </Button>
            <Button 
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onBookNow(hotel);
              }}
            >
              Book Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default HotelCard;
