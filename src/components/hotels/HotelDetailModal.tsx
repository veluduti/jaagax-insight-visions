import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, Star, Phone, Mail, Calendar, 
  Wifi, Car, Coffee, Dumbbell, Waves, Utensils, 
  Tv, Wind, ShieldCheck, Clock, Building2
} from "lucide-react";

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
  contact_phone: string | null;
  contact_email: string | null;
  partner_since: string | null;
}

interface HotelDetailModalProps {
  hotel: PartnerHotel | null;
  open: boolean;
  onClose: () => void;
  onBookWithVisit: (hotel: PartnerHotel) => void;
  onBookHotelOnly: (hotel: PartnerHotel) => void;
}

const amenityIconMap: Record<string, React.ReactNode> = {
  'WiFi': <Wifi className="h-4 w-4" />,
  'Free WiFi': <Wifi className="h-4 w-4" />,
  'Parking': <Car className="h-4 w-4" />,
  'Free Parking': <Car className="h-4 w-4" />,
  'Breakfast': <Coffee className="h-4 w-4" />,
  'Complimentary Breakfast': <Coffee className="h-4 w-4" />,
  'Gym': <Dumbbell className="h-4 w-4" />,
  'Fitness Center': <Dumbbell className="h-4 w-4" />,
  'Pool': <Waves className="h-4 w-4" />,
  'Swimming Pool': <Waves className="h-4 w-4" />,
  'Restaurant': <Utensils className="h-4 w-4" />,
  'TV': <Tv className="h-4 w-4" />,
  'AC': <Wind className="h-4 w-4" />,
  'Air Conditioning': <Wind className="h-4 w-4" />,
  '24/7 Security': <ShieldCheck className="h-4 w-4" />,
  'Room Service': <Clock className="h-4 w-4" />,
};

const HotelDetailModal = ({ hotel, open, onClose, onBookWithVisit, onBookHotelOnly }: HotelDetailModalProps) => {
  if (!hotel) return null;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} 
      />
    ));
  };

  const discountedPrice = hotel.discount_percentage 
    ? hotel.price_per_night * (1 - hotel.discount_percentage / 100)
    : hotel.price_per_night;

  const defaultImages = [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop&q=60",
  ];

  const images = hotel.images && hotel.images.length > 0 ? hotel.images : defaultImages;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {/* Image Gallery */}
        <div className="relative">
          <div className="grid grid-cols-3 gap-1 h-64">
            <div className="col-span-2 row-span-1">
              <img 
                src={images[0]} 
                alt={hotel.name}
                className="w-full h-full object-cover rounded-tl-lg"
               loading="lazy" decoding="async" />
            </div>
            <div className="flex flex-col gap-1">
              <img 
                src={images[1] || images[0]} 
                alt={hotel.name}
                className="w-full h-1/2 object-cover rounded-tr-lg"
               loading="lazy" decoding="async" />
              <img 
                src={images[2] || images[0]} 
                alt={hotel.name}
                className="w-full h-1/2 object-cover"
               loading="lazy" decoding="async" />
            </div>
          </div>

          {/* Discount Badge */}
          {hotel.discount_percentage && hotel.discount_percentage > 0 && (
            <Badge className="absolute top-4 left-4 bg-emerald-500 hover:bg-emerald-600 text-white border-0 text-sm px-3 py-1">
              {hotel.discount_percentage}% JaagaX Exclusive Discount
            </Badge>
          )}
        </div>

        <div className="p-6 space-y-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl">{hotel.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-0.5">
                    {renderStars(hotel.star_rating || 3)}
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {hotel.locality}, {hotel.city}
                  </span>
                </div>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Building2 className="h-3 w-3" />
                JaagaX Partner
              </Badge>
            </div>
          </DialogHeader>

          {/* Address */}
          {hotel.address && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">{hotel.address}</p>
            </div>
          )}

          {/* Amenities */}
          <div>
            <h3 className="font-semibold mb-3">Amenities</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {hotel.amenities?.map((amenity, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/30"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {amenityIconMap[amenity] || <ShieldCheck className="h-4 w-4" />}
                  </div>
                  <span className="text-sm">{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Contact Info */}
          <div className="grid md:grid-cols-2 gap-4">
            {hotel.contact_phone && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{hotel.contact_phone}</p>
                </div>
              </div>
            )}
            {hotel.contact_email && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{hotel.contact_email}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Pricing & Booking */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl">
            <div>
              <p className="text-sm text-muted-foreground">Price per night</p>
              <div className="flex items-baseline gap-2">
                {hotel.discount_percentage && hotel.discount_percentage > 0 && (
                  <span className="text-lg text-muted-foreground line-through">
                    ₹{hotel.price_per_night.toLocaleString()}
                  </span>
                )}
                <span className="text-3xl font-bold text-foreground">
                  ₹{Math.round(discountedPrice).toLocaleString()}
                </span>
              </div>
              {hotel.partner_since && (
                <p className="text-xs text-muted-foreground mt-1">
                  Partner since {new Date(hotel.partner_since).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => onBookHotelOnly(hotel)}
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                Book Hotel Only
              </Button>
              <Button 
                size="lg"
                onClick={() => onBookWithVisit(hotel)}
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                Book with Site Visit
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HotelDetailModal;
