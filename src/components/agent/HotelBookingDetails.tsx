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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { nextDayISO, CHECKOUT_AFTER_CHECKIN_MSG, isValidDateRangeISO } from "@/lib/dateRange";
import { Calendar, Download, X, RotateCcw, User, Phone, MapPin, IndianRupee, Clock, AlertTriangle, Hotel, CreditCard, Lock } from "lucide-react";

declare global { interface Window { Razorpay?: any } }
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

const razorpayCheckoutConfig = {
  method: {
    upi: true,
    card: true,
    netbanking: true,
    wallet: true,
    emi: true,
    paylater: true,
  },
  config: {
    display: {
      blocks: {
        allMethods: {
          name: "All payment options",
          instruments: [
            { method: "card" },
            { method: "netbanking" },
            { method: "wallet" },
            { method: "emi" },
            { method: "paylater" },
            { method: "upi" },
          ],
        },
      },
      sequence: ["block.allMethods"],
      preferences: { show_default_blocks: true },
    },
  },
};

interface Booking {
  id: string;
  hotel_name?: string | null;
  hotel_address?: string | null;
  check_in: string;
  check_out: string;
  room_type?: string | null;
  num_guests?: number | null;
  total_amount: number;
  status: string;
  payment_status?: string | null;
  hotel_id?: string | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  guest_email?: string | null;
  created_at?: string;
}

interface HotelBookingDetailsProps {
  booking: Booking | null;
  onClose: () => void;
  onChanged?: () => void;
}

export default function HotelBookingDetails({ booking, onClose, onChanged }: HotelBookingDetailsProps) {
  const [mode, setMode] = useState<"view" | "edit" | "cancel">("view");
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [form, setForm] = useState({
    check_in: "",
    check_out: "",
    num_guests: 1,
    room_type: "",
  });

  useEffect(() => {
    if (booking) {
      setMode("view");
      setForm({
        check_in: booking.check_in?.slice(0, 10) || "",
        check_out: booking.check_out?.slice(0, 10) || "",
        num_guests: booking.num_guests || 1,
        room_type: booking.room_type || "",
      });
    }
  }, [booking]);

  if (!booking) return null;

  const submitEdit = async () => {
    if (!form.check_in || !form.check_out) {
      toast.error("Please select check-in and check-out dates");
      return;
    }

    const checkIn = new Date(form.check_in);
    const checkOut = new Date(form.check_out);
    if (checkIn >= checkOut) {
      toast.error("Check-out date must be after check-in date");
      return;
    }

    setSaving(true);
    const sb: any = supabase;
    const { error } = await sb
      .from("hotel_bookings")
      .update({
        check_in: form.check_in,
        check_out: form.check_out,
        num_guests: form.num_guests,
        room_type: form.room_type || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id);
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Booking updated successfully");
    setMode("view");
    onChanged?.();
  };

  const cancelBooking = async () => {
    setSaving(true);
    const sb: any = supabase;
    const { error } = await sb
      .from("hotel_bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", booking.id);
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Booking cancelled");
    setMode("view");
    onChanged?.();
  };
  const payNow = async () => {
    setPaying(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) { toast.error("Failed to load payment gateway"); return; }

      const { data, error } = await supabase.functions.invoke("razorpay-pay-existing", {
        body: { booking_id: booking.id },
      });
      if (error || !data?.order_id) {
        toast.error(data?.error || error?.message || "Could not start payment");
        return;
      }

      const rzp = new (window as any).Razorpay({
        ...razorpayCheckoutConfig,
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: booking.hotel_name || "JAAGA X",
        description: `Booking ${data.booking_reference || booking.id.slice(0, 8)}`,
        order_id: data.order_id,
        prefill: {
          name: booking.guest_name || "",
          email: (booking as any).guest_email || "",
          contact: booking.guest_phone || "",
        },
        theme: { color: "#10b981" },
        handler: async (response: any) => {
          const { data: verify, error: vErr } = await supabase.functions.invoke("razorpay-verify-payment", {
            body: {
              booking_id: data.booking_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            },
          });
          if (vErr || !verify?.success) {
            toast.error(verify?.error || vErr?.message || "Payment verification failed");
            return;
          }
          toast.success("Payment successful");
          onChanged?.();
        },
        modal: { ondismiss: () => toast.info("Payment cancelled") },
      });
      rzp.on("payment.failed", (resp: any) => {
        toast.error(resp?.error?.description || "Payment failed");
      });
      rzp.open();
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    } finally {
      setPaying(false);
    }
  };


  const downloadInvoice = () => {
    const b = booking;
    const gstRate = 0.12;
    const base = b.total_amount / (1 + gstRate);
    const gst = b.total_amount - base;

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${b.id.slice(0, 8)}</title>
  <style>
    body { font-family: -apple-system, Arial, sans-serif; padding: 40px; max-width: 720px; margin: auto; color: #111; }
    .header { border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 25px; }
    .title { font-size: 28px; font-weight: bold; color: #2563eb; }
    .subtitle { color: #666; font-size: 14px; }
    .ref { font-size: 13px; color: #666; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    td, th { padding: 10px 8px; border-bottom: 1px solid #eee; text-align: left; }
    .total { font-weight: 700; font-size: 20px; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #ddd; padding-top: 15px; }
    .status-badge { display: inline-block; padding: 3px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .status-confirmed { background: #dcfce7; color: #166534; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }
    .status-pending { background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">JAAGA HOTEL INVOICE</div>
    <div class="ref">Booking Reference: #${b.id.slice(0, 8).toUpperCase()}</div>
    <div class="subtitle">Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
  </div>
  
  <div style="margin-bottom: 20px;">
    <span class="status-badge status-${b.status}">${b.status.toUpperCase()}</span>
  </div>
  
  <table>
    <tr><th style="width:120px;">Guest</th><td>${b.guest_name || "Guest"}</td></tr>
    ${b.guest_phone ? `<tr><th>Phone</th><td>${b.guest_phone}</td></tr>` : ""}
    <tr><th>Hotel</th><td>${b.hotel_name || "Partner Hotel"}${b.hotel_address ? " — " + b.hotel_address : ""}</td></tr>
    <tr><th>Room Type</th><td>${b.room_type || "Standard"}</td></tr>
    <tr><th>Guests</th><td>${b.num_guests || 1}</td></tr>
    <tr><th>Check-in</th><td>${b.check_in}</td></tr>
    <tr><th>Check-out</th><td>${b.check_out}</td></tr>
    <tr><th>Nights</th><td>${Math.ceil((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / (1000 * 60 * 60 * 24))}</td></tr>
  </table>
  
  <div style="border-top: 2px solid #ddd; padding-top: 15px; margin-top: 10px;">
    <table>
      <tr><th style="width:70%;">Description</th><th style="text-align:right;">Amount</th></tr>
      <tr><td>Room Charges (${b.room_type || "Standard"})</td><td style="text-align:right;">₹${base.toFixed(2)}</td></tr>
      <tr><td>GST (12%)</td><td style="text-align:right;">₹${gst.toFixed(2)}</td></tr>
      <tr class="total"><td><strong>Total</strong></td><td style="text-align:right;"><strong>₹${b.total_amount.toFixed(2)}</strong></td></tr>
    </table>
  </div>
  
  <div class="footer">
    This is a system generated invoice. For any queries, contact support@jaaga.com
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${b.id.slice(0, 8)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Invoice downloaded");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-emerald-500 text-white">Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500 text-white">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const calculateNights = () => {
    const checkIn = new Date(booking.check_in);
    const checkOut = new Date(booking.check_out);
    return Math.ceil(Math.abs(checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <Dialog open={!!booking} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Hotel className="h-5 w-5 text-primary" />
              {booking.hotel_name || "Partner Hotel"}
            </span>
            {getStatusBadge(booking.status)}
          </DialogTitle>
          <DialogDescription>Booking #{booking.id.slice(0, 8).toUpperCase()}</DialogDescription>
        </DialogHeader>

        {mode === "view" && (
          <div className="space-y-4">
            {/* Guest Info */}
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{booking.guest_name || "Guest"}</span>
                </div>
                {booking.guest_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{booking.guest_phone}</span>
                  </div>
                )}
                {booking.hotel_address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{booking.hotel_address}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Stay Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Check-in
                </p>
                <p className="font-medium">{booking.check_in?.slice(0, 10)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Check-out
                </p>
                <p className="font-medium">{booking.check_out?.slice(0, 10)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Room type</p>
                <p className="font-medium">{booking.room_type || "Standard"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Guests</p>
                <p className="font-medium">{booking.num_guests || 1}</p>
              </div>
            </div>

            <Separator />

            {/* Payment */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Amount</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(booking.total_amount)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  {calculateNights()} night{calculateNights() !== 1 ? "s" : ""} stay
                </p>
                {booking.payment_status === "paid" ? (
                  <Badge className="bg-emerald-500 text-white text-[10px]">Paid</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Payment {booking.payment_status || "pending"}</Badge>
                )}
              </div>
            </div>

            {/* Pay Now for unpaid bookings */}
            {booking.status !== "cancelled" && booking.payment_status !== "paid" && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Complete payment to confirm this stay
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Secure payment via Razorpay · UPI, Cards, Netbanking
                </p>
                <Button className="w-full" onClick={payNow} disabled={paying}>
                  {paying ? "Opening Razorpay…" : `Pay ${formatCurrency(booking.total_amount)}`}
                </Button>
              </div>
            )}

            {/* Booking Date */}
            {booking.created_at && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Booked on:{" "}
                {new Date(booking.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}
          </div>
        )}

        {mode === "edit" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Check-in</Label>
                <Input
                  type="date"
                  value={form.check_in}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f: any) => ({
                      ...f,
                      check_in: v,
                      check_out: f.check_out && new Date(f.check_out) <= new Date(v) ? nextDayISO(v) : f.check_out,
                    }));
                  }}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <Label className="text-xs">Check-out</Label>
                <Input
                  type="date"
                  value={form.check_out}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v && form.check_in && !isValidDateRangeISO(form.check_in, v)) {
                      toast.error(CHECKOUT_AFTER_CHECKIN_MSG);
                      return;
                    }
                    setForm({ ...form, check_out: v });
                  }}
                  min={nextDayISO(form.check_in) || new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                />
              </div>
              <div>
                <Label className="text-xs">Guests</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.num_guests}
                  onChange={(e) => setForm({ ...form, num_guests: Number(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label className="text-xs">Room type</Label>
                <Input
                  value={form.room_type}
                  onChange={(e) => setForm({ ...form, room_type: e.target.value })}
                  placeholder="Standard, Deluxe, Suite..."
                />
              </div>
            </div>
            <Alert>
              <AlertDescription className="text-xs">
                Modifying dates may change the total price based on hotel availability.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {mode === "cancel" && (
          <div className="space-y-3">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Cancelling this booking may incur charges based on the hotel's cancellation policy. This action cannot
                be undone.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">Are you sure you want to cancel this booking?</p>
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          {mode === "view" && (
            <>
              <Button variant="outline" size="sm" onClick={downloadInvoice}>
                <Download className="h-4 w-4 mr-1" /> Invoice
              </Button>
              {booking.status !== "cancelled" && booking.status !== "completed" && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setMode("edit")}>
                    <Calendar className="h-4 w-4 mr-1" /> Modify
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setMode("cancel")}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </>
          )}
          {mode === "edit" && (
            <>
              <Button variant="outline" onClick={() => setMode("view")} disabled={saving}>
                Back
              </Button>
              <Button onClick={submitEdit} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </>
          )}
          {mode === "cancel" && (
            <>
              <Button variant="outline" onClick={() => setMode("view")} disabled={saving}>
                Keep Booking
              </Button>
              <Button variant="destructive" onClick={cancelBooking} disabled={saving}>
                {saving ? "Cancelling…" : "Confirm Cancel"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
