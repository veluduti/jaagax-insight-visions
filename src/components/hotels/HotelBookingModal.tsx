import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, BedDouble, Users, Loader2, Hotel } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HotelBookingModalProps {
  open: boolean;
  onClose: () => void;
  hotel: {
    id: string;
    name: string;
    price_per_night: number;
    discount_percentage: number | null;
  };
  bookingType: "hotel_only" | "with_visit";
}

const HotelBookingModal = ({ open, onClose, hotel, bookingType }: HotelBookingModalProps) => {
  const [checkIn, setCheckIn] = useState<Date | undefined>(addDays(new Date(), 1));
  const [checkOut, setCheckOut] = useState<Date | undefined>(addDays(new Date(), 2));
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [numGuests, setNumGuests] = useState("1");
  const [numRooms, setNumRooms] = useState("1");
  const [roomType, setRoomType] = useState("Standard");
  const [specialRequests, setSpecialRequests] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const discountedPrice = hotel.discount_percentage
    ? hotel.price_per_night * (1 - hotel.discount_percentage / 100)
    : hotel.price_per_night;

  const nights = checkIn && checkOut ? Math.max(differenceInDays(checkOut, checkIn), 1) : 1;
  const totalAmount = Math.round(discountedPrice * nights * parseInt(numRooms || "1"));

  const handleSubmit = async () => {
    if (!guestName.trim()) { toast.error("Please enter guest name"); return; }
    if (!checkIn || !checkOut) { toast.error("Please select dates"); return; }
    if (checkOut <= checkIn) { toast.error("Check-out must be after check-in"); return; }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("hotel_bookings").insert({
        hotel_id: hotel.id,
        user_id: user?.id || null,
        guest_name: guestName.trim(),
        guest_email: guestEmail.trim() || null,
        guest_phone: guestPhone.trim() || null,
        check_in: format(checkIn, "yyyy-MM-dd"),
        check_out: format(checkOut, "yyyy-MM-dd"),
        num_guests: parseInt(numGuests),
        num_rooms: parseInt(numRooms),
        room_type: roomType,
        booking_type: bookingType,
        special_requests: specialRequests.trim() || null,
        total_amount: totalAmount,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Booking confirmed!", { description: `${hotel.name} • ${nights} night(s) • ₹${totalAmount.toLocaleString()}` });
      onClose();
    } catch (err: any) {
      console.error("Booking error:", err);
      toast.error("Booking failed", { description: err.message || "Please try again" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5 text-primary" />
            {bookingType === "with_visit" ? "Book with Site Visit" : "Book Hotel Only"}
          </DialogTitle>
          <DialogDescription>{hotel.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Check-in</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !checkIn && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkIn ? format(checkIn, "MMM dd, yyyy") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={checkIn} onSelect={setCheckIn} disabled={(d) => d < new Date()} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Check-out</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !checkOut && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkOut ? format(checkOut, "MMM dd, yyyy") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={checkOut} onSelect={setCheckOut} disabled={(d) => d <= (checkIn || new Date())} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Guest Name */}
          <div className="space-y-1.5">
            <Label>Guest Name *</Label>
            <Input placeholder="Full name" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="email@example.com" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input placeholder="+91..." value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
            </div>
          </div>

          {/* Room details */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><Users className="h-3 w-3" /> Guests</Label>
              <Select value={numGuests} onValueChange={setNumGuests}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[1,2,3,4,5,6].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> Rooms</Label>
              <Select value={numRooms} onValueChange={setNumRooms}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Room Type</Label>
              <Select value={roomType} onValueChange={setRoomType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Deluxe">Deluxe</SelectItem>
                  <SelectItem value="Suite">Suite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Special Requests */}
          <div className="space-y-1.5">
            <Label>Special Requests</Label>
            <Textarea placeholder="Any special requirements..." value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} rows={2} />
          </div>

          <Separator />

          {/* Price Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>₹{Math.round(discountedPrice).toLocaleString()} × {nights} night(s) × {numRooms} room(s)</span>
              <span>₹{totalAmount.toLocaleString()}</span>
            </div>
            {hotel.discount_percentage && hotel.discount_percentage > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>JaagaX Discount ({hotel.discount_percentage}%)</span>
                <span>-₹{Math.round(hotel.price_per_night * nights * parseInt(numRooms) - totalAmount).toLocaleString()}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>₹{totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <Button className="w-full h-12" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</> : `Confirm Booking • ₹${totalAmount.toLocaleString()}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HotelBookingModal;
