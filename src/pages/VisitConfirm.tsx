import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle2, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Car,
  Phone,
  Mail,
  Download,
  Share2
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const VisitConfirm = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [agent, setAgent] = useState<any>(null);
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) return;

      const { data: bookingData, error } = await supabase
        .from('visit_bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (error) {
        console.error('Error fetching booking:', error);
        setLoading(false);
        return;
      }

      setBooking(bookingData);

      // Fetch agent details
      if (bookingData.agent_id) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('*')
          .eq('id', bookingData.agent_id)
          .single();
        setAgent(agentData);
      }

      // Fetch vehicle details
      if (bookingData.vehicle_id) {
        const { data: vehicleData } = await supabase
          .from('fleet_vehicles')
          .select('*')
          .eq('id', bookingData.vehicle_id)
          .single();
        setVehicle(vehicleData);
      }

      setLoading(false);
    };

    fetchBooking();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-grow container mx-auto px-4 py-8">
          <Skeleton className="h-96 w-full max-w-2xl mx-auto" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-grow container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Booking not found</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Visit Confirmed!</h1>
            <p className="text-muted-foreground">
              Your property visit has been successfully scheduled
            </p>
          </div>

          {/* Booking Details Card */}
          <Card className="p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold mb-1">Booking Details</h2>
                <p className="text-sm text-muted-foreground">ID: {booking.id.slice(0, 8)}</p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                {booking.status}
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Visit Date</p>
                  <p className="font-medium">
                    {new Date(booking.visit_date).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">{booking.visit_time}</p>
                </div>
              </div>

              {booking.pickup_location && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pickup Location</p>
                    <p className="font-medium">{booking.pickup_location.address}</p>
                  </div>
                </div>
              )}

              {agent && (
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div className="flex items-center gap-3">
                    <img
                      src={agent.photo_url}
                      alt={agent.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-sm text-muted-foreground">Your Agent</p>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.agency_name}</p>
                    </div>
                  </div>
                </div>
              )}

              {vehicle && (
                <div className="flex items-center gap-3">
                  <Car className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Your Vehicle</p>
                    <p className="font-medium">{vehicle.vehicle_model}</p>
                    <p className="text-xs text-muted-foreground">
                      Driver: {vehicle.driver_name} • {vehicle.driver_phone}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* OTP & QR Code Card */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">Verification Details</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Visit OTP</p>
                <p className="text-3xl font-bold tracking-wider">{booking.otp}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Share this OTP with the agent
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">QR Code</p>
                <div className="inline-block p-3 bg-white rounded-lg">
                  <QRCodeSVG value={booking.qr_code} size={120} />
                </div>
              </div>
            </div>
          </Card>

          {/* Contact Info Card */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">Contact Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{booking.user_email}</span>
              </div>
              {booking.user_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{booking.user_phone}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download Details
            </Button>
            <Button variant="outline" className="flex-1">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button 
              className="flex-1"
              onClick={() => navigate('/visit/manage')}
            >
              Manage Visits
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default VisitConfirm;