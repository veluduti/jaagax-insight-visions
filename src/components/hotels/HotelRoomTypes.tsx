import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BedDouble, Users, Maximize, Wifi, Tv, Wind, Coffee, Check } from "lucide-react";
import { toast } from "sonner";

interface RoomType {
  name: string;
  image: string;
  size: string;
  maxGuests: number;
  bedType: string;
  priceMultiplier: number;
  amenities: string[];
  popular?: boolean;
}

interface HotelRoomTypesProps {
  hotelId: string;
  hotelName: string;
  basePrice: number;
  discount: number;
}

const roomTypes: RoomType[] = [
  {
    name: "Standard Room",
    image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600",
    size: "280 sq ft",
    maxGuests: 2,
    bedType: "Queen Bed",
    priceMultiplier: 1,
    amenities: ["Free WiFi", "TV", "AC", "Mini Bar"],
  },
  {
    name: "Deluxe Room",
    image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600",
    size: "380 sq ft",
    maxGuests: 2,
    bedType: "King Bed",
    priceMultiplier: 1.4,
    amenities: ["Free WiFi", "TV", "AC", "Mini Bar", "City View", "Workspace"],
    popular: true,
  },
  {
    name: "Premium Suite",
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600",
    size: "520 sq ft",
    maxGuests: 3,
    bedType: "King Bed + Sofa",
    priceMultiplier: 2,
    amenities: ["Free WiFi", "TV", "AC", "Mini Bar", "City View", "Living Area", "Bathtub", "Breakfast"],
  },
  {
    name: "Presidential Suite",
    image: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600",
    size: "850 sq ft",
    maxGuests: 4,
    bedType: "King Bed + 2 Singles",
    priceMultiplier: 3.2,
    amenities: ["Free WiFi", "TV", "AC", "Mini Bar", "Panoramic View", "Living + Dining", "Jacuzzi", "Butler Service", "Breakfast"],
  },
];

const HotelRoomTypes = ({ hotelId, hotelName, basePrice, discount }: HotelRoomTypesProps) => {
  const getPrice = (multiplier: number) => {
    const price = basePrice * multiplier;
    return discount > 0 ? price * (1 - discount / 100) : price;
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <BedDouble className="h-5 w-5 text-primary" />
        Available Room Types
      </h3>

      <div className="grid gap-4">
        {roomTypes.map((room, i) => (
          <motion.div
            key={room.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className={`overflow-hidden hover:shadow-lg transition-all ${room.popular ? "border-primary/40 ring-1 ring-primary/20" : ""}`}>
              <div className="flex flex-col sm:flex-row">
                {/* Room Image */}
                <div className="sm:w-56 h-40 sm:h-auto relative overflow-hidden shrink-0">
                  <img src={room.image} alt={room.name} className="w-full h-full object-cover"  loading="lazy" decoding="async" />
                  {room.popular && (
                    <Badge className="absolute top-2 left-2 bg-primary border-0 text-xs">Most Popular</Badge>
                  )}
                </div>

                <CardContent className="flex-1 p-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-base">{room.name}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Maximize className="h-3.5 w-3.5" />{room.size}</span>
                          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{room.maxGuests} guests</span>
                          <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{room.bedType}</span>
                        </div>
                      </div>
                    </div>

                    {/* Amenities */}
                    <div className="flex flex-wrap gap-1.5">
                      {room.amenities.map((a) => (
                        <span key={a} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground">
                          <Check className="h-3 w-3 text-emerald-500" />{a}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-end justify-between mt-4 pt-3 border-t border-border/50">
                    <div>
                      {discount > 0 && (
                        <span className="text-sm text-muted-foreground line-through mr-2">
                          ₹{Math.round(basePrice * room.priceMultiplier).toLocaleString()}
                        </span>
                      )}
                      <span className="text-xl font-bold">₹{Math.round(getPrice(room.priceMultiplier)).toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">/night</span>
                    </div>
                    <Button size="sm" onClick={() => toast.success(`${room.name} booking coming soon!`)}>
                      Select Room
                    </Button>
                  </div>
                </CardContent>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default HotelRoomTypes;
