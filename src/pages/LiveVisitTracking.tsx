import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MapPin, Navigation2, Clock, User, Phone, AlertCircle, ArrowLeft, Share2, Car, QrCode, Shield, Navigation as NavIcon, Star } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface VisitBooking {
  id: string;
  visit_date: string;
  visit_time: string;
  status: string | null;
  otp_code: string | null;
  agent_location: any;
  vehicle_location: any;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  notes: string | null;
  properties: {
    title: string;
    locality: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  agents: {
    name: string | null;
  } | null;
}

import { VisitFeedbackModal } from "@/components/visit/VisitFeedbackModal";

const LiveVisitTracking = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<VisitBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const mobileMapRef = useRef<HTMLDivElement>(null);
  const desktopMapRef = useRef<HTMLDivElement>(null);
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
    if (booking?.properties?.latitude && booking?.properties?.longitude) {
      initializeMap();
    }
    
    // Handle window resize to reinitialize map for correct container
    const handleResize = () => {
      if (booking?.properties?.latitude && booking?.properties?.longitude) {
        initializeMap();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [booking]);

  const fetchBooking = async () => {
    try {
      const { data, error } = await supabase
        .from("visit_bookings")
        .select(`
          *,
          properties (title, locality, city, latitude, longitude),
          agents (name)
        `)
        .eq("id", bookingId)
        .single();

      if (error) throw error;
      setBooking(data as VisitBooking);
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
    // Determine which container to use based on viewport
    const isMobile = window.innerWidth < 1024;
    const container = isMobile ? mobileMapRef.current : desktopMapRef.current;
    
    if (!container || !booking?.properties?.latitude || !booking?.properties?.longitude) {
      console.warn("Map container or property coordinates not available");
      return;
    }

    // Clean up existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Set Mapbox access token from environment variable
    const mapboxToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    
    if (!mapboxToken) {
      console.error("Mapbox token not found in environment variables");
      toast.error("Map configuration error");
      return;
    }
    
    mapboxgl.accessToken = mapboxToken;

    // Initialize map
    const map = new mapboxgl.Map({
      container: container,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [booking.properties.longitude, booking.properties.latitude],
      zoom: 14
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapInstanceRef.current = map;

    map.on('load', () => {
      updateMapMarkers(booking);
    });
  };

  const updateMapMarkers = (data: VisitBooking) => {
    if (!mapInstanceRef.current || !data.properties?.latitude || !data.properties?.longitude) return;

    // Remove existing markers
    Object.values(markersRef.current).forEach(marker => marker?.remove());
    markersRef.current = {};

    // Add property marker (destination)
    const propertyMarker = new mapboxgl.Marker({ color: '#10b981' })
      .setLngLat([data.properties.longitude, data.properties.latitude])
      .setPopup(new mapboxgl.Popup().setHTML(`
        <div class="p-2">
          <strong>${data.properties.title}</strong><br/>
          <span class="text-sm">${data.properties.locality}, ${data.properties.city}</span>
        </div>
      `))
      .addTo(mapInstanceRef.current);
    markersRef.current.property = propertyMarker;

    // Add agent marker if location available
    if (data.agent_location?.lat && data.agent_location?.lng) {
      const agentMarker = new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([data.agent_location.lng, data.agent_location.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div class="p-2">
            <strong>Agent</strong><br/>
            <span class="text-sm">${data.agents?.name || 'En route'}</span>
          </div>
        `))
        .addTo(mapInstanceRef.current);
      markersRef.current.agent = agentMarker;
    }

    // Add vehicle marker if location available
    if (data.vehicle_location?.lat && data.vehicle_location?.lng) {
      const vehicleMarker = new mapboxgl.Marker({ color: '#f59e0b' })
        .setLngLat([data.vehicle_location.lng, data.vehicle_location.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div class="p-2">
            <strong>Vehicle</strong><br/>
            <span class="text-sm">Transport</span>
          </div>
        `))
        .addTo(mapInstanceRef.current);
      markersRef.current.vehicle = vehicleMarker;
    }

    // Fit map to show all markers
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([data.properties.longitude, data.properties.latitude]);
    if (data.agent_location?.lat && data.agent_location?.lng) {
      bounds.extend([data.agent_location.lng, data.agent_location.lat]);
    }
    if (data.vehicle_location?.lat && data.vehicle_location?.lng) {
      bounds.extend([data.vehicle_location.lng, data.vehicle_location.lat]);
    }
    mapInstanceRef.current.fitBounds(bounds, { padding: 50 });
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-primary';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  const getStatusText = (status: string | null) => {
    switch (status) {
      case 'confirmed': return 'Confirmed';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return 'Pending';
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Track My Visit',
      text: `Track my property visit to ${booking?.properties?.title}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 text-center max-w-md">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Booking Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The visit booking you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 pt-16">
        <div className="lg:flex lg:h-[calc(100vh-4rem)]">
          {/* Mobile Map (visible on small screens) */}
          <div className="lg:hidden h-64 relative">
            <div ref={mobileMapRef} className="w-full h-full" />
          </div>

          {/* Details Panel */}
          <div className="lg:w-1/3 p-4 lg:p-6 lg:overflow-y-auto">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>

              {/* Status Card */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Visit Status</h2>
                  <Badge className={getStatusColor(booking.status)}>
                    {getStatusText(booking.status)}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">{booking.properties?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.properties?.locality}, {booking.properties?.city}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">{booking.visit_date}</p>
                      <p className="text-sm text-muted-foreground">{booking.visit_time}</p>
                    </div>
                  </div>

                  {booking.agents && (
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">{booking.agents.name}</p>
                        <p className="text-sm text-muted-foreground">Assigned Agent</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* OTP/QR Code Card */}
              {booking.otp_code && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Verification
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">OTP Code</p>
                      <p className="text-2xl font-bold tracking-widest">{booking.otp_code}</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg">
                      <QRCodeSVG value={booking.id} size={80} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Share this code with your agent to verify your visit
                  </p>
                </Card>
              )}

              {/* Buyer Info */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Buyer Details
                </h3>
                <div className="space-y-2">
                  {booking.buyer_name && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Name:</span> {booking.buyer_name}
                    </p>
                  )}
                  {booking.buyer_phone && (
                    <p className="text-sm flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {booking.buyer_phone}
                    </p>
                  )}
                </div>
              </Card>

              {/* Actions */}
              {booking.status === 'completed' && (
                <Button 
                  className="w-full" 
                  onClick={() => setFeedbackModalOpen(true)}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Leave Feedback
                </Button>
              )}
            </div>
          </div>

          {/* Desktop Map */}
          <div className="hidden lg:block lg:flex-1 relative">
            <div ref={desktopMapRef} className="w-full h-full" />
          </div>
        </div>
      </main>

      <div className="lg:hidden">
        <Footer />
      </div>

      <VisitFeedbackModal
        open={feedbackModalOpen}
        onOpenChange={setFeedbackModalOpen}
        bookingId={booking.id}
      />
    </div>
  );
};

export default LiveVisitTracking;
