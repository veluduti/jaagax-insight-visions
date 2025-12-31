import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Hotel, Calendar as CalendarIcon, MapPin, Star, 
  CheckCircle2, Users, Loader2, Minus, Plus, BedDouble
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { format, addDays, differenceInDays } from "date-fns";

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

interface HotelOnlyBookingProps {
  open: boolean;
  onClose: () => void;
  hotel: PartnerHotel;
}

export const HotelOnlyBooking = ({ open, onClose, hotel }: HotelOnlyBookingProps) => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  
  const [checkInDate, setCheckInDate] = useState<Date | undefined>();
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>();
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [specialRequests, setSpecialRequests] = useState("");

  const discountedPrice = hotel.discount_percentage 
    ? hotel.price_per_night * (1 - hotel.discount_percentage / 100)
    : hotel.price_per_night;

  const nights = checkInDate && checkOutDate 
    ? Math.max(1, differenceInDays(checkOutDate, checkInDate))
    : 1;

  const totalPrice = discountedPrice * nights * rooms;
  const savings = hotel.discount_percentage 
    ? (hotel.price_per_night - discountedPrice) * nights * rooms
    : 0;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-3 w-3 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} 
      />
    ));
  };

  const handleCheckInSelect = (date: Date | undefined) => {
    setCheckInDate(date);
    if (date && (!checkOutDate || checkOutDate <= date)) {
      setCheckOutDate(addDays(date, 1));
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please login to book');
      return;
    }

    if (!checkInDate || !checkOutDate) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('visit_stay_bookings')
        .insert({
          user_id: user.id,
          property_id: null,
          hotel_id: hotel.id,
          package_id: null,
          booking_type: 'hotel_only',
          check_in_date: checkInDate.toISOString().split('T')[0],
          check_out_date: checkOutDate.toISOString().split('T')[0],
          number_of_guests: guests,
          number_of_rooms: rooms,
          visit_date: null,
          visit_time: null,
          total_hotel_price: hotel.price_per_night * nights * rooms,
          total_package_price: totalPrice,
          discount_applied: savings,
          final_price: totalPrice,
          special_requests: specialRequests || null,
          status: 'pending',
          ai_suggested: false,
          suggestion_reason: null
        });

      if (error) throw error;

      toast.success('Hotel booked successfully! Check your email for confirmation.');
      onClose();
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Failed to complete booking');
    } finally {
      setSubmitting(false);
    }
  };

  const defaultImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=60";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5 text-primary" />
            Book Hotel
          </DialogTitle>
          <DialogDescription>
            Quick hotel booking without property visit
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Hotel Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4 p-4 bg-muted/30 rounded-xl"
          >
            <img 
              src={hotel.images?.[0] || defaultImage} 
              alt={hotel.name}
              className="w-24 h-24 rounded-lg object-cover"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{hotel.name}</h3>
              <div className="flex items-center gap-1 mt-1">
                {renderStars(hotel.star_rating || 3)}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {hotel.locality}, {hotel.city}
              </p>
              {hotel.discount_percentage && hotel.discount_percentage > 0 && (
                <Badge className="mt-2 bg-emerald-500 text-white border-0">
                  {hotel.discount_percentage}% JaagaX Discount
                </Badge>
              )}
            </div>
          </motion.div>

          <Separator />

          {/* Date Selection */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Check-in Date
              </Label>
              <Calendar
                mode="single"
                selected={checkInDate}
                onSelect={handleCheckInSelect}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Check-out Date
              </Label>
              <Calendar
                mode="single"
                selected={checkOutDate}
                onSelect={setCheckOutDate}
                disabled={(date) => !checkInDate || date <= checkInDate}
                className="rounded-md border"
              />
            </div>
          </div>

          {/* Guests & Rooms */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Guests
              </Label>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setGuests(Math.max(1, guests - 1))}
                  disabled={guests <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold w-8 text-center">{guests}</span>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setGuests(Math.min(10, guests + 1))}
                  disabled={guests >= 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-primary" />
                Rooms
              </Label>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setRooms(Math.max(1, rooms - 1))}
                  disabled={rooms <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold w-8 text-center">{rooms}</span>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setRooms(Math.min(5, rooms + 1))}
                  disabled={rooms >= 5}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Special Requests */}
          <div className="space-y-2">
            <Label>Special Requests (Optional)</Label>
            <Textarea
              placeholder="Any special requirements? (e.g., early check-in, quiet room, etc.)"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              rows={3}
            />
          </div>

          <Separator />

          {/* Pricing Summary */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl space-y-3"
          >
            <h4 className="font-semibold">Booking Summary</h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  ₹{Math.round(discountedPrice).toLocaleString()} × {nights} night{nights > 1 ? 's' : ''} × {rooms} room{rooms > 1 ? 's' : ''}
                </span>
                <span>₹{Math.round(totalPrice).toLocaleString()}</span>
              </div>
              
              {savings > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>JaagaX Discount ({hotel.discount_percentage}%)</span>
                  <span>- ₹{Math.round(savings).toLocaleString()}</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <div>
                <span className="text-lg font-bold">Total</span>
                {checkInDate && checkOutDate && (
                  <p className="text-xs text-muted-foreground">
                    {format(checkInDate, 'MMM d')} - {format(checkOutDate, 'MMM d, yyyy')}
                  </p>
                )}
              </div>
              <span className="text-2xl font-bold">₹{Math.round(totalPrice).toLocaleString()}</span>
            </div>
          </motion.div>

          {/* Submit Button */}
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || !checkInDate || !checkOutDate}
            className="w-full gap-2"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Booking...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirm Booking
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Free cancellation up to 24 hours before check-in
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HotelOnlyBooking;
