import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MapPin, Navigation2, Clock, User, Phone, AlertCircle, ArrowLeft, Share2, Car, QrCode, Shield, Navigation as NavIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

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
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ property?: mapboxgl.Marker; agent?: mapboxgl.Marker; vehicle?: mapboxgl.Marker }>({});

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
          const updatedBooking = { ...booking, ...payload.new } as VisitBooking;
          setBooking(updatedBooking);
          updateMapMarkers(updatedBooking);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const initializeMap = () => {
    if (!mapRef.current || !booking?.properties?.lat || !booking?.properties?.lng) {
      console.warn("Map container or property coordinates not available");
      return;
    }

    // Clean up existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Set Mapbox access token
    mapboxgl.accessToken = 'pk.eyJ1IjoibG92YWJsZS1hcHAiLCJhIjoiY20zMGhtd3lkMDdxbTJrc2xtamZ1aWV5biJ9.BO5BcDBK4N0Jqy7yF2ex8A';

    // Initialize map
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [booking.properties.lng, booking.properties.lat],
      zoom: 14
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapInstanceRef.current = map;

    map.on('load', () => {
      updateMapMarkers(booking);
    });
  };

  const updateMapMarkers = (data: VisitBooking) => {
    if (!mapInstanceRef.current || !data.properties?.lat || !data.properties?.lng) return;

    // Remove existing markers
    Object.values(markersRef.current).forEach(marker => marker?.remove());
    markersRef.current = {};

    // Add property marker (destination)
    const propertyMarker = new mapboxgl.Marker({ color: '#10b981' })
      .setLngLat([data.properties.lng, data.properties.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`
        <div class="p-2">
          <strong>${data.properties.title}</strong><br/>
          <span class="text-sm">${data.properties.locality}, ${data.properties.city}</span>
        </div>
      `))
      .addTo(mapInstanceRef.current);
    
    markersRef.current.property = propertyMarker;

    // Add agent marker if location exists
    if (data.agent_location?.lat && data.agent_location?.lng) {
      const agentMarker = new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([data.agent_location.lng, data.agent_location.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div class="p-2">
            <strong>Agent Location</strong><br/>
            <span class="text-sm">Last updated: ${new Date(data.agent_location.updated_at || '').toLocaleTimeString()}</span>
          </div>
        `))
        .addTo(mapInstanceRef.current);
      
      markersRef.current.agent = agentMarker;
    }

    // Add vehicle marker if location exists
    if (data.vehicle_location?.lat && data.vehicle_location?.lng) {
      const vehicleMarker = new mapboxgl.Marker({ color: '#f59e0b' })
        .setLngLat([data.vehicle_location.lng, data.vehicle_location.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div class="p-2">
            <strong>Vehicle Location</strong><br/>
            <span class="text-sm">Last updated: ${new Date(data.vehicle_location.updated_at || '').toLocaleTimeString()}</span>
          </div>
        `))
        .addTo(mapInstanceRef.current);
      
      markersRef.current.vehicle = vehicleMarker;
    }

    // Fit bounds to show all markers
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([data.properties.lng, data.properties.lat]);
    if (data.agent_location?.lng && data.agent_location?.lat) {
      bounds.extend([data.agent_location.lng, data.agent_location.lat]);
    }
    if (data.vehicle_location?.lng && data.vehicle_location?.lat) {
      bounds.extend([data.vehicle_location.lng, data.vehicle_location.lat]);
    }
    
    mapInstanceRef.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
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
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              const trackingUrl = `${window.location.origin}/visit/live/${bookingId}`;
              navigator.clipboard.writeText(trackingUrl);
              toast.success("Tracking link copied to clipboard!");
            }}
          >
            <Share2 className="w-4 w-4 mr-2" />
            Share Link
          </Button>
        </div>

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

            {/* Quick Actions */}
            <Card className="p-4 mb-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(`/visit/story/${bookingId}`)}
                >
                  📸 View Story
                </Button>
                {booking.status === 'completed' && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate(`/visit/summary/${bookingId}`)}
                  >
                    ✨ AI Summary
                  </Button>
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
