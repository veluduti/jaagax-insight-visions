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
import { Hotel } from "lucide-react";

interface Props {
  open: boolean;
  agentId: string;
  onClose: () => void;
  onCreated?: () => void;
}

interface HotelOption {
  id: string;
  name: string;
  city?: string | null;
  base_price?: number | null;
}

export default function HotelBookingDialog({ open, agentId, onClose, onCreated }: Props) {
  const [hotels, setHotels] = useState<HotelOption[]>([]);
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
    const load = async () => {
      const sb: any = supabase;
      const { data } = await sb
        .from("hotels")
        .select("id, name, city, base_price")
        .order("name", { ascending: true })
        .limit(200);
      setHotels((data || []) as HotelOption[]);
    };
    load();
  }, [open]);

  const selectedHotel = hotels.find((h) => h.id === form.hotel_id);

  const nights = (() => {
    if (!form.check_in_date || !form.check_out_date) return 0;
    const a = new Date(form.check_in_date).getTime();
    const b = new Date(form.check_out_date).getTime();
    return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
  })();

  const rate = form.nightly_rate || selectedHotel?.base_price || 0;
  const total = nights * rate;

  const reset = () =>
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

  const submit = async () => {
    if (!form.hotel_id) return toast.error("Select a hotel");
    if (!form.guest_name.trim()) return toast.error("Guest name required");
    if (!form.check_in_date || !form.check_out_date) return toast.error("Select dates");
    if (nights <= 0) return toast.error("Check-out must be after check-in");

    setSubmitting(true);
    const sb: any = supabase;
    const payload: any = {
      hotel_id: form.hotel_id,
      hotel_name: selectedHotel?.name || null,
      hotel_city: selectedHotel?.city || null,
      guest_name: form.guest_name,
      guest_phone: form.guest_phone || null,
      check_in_date: form.check_in_date,
      check_out_date: form.check_out_date,
      guests: form.guests,
      room_type: form.room_type,
      total_price: total,
      booking_status: "confirmed",
      booked_by_agent_id: agentId,
    };
    const { error } = await sb.from("hotel_bookings").insert(payload);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    reset();
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5 text-primary" /> New hotel booking
          </DialogTitle>
          <DialogDescription>Book a partner hotel on behalf of your client.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Hotel</Label>
            <Select value={form.hotel_id} onValueChange={(v) => setForm({ ...form, hotel_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a partner hotel" />
              </SelectTrigger>
              <SelectContent>
                {hotels.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name} {h.city ? `— ${h.city}` : ""}
                  </SelectItem>
                ))}
                {hotels.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No partner hotels found
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Guest name</Label>
              <Input
                value={form.guest_name}
                onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Guest phone</Label>
              <Input
                value={form.guest_phone}
                onChange={(e) => setForm({ ...form, guest_phone: e.target.value })}
                placeholder="+91…"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Check-in</Label>
              <Input
                type="date"
                value={form.check_in_date}
                onChange={(e) => setForm({ ...form, check_in_date: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Check-out</Label>
              <Input
                type="date"
                value={form.check_out_date}
                onChange={(e) => setForm({ ...form, check_out_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Guests</Label>
              <Input
                type="number"
                min={1}
                value={form.guests}
                onChange={(e) => setForm({ ...form, guests: Number(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label className="text-xs">Room type</Label>
              <Select
                value={form.room_type}
                onValueChange={(v) => setForm({ ...form, room_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Deluxe">Deluxe</SelectItem>
                  <SelectItem value="Suite">Suite</SelectItem>
                  <SelectItem value="Family">Family</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Nightly ₹</Label>
              <Input
                type="number"
                min={0}
                value={form.nightly_rate || (selectedHotel?.base_price ?? 0)}
                onChange={(e) =>
                  setForm({ ...form, nightly_rate: Number(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {nights} night{nights === 1 ? "" : "s"} × ₹{rate.toLocaleString("en-IN")}
            </span>
            <span className="font-semibold text-base">
              Total ₹{total.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Booking…" : "Confirm booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
