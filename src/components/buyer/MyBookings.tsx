import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Hotel, CalendarDays, Users, Clock, MapPin, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Booking {
  id: string;
  hotel_id: string;
  check_in: string;
  check_out: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  num_guests: number;
  num_rooms: number;
  room_type: string;
  total_amount: number;
  status: string;
  booking_type: string;
  special_requests: string | null;
  created_at: string;
  hotel?: { name: string; city: string; locality: string };
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "outline" },
  confirmed: { label: "Confirmed", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  completed: { label: "Completed", variant: "secondary" },
};

const MyBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: rows, error } = await supabase
      .from("hotel_bookings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Bookings fetch error:", error);
      setLoading(false);
      return;
    }

    if (rows && rows.length > 0) {
      const hotelIds = [...new Set(rows.map((b: any) => b.hotel_id).filter(Boolean))];
      const { data: hotels } = await supabase
        .from("partner_hotels")
        .select("id, name, city, locality")
        .in("id", hotelIds);

      const hotelMap = new Map((hotels || []).map((h: any) => [h.id, h]));
      setBookings(
        rows.map((b: any) => ({ ...b, hotel: hotelMap.get(b.hotel_id) }))
      );
    } else {
      setBookings([]);
    }
    setLoading(false);
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(price);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5 text-primary" />
            My Hotel Bookings
          </CardTitle>
          <CardDescription>Track your hotel stays and visit packages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Hotel className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No bookings yet</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-4">
              Browse our partner hotels and book your stay for property visits.
            </p>
            <Button onClick={() => navigate("/hotels")}>Browse Hotels</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hotel className="h-5 w-5 text-primary" />
          My Hotel Bookings
        </CardTitle>
        <CardDescription>{bookings.length} booking{bookings.length !== 1 ? "s" : ""}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {bookings.map((booking) => {
          const status = statusConfig[booking.status] || statusConfig.pending;
          return (
            <Card key={booking.id} className="overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="flex-1 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-lg">{booking.hotel?.name || "Hotel"}</h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {booking.hotel?.locality}, {booking.hotel?.city}
                      </p>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      <div>
                        <p className="text-xs">Check-in</p>
                        <p className="font-medium text-foreground">{format(new Date(booking.check_in), "dd MMM yyyy")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      <div>
                        <p className="text-xs">Check-out</p>
                        <p className="font-medium text-foreground">{format(new Date(booking.check_out), "dd MMM yyyy")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <div>
                        <p className="text-xs">Guests / Rooms</p>
                        <p className="font-medium text-foreground">{booking.num_guests} / {booking.num_rooms}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <div>
                        <p className="text-xs">Room Type</p>
                        <p className="font-medium text-foreground">{booking.room_type}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <Badge variant="outline" className="mr-2">
                        {booking.booking_type === "site_visit" ? "Site Visit Package" : "Hotel Only"}
                      </Badge>
                      {booking.special_requests && (
                        <span className="text-xs text-muted-foreground">Has special requests</span>
                      )}
                    </div>
                    <p className="text-lg font-bold text-primary">{formatPrice(booking.total_amount)}</p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default MyBookings;
