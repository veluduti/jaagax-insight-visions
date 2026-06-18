import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download } from "lucide-react";
import type { HotelBooking } from "@/services/hotelService";

interface Props {
  booking: HotelBooking;
}

export default function BookingInvoice({ booking }: Props) {
  const nights = Math.max(
    1,
    Math.round(
      (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / (1000 * 60 * 60 * 24),
    ),
  );
  const subtotal = Number(booking.total_amount) / 1.18;
  const gst = Number(booking.total_amount) - subtotal;

  const handleDownload = () => {
    const html = document.getElementById("invoice-content")?.outerHTML || "";
    const blob = new Blob(
      [`<!doctype html><html><head><title>Invoice ${booking.booking_reference}</title><style>body{font-family:sans-serif;padding:24px;}table{width:100%;border-collapse:collapse;}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left;}</style></head><body>${html}</body></html>`],
      { type: "text/html" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${booking.booking_reference || booking.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card className="border-border shadow-sm">
        <CardContent className="p-6" id="invoice-content">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold">INVOICE</h2>
              <p className="text-sm text-muted-foreground">Ref: {booking.booking_reference}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold">JAAGA X</p>
              <p className="text-muted-foreground">Real Estate Platform</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-semibold mb-2">Hotel</h3>
              <p className="text-sm">{booking.hotel_name}</p>
              <p className="text-xs text-muted-foreground">{booking.hotel_address}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Guest</h3>
              <p className="text-sm">{booking.guest_name}</p>
              <p className="text-xs text-muted-foreground">{booking.guest_email}</p>
              <p className="text-xs text-muted-foreground">{booking.guest_phone}</p>
            </div>
          </div>

          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2">Description</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="py-2">
                  {booking.room_type} × {nights} night{nights > 1 ? "s" : ""} ({booking.check_in} → {booking.check_out})
                </td>
                <td className="text-right">₹{subtotal.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2">GST (18%)</td>
                <td className="text-right">₹{gst.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-3 font-semibold">Total</td>
                <td className="py-3 text-right font-semibold">₹{Number(booking.total_amount).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <p className="text-xs text-muted-foreground">
            Payment status: <span className="font-medium uppercase">{booking.payment_status}</span>
            {booking.payment_method ? ` · via ${booking.payment_method}` : ""}
          </p>
        </CardContent>
      </Card>

      <Button onClick={handleDownload} className="w-full">
        <Download className="h-4 w-4 mr-2" />
        Download Invoice
      </Button>
    </div>
  );
}
