import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Hotel, Users, Calendar, IndianRupee, Loader2 } from "lucide-react";

interface HotelBookingDialogProps {
  open: boolean;
  agentId?: string;
  userId?: string;
  onClose: () => void;
  onCreated?: () => void;
}

interface HotelOption {
  id: string;
  name: string;
  city?: string | null;
  base_price?: number | null;
}

const ROOM_TYPES = ["Standard", "Deluxe", "Suite", "Family", "Executive", "Presidential"];

export default function HotelBookingDialog({ open, agentId, userId, onClose, onCreated }: HotelBookingDialogProps) {
  const [hotels, setHotels] = useState<HotelOption[]>([]);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    hotel_id: "",
    guest_name: "",
    guest_phone: "",
    check_in_date: "",
    check_out_date: "",
    guests: 1,
    room_type: "Standard",
    nightly_rate: 0,
  });

  useEffect(() => {
    if (!open) return;
    loadHotels();
  }, [open]);

  const loadHotels = async () => {
    setLoadingHotels(true);
    const sb: any = supabase;
    try {
      const { data, error } = await sb
        .from("hotels")
        .select("id, name, city, base_price")
        .order("name", { ascending: true })
        .limit(200);

      if (error) throw error;
      setHotels((data || []) as HotelOption[]);
    } catch (error) {
      console.error("Error loading hotels:", error);
      toast.error("Failed to load hotels");
    } finally {
      setLoadingHotels(false);
    }
  };

  const selectedHotel = hotels.find((h) => h.id === form.hotel_id);

  const nights = (() => {
    if (!form.check_in_date || !form.check_out_date) return 0;
    const a = new Date(form.check_in_date).getTime();
    const b = new Date(form.check_out_date).getTime();
    return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
  })();

  const rate = form.nightly_rate || selectedHotel?.base_price || 0;
  const total = nights * rate;

  const reset = () => {
    setForm({
      hotel_id: "",
      guest_name: "",
      guest_phone: "",
      check_in_date: "",
      check_out_date: "",
      guests: 1,
      room_type: "Standard",
      nightly_rate: 0,
    });
  };

  const submit = async () => {
    if (!form.hotel_id) {
      toast.error("Please select a hotel");
      return;
    }
    if (!form.guest_name.trim()) {
      toast.error("Guest name is required");
      return;
    }
    if (!form.check_in_date) {
      toast.error("Please select check-in date");
      return;
    }
    if (!form.check_out_date) {
      toast.error("Please select check-out date");
      return;
    }
    if (nights <= 0) {
      toast.error("Check-out must be after check-in");
      return;
    }
    if (rate <= 0) {
      toast.error("Please enter a valid nightly rate");
      return;
    }

    setSubmitting(true);
    const sb: any = supabase;

    const payload: any = {
      hotel_id: form.hotel_id,
      hotel_name: selectedHotel?.name || null,
      hotel_city: selectedHotel?.city || null,
      guest_name: form.guest_name.trim(),
      guest_phone: form.guest_phone || null,
      check_in_date: form.check_in_date,
      check_out_date: form.check_out_date,
      guests: form.guests,
      room_type: form.room_type,
      total_price: total,
      booking_status: "confirmed",
      booked_by_agent_id: agentId || null,
      user_id: userId || null,
    };

    try {
      const { error } = await sb.from("hotel_bookings").insert(payload);

      if (error) throw error;

      reset();
      onCreated?.();
      onClose();
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast.error(error.message || "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5 text-primary" />
            New Hotel Booking
          </DialogTitle>
          <DialogDescription>Book a partner hotel on behalf of your client for site visits.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Hotel Selection */}
          <div>
            <Label className="text-xs font-medium">Hotel *</Label>
            <Select value={form.hotel_id} onValueChange={(v) => setForm({ ...form, hotel_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder={loadingHotels ? "Loading hotels..." : "Select a partner hotel"} />
              </SelectTrigger>
              <SelectContent>
                {loadingHotels ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : hotels.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No partner hotels found. Add hotels to the system first.
                  </div>
                ) : (
                  hotels.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name} {h.city ? `— ${h.city}` : ""}
                      {h.base_price ? ` (₹${h.base_price}/night)` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Guest Information */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Guest Name *</Label>
              <Input
                value={form.guest_name}
                onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Guest Phone</Label>
              <Input
                value={form.guest_phone}
                onChange={(e) => setForm({ ...form, guest_phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Check-in Date *</Label>
              <Input
                type="date"
                value={form.check_in_date}
                onChange={(e) => setForm({ ...form, check_in_date: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Check-out Date *</Label>
              <Input
                type="date"
                value={form.check_out_date}
                onChange={(e) => setForm({ ...form, check_out_date: e.target.value })}
                min={form.check_in_date || new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          {/* Room & Guests */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-medium">Guests</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={form.guests}
                onChange={(e) => setForm({ ...form, guests: Number(e.target.value) || 1 })}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-medium">Room Type</Label>
              <Select value={form.room_type} onValueChange={(v) => setForm({ ...form, room_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Nightly Rate */}
          <div>
            <Label className="text-xs font-medium">Nightly Rate (₹)</Label>
            <Input
              type="number"
              min={0}
              step={100}
              value={form.nightly_rate || (selectedHotel?.base_price ?? "")}
              onChange={(e) => setForm({ ...form, nightly_rate: Number(e.target.value) || 0 })}
              placeholder={selectedHotel?.base_price ? `Default: ₹${selectedHotel.base_price}` : "Enter rate"}
            />
          </div>

          {/* Summary */}
          <div className="rounded-lg border bg-primary/5 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {nights} night{nights === 1 ? "" : "s"} × {formatCurrency(rate)}
              </span>
              <span className="font-medium">{formatCurrency(total)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground text-center">
            <p>Booking will be confirmed immediately. Invoice can be downloaded from booking details.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Booking...
              </>
            ) : (
              "Confirm Booking"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
