import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MapPin, Clock, User, Car, QrCode, Shield, Navigation as NavIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface VisitBooking {
  id: string;
  visit_date: string;
  visit_time: string;
  status: string;
  otp_code: string | null;
  qr_code_url: string | null;
  travel_mode: string | null;
  pickup_location: any;
  agent_location: any;
  vehicle_location: any;
  user_name: string;
  properties: {
    title: string;
    locality: string;
    city: string;
    lat: number | null;
    lng: number | null;
  } | null;
  agents: {
    name: string;
  } | null;
}

const LiveVisitTracking = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<VisitBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!bookingId) {
      navigate("/");
      return;
    }
    fetchBooking();
    subscribeToUpdates();
  }, [bookingId]);

  useEffect(() => {
    if (booking?.properties?.lat && booking?.properties?.lng) {
      initializeMap();
    }
  }, [booking]);

  const fetchBooking = async () => {
    try {
      const { data, error } = await supabase
        .from("visit_bookings")
        .select(`
          *,
          properties (title, locality, city, lat, lng),
          agents (name)
        `)
        .eq("id", bookingId)
        .single();

      if (error) throw error;
      setBooking(data);
    } catch (error: any) {
      console.error("Error fetching booking:", error);
      toast.error("Failed to load visit details");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel('visit-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'visit_bookings',
          filter: `id=eq.${bookingId}`
        },
        (payload) => {
          console.log('Visit updated:', payload);
          setBooking(prev => ({ ...prev, ...payload.new } as VisitBooking));
          updateMapMarkers(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const initializeMap = () => {
    if (!mapRef.current || !booking?.properties) return;

    const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
    
    if (!googleMapsApiKey) {
      console.warn("Google Maps API key not configured");
      return;
    }

    // Load Google Maps script if not already loaded
    if (!(window as any).google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}`;
      script.async = true;
      script.onload = () => renderMap();
      document.head.appendChild(script);
    } else {
      renderMap();
    }
  };

  const renderMap = () => {
    if (!booking?.properties?.lat || !booking?.properties?.lng) return;

    const google = (window as any).google;
    const map = new google.maps.Map(mapRef.current, {
      center: { lat: booking.properties.lat, lng: booking.properties.lng },
      zoom: 14,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] }
      ]
    });

    googleMapRef.current = map;

    // Add property marker
    const propertyMarker = new google.maps.Marker({
      position: { lat: booking.properties.lat, lng: booking.properties.lng },
      map,
      title: booking.properties.title,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#10b981",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2
      }
    });

    markersRef.current.push(propertyMarker);
    updateMapMarkers(booking);
  };

  const updateMapMarkers = (data: any) => {
    if (!googleMapRef.current) return;

    const google = (window as any).google;

    // Clear old agent/vehicle markers (keep property marker)
    markersRef.current.slice(1).forEach(marker => marker.setMap(null));
    markersRef.current = [markersRef.current[0]];

    // Add agent marker if location exists
    if (data.agent_location?.lat && data.agent_location?.lng) {
      const agentMarker = new google.maps.Marker({
        position: { lat: data.agent_location.lat, lng: data.agent_location.lng },
        map: googleMapRef.current,
        title: "Agent Location",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2
        }
      });
      markersRef.current.push(agentMarker);
    }

    // Add vehicle marker if location exists
    if (data.vehicle_location?.lat && data.vehicle_location?.lng) {
      const vehicleMarker = new google.maps.Marker({
        position: { lat: data.vehicle_location.lat, lng: data.vehicle_location.lng },
        map: googleMapRef.current,
        title: "Vehicle Location",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#f59e0b",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2
        }
      });
      markersRef.current.push(vehicleMarker);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "builder_pending": return "secondary";
      case "confirmed": return "default";
      case "in_progress": return "default";
      case "completed": return "default";
      case "cancelled": return "destructive";
      case "builder_rejected": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "builder_pending": return "Pending Approval";
      case "confirmed": return "Confirmed";
      case "in_progress": return "Visit In Progress";
      case "completed": return "Completed";
      case "cancelled": return "Cancelled";
      case "builder_rejected": return "Declined";
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading visit details...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Visit not found</p>
            <Button onClick={() => navigate("/")} className="mt-4">Go Home</Button>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Visit Details */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-1">{booking.properties?.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {booking.properties?.locality}, {booking.properties?.city}
                  </p>
                </div>
                <Badge variant={getStatusColor(booking.status)}>
                  {getStatusText(booking.status)}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>
                    {new Date(booking.visit_date).toLocaleDateString("en-IN")} at {booking.visit_time}
                  </span>
                </div>
                {booking.agents && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-primary" />
                    <span>{booking.agents.name}</span>
                  </div>
                )}
                {booking.travel_mode && (
                  <div className="flex items-center gap-2 text-sm">
                    <Car className="w-4 h-4 text-primary" />
                    <span className="capitalize">{booking.travel_mode}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* QR Code and OTP */}
            {booking.otp_code && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Verification Details
                </h3>
                
                <div className="text-center mb-4">
                  <div className="inline-block p-4 bg-white rounded-lg">
                    {booking.qr_code_url ? (
                      <img 
                        src={booking.qr_code_url} 
                        alt="Visit QR Code" 
                        className="w-48 h-48"
                      />
                    ) : (
                      <QRCodeSVG 
                        value={JSON.stringify({ bookingId: booking.id, otp: booking.otp_code })}
                        size={192}
                      />
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Your OTP Code:</p>
                  <div className="text-3xl font-bold tracking-wider text-primary">
                    {booking.otp_code}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Show this at the property gate
                  </p>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-2">
            <Card className="p-6 h-[600px] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <NavIcon className="w-5 h-5 text-primary" />
                  Live Tracking
                </h3>
                <div className="flex gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    <span>Property</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>Agent</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span>Vehicle</span>
                  </div>
                </div>
              </div>

              <div ref={mapRef} className="flex-1 rounded-lg bg-muted" />

              {!booking.agent_location && (
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Live tracking will appear once your agent starts the journey
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default LiveVisitTracking;
