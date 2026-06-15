import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Download, X, RotateCcw, User, Phone, MapPin } from "lucide-react";

interface Booking {
  id: string;
  hotel_name?: string | null;
  hotel_city?: string | null;
  check_in_date: string;
  check_out_date: string;
  room_type?: string | null;
  guests?: number | null;
  total_price: number;
  booking_status: string;
  hotel_id?: string | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  created_at?: string;
}

interface Props {
  booking: Booking | null;
  onClose: () => void;
  onChanged?: () => void;
}

export default function HotelBookingDetails({ booking, onClose, onChanged }: Props) {
  const [mode, setMode] = useState<"view" | "edit" | "cancel">("view");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    check_in_date: "",
    check_out_date: "",
    guests: 1,
    room_type: "",
  });

  useEffect(() => {
    if (booking) {
      setMode("view");
      setForm({
        check_in_date: booking.check_in_date?.slice(0, 10) || "",
        check_out_date: booking.check_out_date?.slice(0, 10) || "",
        guests: booking.guests || 1,
        room_type: booking.room_type || "",
      });
    }
  }, [booking]);

  if (!booking) return null;

  const submitEdit = async () => {
    setSaving(true);
    const sb: any = supabase;
    const { error } = await sb
      .from("hotel_bookings")
      .update({
        check_in_date: form.check_in_date,
        check_out_date: form.check_out_date,
        guests: form.guests,
        room_type: form.room_type || null,
      })
      .eq("id", booking.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Booking updated");
    onChanged?.();
  };

  const cancel = async () => {
    setSaving(true);
    const sb: any = supabase;
    const { error } = await sb
      .from("hotel_bookings")
      .update({ booking_status: "cancelled" })
      .eq("id", booking.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Booking cancelled");
    onChanged?.();
  };

  const downloadInvoice = () => {
    const b = booking;
    const gstRate = 0.12;
    const base = b.total_price / (1 + gstRate);
    const gst = b.total_price - base;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${b.id.slice(0, 8)}</title>
<style>body{font-family:-apple-system,Arial,sans-serif;padding:32px;max-width:720px;margin:auto;color:#111}
h1{font-size:22px;margin:0 0 4px}.muted{color:#666;font-size:13px}table{width:100%;border-collapse:collapse;margin:20px 0}
td,th{padding:8px;border-bottom:1px solid #eee;text-align:left}.total{font-weight:700;font-size:18px}</style></head><body>
<h1>JAAGAX — Tax Invoice</h1><p class="muted">Invoice #${b.id.slice(0, 8).toUpperCase()} • ${new Date().toLocaleDateString("en-IN")}</p>
<table><tr><th>Guest</th><td>${b.guest_name || "Guest"}</td></tr>
<tr><th>Hotel</th><td>${b.hotel_name || "Partner Hotel"}${b.hotel_city ? " — " + b.hotel_city : ""}</td></tr>
<tr><th>Check-in</th><td>${b.check_in_date}</td></tr><tr><th>Check-out</th><td>${b.check_out_date}</td></tr>
<tr><th>Room</th><td>${b.room_type || "Standard"}</td></tr><tr><th>Guests</th><td>${b.guests || 1}</td></tr>
<tr><th>Base</th><td>₹${base.toFixed(2)}</td></tr><tr><th>GST (12%)</th><td>₹${gst.toFixed(2)}</td></tr>
<tr class="total"><th>Total</th><td>₹${b.total_price.toFixed(2)}</td></tr></table></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${b.id.slice(0, 8)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Invoice downloaded");
  };

  const badgeColor = (s: string) =>
    s === "confirmed"
      ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
      : s === "cancelled"
        ? "bg-rose-500/15 text-rose-600 border-rose-500/30"
        : "bg-amber-500/15 text-amber-600 border-amber-500/30";

  return (
    <Dialog open={!!booking} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>{booking.hotel_name || "Partner Hotel"}</span>
            <Badge variant="outline" className={badgeColor(booking.booking_status)}>
              {booking.booking_status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Booking #{booking.id.slice(0, 8).toUpperCase()}
          </DialogDescription>
        </DialogHeader>

        {mode === "view" && (
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{booking.guest_name || "Guest"}</span>
              </div>
              {booking.guest_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.guest_phone}</span>
                </div>
              )}
              {booking.hotel_city && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.hotel_city}</span>
                </div>
              )}
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Check-in</p>
                <p className="font-medium">{booking.check_in_date?.slice(0, 10)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Check-out</p>
                <p className="font-medium">{booking.check_out_date?.slice(0, 10)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Room type</p>
                <p className="font-medium">{booking.room_type || "Standard"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Guests</p>
                <p className="font-medium">{booking.guests || 1}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total paid</span>
              <span className="text-lg font-semibold">
                ₹{Number(booking.total_price || 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        )}

        {mode === "edit" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs">Check-in</label>
                <Input
                  type="date"
                  value={form.check_in_date}
                  onChange={(e) => setForm({ ...form, check_in_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs">Check-out</label>
                <Input
                  type="date"
                  value={form.check_out_date}
                  onChange={(e) => setForm({ ...form, check_out_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs">Guests</label>
                <Input
                  type="number"
                  min={1}
                  value={form.guests}
                  onChange={(e) => setForm({ ...form, guests: Number(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="text-xs">Room type</label>
                <Input
                  value={form.room_type}
                  onChange={(e) => setForm({ ...form, room_type: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {mode === "cancel" && (
          <p className="text-sm text-muted-foreground">
            Cancel this booking? Refunds follow the hotel's policy. Cancellations 48h+ before
            check-in are usually fully refundable.
          </p>
        )}

        <DialogFooter className="flex-wrap gap-2">
          {mode === "view" && (
            <>
              <Button variant="outline" onClick={downloadInvoice}>
                <Download className="h-4 w-4 mr-1" /> Invoice
              </Button>
              {booking.booking_status !== "cancelled" && (
                <>
                  <Button variant="outline" onClick={() => setMode("edit")}>
                    <Calendar className="h-4 w-4 mr-1" /> Modify
                  </Button>
                  <Button variant="destructive" onClick={() => setMode("cancel")}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                </>
              )}
              {booking.booking_status === "cancelled" && (
                <Button onClick={onClose}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Close
                </Button>
              )}
            </>
          )}
          {mode === "edit" && (
            <>
              <Button variant="outline" onClick={() => setMode("view")} disabled={saving}>
                Back
              </Button>
              <Button onClick={submitEdit} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </>
          )}
          {mode === "cancel" && (
            <>
              <Button variant="outline" onClick={() => setMode("view")} disabled={saving}>
                Keep booking
              </Button>
              <Button variant="destructive" onClick={cancel} disabled={saving}>
                {saving ? "Cancelling…" : "Confirm cancel"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
