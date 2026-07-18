import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Hotel, Calendar, Download, X, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useHiddenIds } from "@/hooks/useHiddenIds";

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
}

export default function HotelBookings({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const [form, setForm] = useState({ check_in_date: "", check_out_date: "", guests: 1, room_type: "" });
  const { hide, isHidden } = useHiddenIds("hotel_bookings_seller", userId);

  const load = async () => {
    const sb: any = supabase;
    const { data } = await sb
      .from("hotel_bookings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setBookings((data || []) as Booking[]);
    setLoading(false);
  };

  useEffect(() => {
    if (userId) load();
  }, [userId]);

  const openEdit = (b: Booking) => {
    setEditing(b);
    setForm({
      check_in_date: b.check_in_date?.slice(0, 10) || "",
      check_out_date: b.check_out_date?.slice(0, 10) || "",
      guests: b.guests || 1,
      room_type: b.room_type || "",
    });
  };

  const submitEdit = async () => {
    if (!editing) return;
    const sb: any = supabase;
    const { error } = await sb
      .from("hotel_bookings")
      .update({
        check_in_date: form.check_in_date,
        check_out_date: form.check_out_date,
        guests: form.guests,
        room_type: form.room_type || null,
      })
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Booking updated");
    setEditing(null);
    load();
  };

  const cancel = async () => {
    if (!cancelling) return;
    const sb: any = supabase;
    const { error } = await sb.from("hotel_bookings").update({ booking_status: "cancelled" }).eq("id", cancelling.id);
    if (error) return toast.error(error.message);
    toast.success("Booking cancelled. Refund processed per policy.");
    setCancelling(null);
    load();
  };

  const downloadInvoice = (b: Booking) => {
    const gstRate = 0.12;
    const base = b.total_price / (1 + gstRate);
    const gst = b.total_price - base;
    const html = `
<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${b.id.slice(0, 8)}</title>
<style>body{font-family:-apple-system,Arial,sans-serif;padding:32px;max-width:720px;margin:auto;color:#111}
h1{font-size:22px;margin:0 0 4px}.muted{color:#666;font-size:13px}table{width:100%;border-collapse:collapse;margin:20px 0}
td,th{padding:8px;border-bottom:1px solid #eee;text-align:left}.total{font-weight:700;font-size:18px}</style></head><body>
<h1>JAAGAX — Tax Invoice</h1><p class="muted">Invoice #${b.id.slice(0, 8).toUpperCase()} • ${new Date().toLocaleDateString("en-IN")}</p>
<table><tr><th>Hotel</th><td>${b.hotel_name || "Partner Hotel"} ${b.hotel_city ? " — " + b.hotel_city : ""}</td></tr>
<tr><th>Check-in</th><td>${b.check_in_date}</td></tr><tr><th>Check-out</th><td>${b.check_out_date}</td></tr>
<tr><th>Room type</th><td>${b.room_type || "Standard"}</td></tr><tr><th>Guests</th><td>${b.guests || 1}</td></tr>
<tr><th>Base amount</th><td>₹${base.toFixed(2)}</td></tr><tr><th>GST (12%)</th><td>₹${gst.toFixed(2)}</td></tr>
<tr class="total"><th>Total</th><td>₹${b.total_price.toFixed(2)}</td></tr></table>
<p class="muted">Thank you for booking with JAAGAX.</p></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${b.id.slice(0, 8)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Invoice downloaded");
  };

  const rebook = (b: Booking) => {
    if (b.hotel_id) navigate(`/hotels/${b.hotel_id}`);
    else navigate("/hotels");
  };

  const badgeColor = (s: string) =>
    s === "confirmed"
      ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
      : s === "cancelled"
        ? "bg-rose-500/15 text-rose-600 border-rose-500/30"
        : "bg-amber-500/15 text-amber-600 border-amber-500/30";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Hotel className="h-5 w-5 text-emerald-500" /> My Hotel Bookings
            </CardTitle>
            <CardDescription>Manage your stays and download invoices</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/hotels")}>
            Book a hotel
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : bookings.length === 0 ? (
          <div className="text-center py-8">
            <Hotel className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No hotel bookings yet</p>
          </div>
        ) : (
          bookings.filter((b) => !isHidden(b.id)).map((b) => (
            <div key={b.id} className="p-3 rounded-lg border bg-muted/20 space-y-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-semibold">{b.hotel_name || "Partner Hotel"}</p>
                  <p className="text-xs text-muted-foreground">{b.hotel_city || ""}</p>
                </div>
                <Badge variant="outline" className={badgeColor(b.booking_status)}>
                  {b.booking_status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Check-in</p>
                  <p className="font-medium">{b.check_in_date?.slice(0, 10)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Check-out</p>
                  <p className="font-medium">{b.check_out_date?.slice(0, 10)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Room</p>
                  <p className="font-medium">{b.room_type || "Standard"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium">₹{Number(b.total_price).toLocaleString("en-IN")}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap pt-1">
                {b.booking_status !== "cancelled" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => openEdit(b)}>
                      <Calendar className="h-3 w-3 mr-1" /> Modify
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCancelling(b)}>
                      <X className="h-3 w-3 mr-1" /> Cancel
                    </Button>
                  </>
                )}
                <Button size="sm" variant="outline" onClick={() => downloadInvoice(b)}>
                  <Download className="h-3 w-3 mr-1" /> Invoice
                </Button>
                <Button size="sm" variant="outline" onClick={() => rebook(b)}>
                  <RotateCcw className="h-3 w-3 mr-1" /> Rebook
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  onClick={() => {
                    hide(b.id);
                    toast.success("Removed from your dashboard");
                  }}
                  title="Remove from my dashboard"
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modify booking</DialogTitle>
            <DialogDescription>Update dates, room type or guest count.</DialogDescription>
          </DialogHeader>
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
            </div>
            <div className="grid grid-cols-2 gap-3">
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
                <Input value={form.room_type} onChange={(e) => setForm({ ...form, room_type: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={submitEdit} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelling} onOpenChange={(o) => !o && setCancelling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this booking?</DialogTitle>
            <DialogDescription>
              Refunds follow the hotel's policy. Cancellations 48h+ before check-in are usually fully refundable.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(null)}>
              Keep booking
            </Button>
            <Button variant="destructive" onClick={cancel}>
              Confirm cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
