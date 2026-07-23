import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, BedDouble, Users, Loader2, Hotel, ChevronDown, Plus, Minus } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CHECKOUT_AFTER_CHECKIN_MSG } from "@/lib/dateRange";
import { useNavigate } from "react-router-dom";

declare global {
  interface Window {
    Razorpay?: any;
  }
}
function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

interface HotelBookingModalProps {
  open: boolean;
  onClose: () => void;
  hotel: {
    id: string;
    name: string;
    price_per_night: number;
    discount_percentage: number | null;
  };
  bookingType: "hotel_only" | "visit_stay";
  initialCheckIn?: Date;
  initialCheckOut?: Date;
  initialGuests?: number;
  initialRooms?: number;
}

const HotelBookingModal = ({
  open,
  onClose,
  hotel,
  bookingType,
  initialCheckIn,
  initialCheckOut,
  initialGuests,
  initialRooms,
}: HotelBookingModalProps) => {
  const [checkIn, setCheckIn] = useState<Date | undefined>(initialCheckIn ?? addDays(new Date(), 1));
  const [checkOut, setCheckOut] = useState<Date | undefined>(initialCheckOut ?? addDays(new Date(), 2));
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [numGuests, setNumGuests] = useState(initialGuests ?? 1);
  const [numRooms, setNumRooms] = useState(initialRooms ?? 1);
  const [roomType, setRoomType] = useState("Standard");
  const [specialRequests, setSpecialRequests] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isGuestDropdownOpen, setIsGuestDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsGuestDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync when search filters change while modal reopens
  useEffect(() => {
    if (!open) return;
    if (initialCheckIn) setCheckIn(initialCheckIn);
    if (initialCheckOut) setCheckOut(initialCheckOut);
    if (initialGuests) setNumGuests(initialGuests);
    if (initialRooms) setNumRooms(initialRooms);
  }, [open, initialCheckIn?.getTime(), initialCheckOut?.getTime(), initialGuests, initialRooms]);

  // Autofill guest details from the logged-in user's profile
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        if (user.email && !guestEmail) setGuestEmail(user.email);
        const meta: any = user.user_metadata || {};
        const metaName = meta.full_name || meta.name || "";
        const metaPhone = meta.phone || user.phone || "";
        if (metaName && !guestName) setGuestName(metaName);
        if (metaPhone && !guestPhone) setGuestPhone(metaPhone);

        const { data: prof } = await (supabase as any)
          .from("profiles")
          .select("full_name, phone, email")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled || !prof) return;
        setGuestName((v) => v || prof.full_name || "");
        setGuestPhone((v) => v || prof.phone || "");
        setGuestEmail((v) => v || prof.email || user.email || "");
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const discountPct = Number(hotel.discount_percentage) || 0;
  const discountedPrice = discountPct > 0 ? hotel.price_per_night * (1 - discountPct / 100) : hotel.price_per_night;

  const nights = checkIn && checkOut ? Math.max(differenceInDays(checkOut, checkIn), 1) : 1;
  const totalAmount = Math.round(discountedPrice * nights * parseInt(numRooms || "1"));
  const originalAmount = Math.round(hotel.price_per_night * nights * parseInt(numRooms || "1"));

  const handleSubmit = async () => {
    if (!guestName.trim()) {
      toast.error("Please enter guest name");
      return;
    }
    if (!guestEmail.trim() || !/^\S+@\S+\.\S+$/.test(guestEmail.trim())) {
      toast.error("Please enter a valid email");
      return;
    }
    if (!guestPhone.trim() || !/^[+\d][\d\s-]{7,}$/.test(guestPhone.trim())) {
      toast.error("Please enter a valid phone");
      return;
    }
    if (!checkIn || !checkOut) {
      toast.error("Please select dates");
      return;
    }
    if (checkOut <= checkIn) {
      toast.error(CHECKOUT_AFTER_CHECKIN_MSG);
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login to book", { description: "Redirecting to login..." });
        onClose();
        navigate("/auth");
        return;
      }

      // Find a bookable room for this hotel (prefer matching room_type)
      const { data: rooms } = await (supabase as any)
        .from("hotel_rooms")
        .select("id, room_type, is_active")
        .eq("hotel_id", hotel.id)
        .eq("is_active", true);

      const room =
        (rooms || []).find((r: any) => (r.room_type || "").toLowerCase() === roomType.toLowerCase()) ||
        (rooms || [])[0];

      if (!room?.id) {
        toast.error("This hotel has no rooms configured yet", { description: "Please try another hotel." });
        return;
      }

      // Redirect to the full checkout page (Razorpay flow lives there)
      const params = new URLSearchParams({
        room: room.id,
        checkin: format(checkIn, "yyyy-MM-dd"),
        checkout: format(checkOut, "yyyy-MM-dd"),
        adults: numGuests,
        children: "0",
        rooms: numRooms,
        name: guestName.trim(),
        email: guestEmail.trim(),
        phone: guestPhone.trim(),
        type: bookingType,
      });
      if (specialRequests.trim()) params.set("notes", specialRequests.trim());

      onClose();
      navigate(`/hotels/${hotel.id}/checkout?${params.toString()}`);
    } catch (err: any) {
      console.error("Booking error:", err);
      toast.error("Could not start booking", { description: err.message || "Please try again" });
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
            {bookingType === "visit_stay" ? "Book with Site Visit" : "Book Hotel Only"}
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
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !checkIn && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkIn ? format(checkIn, "MMM dd, yyyy") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkIn}
                    onSelect={(d) => {
                      if (!d) return;
                      setCheckIn(d);
                      if (checkOut && checkOut.getTime() <= d.getTime()) {
                        setCheckOut(addDays(d, 1));
                      }
                    }}
                    disabled={(d) => d < new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Check-out</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !checkOut && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkOut ? format(checkOut, "MMM dd, yyyy") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkOut}
                    onSelect={setCheckOut}
                    disabled={(d) => d <= (checkIn || new Date())}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
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
              <Input
                type="email"
                placeholder="email@example.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input placeholder="+91..." value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
            </div>
          </div>

          {/* Room details */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> Guests
                </Label>
                <Select value={numGuests} onValueChange={setNumGuests}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <BedDouble className="h-3 w-3" /> Rooms
                </Label>
                <Select value={numRooms} onValueChange={setNumRooms}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Room Type</Label>
              <Select value={roomType} onValueChange={setRoomType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
            <Textarea
              placeholder="Any special requirements..."
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              rows={2}
            />
          </div>

          <Separator />

          {/* Price Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                ₹{hotel.price_per_night.toLocaleString()} × {nights} night × {numRooms} room
              </span>
              <span className={discountPct > 0 ? "line-through text-muted-foreground" : ""}>
                ₹{originalAmount.toLocaleString()}
              </span>
            </div>
            {discountPct > 0 && (
              <div className="flex justify-between text-sm text-emerald-600 font-medium">
                <span>JaagaX Discount ({discountPct}%)</span>
                <span>-₹{(originalAmount - totalAmount).toLocaleString()}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Payable</span>
              <span className="text-primary">₹{totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <Button className="w-full h-12" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirecting...
              </>
            ) : (
              `Continue to Payment • ₹${totalAmount.toLocaleString()}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HotelBookingModal;
