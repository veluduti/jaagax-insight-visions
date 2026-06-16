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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
          <DialogDescription>
            Book a partner hotel on behalf of your client for site visits.
          </DialogDescription>
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
                      {h.name