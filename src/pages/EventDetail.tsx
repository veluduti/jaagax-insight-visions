import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventRSVPModal } from "@/components/events/EventRSVPModal";
import { VendorApplication } from "@/components/events/VendorApplication";
import { Calendar, MapPin, Users, Tag, Share2, Download, Verified, ArrowLeft, Clock, Mail, Phone, Store } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export default function EventDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpModalOpen, setRsvpModalOpen] = useState(false);
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (id) {
      fetchEvent();
    }
  }, [id]);

  useEffect(() => {
    if (event && event.lat && event.lng && !map) {
      initializeMap();
    }
  }, [event]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('community_events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast({
        title: "Error",
        description: "Failed to load event details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = () => {
    const mapboxToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    if (!mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    const newMap = new mapboxgl.Map({
      container: 'event-map',
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [event.lng, event.lat],
      zoom: 14
    });

    new mapboxgl.Marker({ color: '#00D084' })
      .setLngLat([event.lng, event.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<h3>${event.venue}</h3><p>${event.venue_address}</p>`))
      .addTo(newMap);

    setMap(newMap);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied!",
        description: "Event link copied to clipboard."
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
            <Link to="/events">
              <Button>Back to Events</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const eventDate = new Date(event.event_date);
  const formattedDate = eventDate.toLocaleDateString('en-IN', { 
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const spotsLeft = event.max_attendees 
    ? event.max_attendees - event.current_attendees 
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1">
        {/* Hero Image */}
        <div className="relative h-96 overflow-hidden">
          <img
            src={event.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200'}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="container mx-auto max-w-7xl">
              <Link to="/events">
                <Button variant="ghost" size="sm" className="mb-4">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Events
                </Button>
              </Link>

              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {event.verified && (
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        <Verified className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                    {event.featured && (
                      <Badge className="bg-accent/20 text-accent border-accent/30">
                        Featured
                      </Badge>
                    )}
                    <Badge variant="outline">{event.category}</Badge>
                  </div>

                  <h1 className="text-4xl md:text-5xl font-bold mb-2">{event.title}</h1>
                  <p className="text-lg text-muted-foreground">Organized by {event.organizer}</p>
                </div>

                <Button onClick={handleShare} variant="outline" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>About This Event</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {event.description || 'No description available.'}
                  </p>
                </CardContent>
              </Card>

              {/* Map */}
              {event.lat && event.lng && (
                <Card>
                  <CardHeader>
                    <CardTitle>Venue Location</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div id="event-map" className="w-full h-64 rounded-lg"></div>
                  </CardContent>
                </Card>
              )}

              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {event.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* RSVP Card */}
              <Card className="sticky top-4">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="font-medium">{formattedDate}</p>
                        {event.event_time && (
                          <p className="text-muted-foreground">{event.event_time.slice(0, 5)}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3 text-sm">
                      <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">{event.venue}</p>
                        {event.venue_address && (
                          <p className="text-muted-foreground">{event.venue_address}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <Users className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="font-medium">{event.current_attendees} attending</p>
                        {spotsLeft !== null && spotsLeft > 0 && (
                          <p className="text-muted-foreground">{spotsLeft} spots remaining</p>
                        )}
                      </div>
                    </div>

                    {event.ticket_price === 0 ? (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                        <p className="text-green-600 font-semibold">Free Entry</p>
                      </div>
                    ) : (
                      <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-center">
                        <p className="text-muted-foreground text-sm">Ticket Price</p>
                        <p className="text-2xl font-bold">₹{event.ticket_price}</p>
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={() => setRsvpModalOpen(true)} 
                    className="w-full" 
                    size="lg"
                    disabled={spotsLeft === 0}
                  >
                    {spotsLeft === 0 ? 'Sold Out' : 'RSVP Now'}
                  </Button>

                  <Button 
                    onClick={() => setVendorModalOpen(true)} 
                    variant="outline"
                    className="w-full gap-2" 
                    size="lg"
                  >
                    <Store className="h-4 w-4" />
                    Apply as Vendor
                  </Button>
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Organizer Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {event.organizer_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${event.organizer_email}`} className="hover:text-primary">
                        {event.organizer_email}
                      </a>
                    </div>
                  )}
                  {event.organizer_contact && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${event.organizer_contact}`} className="hover:text-primary">
                        {event.organizer_contact}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <EventRSVPModal
        event={event}
        open={rsvpModalOpen}
        onOpenChange={setRsvpModalOpen}
        onSuccess={fetchEvent}
      />

      <VendorApplication
        eventId={event.id}
        open={vendorModalOpen}
        onOpenChange={setVendorModalOpen}
      />
    </div>
  );
}