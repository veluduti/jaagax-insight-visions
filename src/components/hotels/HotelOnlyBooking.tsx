import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Hotel, Construction } from "lucide-react";

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

// Stub component - visit_stay_bookings table not yet created
export const HotelOnlyBooking = ({ open, onClose, hotel }: HotelOnlyBookingProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5 text-primary" />
            Book {hotel.name}
          </DialogTitle>
          <DialogDescription>
            Quick hotel booking
          </DialogDescription>
        </DialogHeader>

        <div className="text-center py-8">
          <Construction className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">Coming Soon</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Hotel booking feature is being set up. Check back soon!
          </p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HotelOnlyBooking;
