import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, CalendarDays, MapPin, Loader2, Download, Home, Mail } from "lucide-react";

const inr = (n: any) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

const HotelBookingConfirmed = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;
    (async () => {
      const [{ data }, { data: li }] = await Promise.all([
        supabase.from("hotel_bookings").select("*").eq("id", bookingId).maybeSingle(),
        (supabase as any).from("hotel_booking_items").select("*").eq("booking_id", bookingId),
      ]);
      setBooking(data);
      setItems(li || []);
      setLoading(false);
    })();
  }, [bookingId]);


  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>;
  }

  if (!booking) {
    return <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Booking not found</h1>
        <Button className="mt-6" onClick={() => navigate("/hotels")}>Back to hotels</Button>
      </div>
      <Footer />
    </div>;
  }

  const isPaid = booking.payment_status === "paid" && booking.status === "confirmed";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="border-emerald-500/30">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold">
              {isPaid ? "Booking confirmed!" : "Booking received"}
            </h1>
            <p className="text-muted-foreground mt-1">
              A confirmation email has been sent to <b>{booking.guest_email}</b>
            </p>
            <Badge variant="secondary" className="mt-3 text-sm">
              Ref: {booking.booking_reference}
            </Badge>
          </CardContent>
        </Card>

        <Card className="mt-4"><CardContent className="p-6 space-y-4">
          <h2 className="font-semibold text-lg">{booking.hotel_name}</h2>
          {booking.hotel_address && (
            <div className="text-sm text-muted-foreground flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5" /> {booking.hotel_address}
            </div>
          )}
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Cell label="Check-in" value={booking.check_in} icon={<CalendarDays className="w-4 h-4" />} />
            <Cell label="Check-out" value={booking.check_out} icon={<CalendarDays className="w-4 h-4" />} />
            <Cell label="Room type" value={booking.room_type} />
            <Cell label="Rooms" value={String(booking.num_rooms)} />
            <Cell label="Guests" value={String(booking.num_guests)} />
            <Cell label="Guest" value={booking.guest_name} />
          </div>
          <Separator />
          <div className="flex items-center justify-between text-base">
            <span className="text-muted-foreground">Amount paid</span>
            <span className="font-semibold">₹{Number(booking.total_amount).toLocaleString()}</span>
          </div>
          {booking.razorpay_payment_id && (
            <div className="text-xs text-muted-foreground">Payment ID: {booking.razorpay_payment_id}</div>
          )}
        </CardContent></Card>

        <div className="flex flex-wrap gap-3 mt-6 justify-center">
          {booking.guest_portal_token && (
            <Button asChild>
              <Link to={`/stay/${booking.guest_portal_token}`}>
                Open stay portal
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Download className="w-4 h-4 mr-2" /> Print receipt
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard/buyer?tab=bookings"><Mail className="w-4 h-4 mr-2" /> My bookings</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/hotels"><Home className="w-4 h-4 mr-2" /> Explore more hotels</Link>
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

const Cell = ({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) => (
  <div>
    <div className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</div>
    <div className="font-medium">{value}</div>
  </div>
);

export default HotelBookingConfirmed;
