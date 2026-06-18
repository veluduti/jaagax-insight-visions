import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { hotelService, type HotelBooking } from "@/services/hotelService";
import BookingInvoice from "./BookingInvoice";
import { Calendar, MapPin, Users, CreditCard, FileText, RefreshCw, XCircle, Pencil } from "lucide-react";

interface Props {
  booking: HotelBooking;
  onClose: () => void;
  onRefresh: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-green-500/15 text-green-700 dark:text-green-400",
  modified: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-red-500/15 text-red-700 dark:text-red-400",
};

export default function BookingDetail({ booking, onClose, onRefresh }: Props) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"view" | "modify" | "cancel" | "invoice">("view");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    check_in: booking.check_in,
    check_out: booking.check_out,
    num_guests: booking.num_guests ?? 1,
    room_type: booking.room_type ?? "Standard",
    special_requests: booking.special_requests ?? "",
  });
  const [cancelReason, setCancelReason] = useState("");

  const handleModify = async () => {
    setSaving(true);
    try {
      await hotelService.modifyBooking(booking.id, form);
      toast({ title: "Booking modified" });
      onRefresh();
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast({ title: "Reason required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await hotelService.cancelBooking(booking.id, cancelReason);
      toast({ title: "Booking cancelled" });
      onRefresh();
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRebook = async () => {
    setSaving(true);
    try {
      await hotelService.rebookBooking(booking.id);
      toast({ title: "Rebooked successfully" });
      onRefresh();
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>Booking #{booking.booking_reference}</span>
            <Badge className={STATUS_STYLES[booking.status] ?? ""}>{booking.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        {mode === "view" && (
          <div className="space-y-4">
            <Card className="border-border shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">{booking.hotel_name}</p>
                    <p className="text-sm text-muted-foreground">{booking.hotel_address}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{booking.check_in}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{booking.check_out}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {booking.num_guests} guest{(booking.num_guests ?? 0) > 1 ? "s" : ""} · {booking.room_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span>
                      ₹{Number(booking.total_amount).toLocaleString()} ·{" "}
                      <span className="uppercase">{booking.payment_status}</span>
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="text-sm">
                  <p className="font-semibold">Guest</p>
                  <p className="text-muted-foreground">
                    {booking.guest_name} · {booking.guest_email} · {booking.guest_phone}
                  </p>
                </div>
                {booking.special_requests && (
                  <>
                    <Separator />
                    <p className="text-sm"><span className="font-semibold">Notes:</span> {booking.special_requests}</p>
                  </>
                )}
                {booking.cancellation_reason && (
                  <p className="text-sm text-red-600">Cancelled: {booking.cancellation_reason}</p>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              {booking.status !== "cancelled" && booking.status !== "completed" && (
                <>
                  <Button variant="outline" onClick={() => setMode("modify")}>
                    <Pencil className="h-4 w-4 mr-2" />Modify
                  </Button>
                  <Button variant="outline" onClick={() => setMode("cancel")}>
                    <XCircle className="h-4 w-4 mr-2" />Cancel
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => setMode("invoice")}>
                <FileText className="h-4 w-4 mr-2" />Invoice
              </Button>
              {booking.status === "cancelled" && (
                <Button onClick={handleRebook} disabled={saving}>
                  <RefreshCw className="h-4 w-4 mr-2" />Rebook
                </Button>
              )}
            </div>
          </div>
        )}

        {mode === "modify" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Check-in</Label>
                <Input type="date" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} />
              </div>
              <div>
                <Label>Check-out</Label>
                <Input type="date" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} />
              </div>
              <div>
                <Label>Guests</Label>
                <Input type="number" min={1} value={form.num_guests} onChange={(e) => setForm({ ...form, num_guests: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Room type</Label>
                <Input value={form.room_type} onChange={(e) => setForm({ ...form, room_type: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Special requests</Label>
              <Textarea value={form.special_requests} onChange={(e) => setForm({ ...form, special_requests: e.target.value })} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMode("view")}>Back</Button>
              <Button onClick={handleModify} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
            </DialogFooter>
          </div>
        )}

        {mode === "cancel" && (
          <div className="space-y-3">
            <Label>Reason for cancellation</Label>
            <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Why are you cancelling?" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setMode("view")}>Back</Button>
              <Button variant="destructive" onClick={handleCancel} disabled={saving}>{saving ? "Cancelling…" : "Confirm cancel"}</Button>
            </DialogFooter>
          </div>
        )}

        {mode === "invoice" && (
          <div className="space-y-3">
            <BookingInvoice booking={booking} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setMode("view")}>Back</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
