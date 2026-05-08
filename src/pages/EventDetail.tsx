import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MapPin, Clock, Users, Phone, Mail, Share2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface CommunityEvent {
  id: string;
  title: string;
  description?: string | null;
  venue: string;
  venue_address?: string | null;
  city: string;
  locality?: string | null;
  event_date: string;
  event_time?: string | null;
  end_date?: string | null;
  end_time?: string | null;
  category: string;
  featured: boolean | null;
  ticket_price: number | null;
  max_attendees?: number | null;
  current_attendees: number | null;
  image_url?: string | null;
  organizer?: string | null;
  organizer_email?: string | null;
  organizer_contact?: string | null;
  tags?: unknown;
  accessibility_features?: unknown;
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [event, setEvent] = useState<CommunityEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [hasRSVP, setHasRSVP] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEvent();
      if (user) checkRSVP();
    }
  }, [id, user]);

  const fetchEvent = async () => {
    const { data, error } = await supabase
      .from('community_events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching event:', error);
    } else {
      setEvent(data);
    }
    setLoading(false);
  };

  const checkRSVP = async () => {
    if (!user || !id) return;
    
    const { data } = await supabase
      .from('event_rsvps')
      .select('id')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .single();

    setHasRSVP(!!data);
  };

  const handleRSVP = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to RSVP for this event",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setRsvpLoading(true);

    if (hasRSVP) {
      // Cancel RSVP
      const { error } = await supabase
        .from('event_rsvps')
        .delete()
        .eq('event_id', id)
        .eq('user_id', user.id);

      if (!error) {
        setHasRSVP(false);
        toast({ title: "RSVP cancelled" });
      }
    } else {
      // Create RSVP
      const { error } = await supabase
        .from('event_rsvps')
        .insert({
          event_id: id,
          user_id: user.id,
          status: 'going'
        });

      if (!error) {
        setHasRSVP(true);
        toast({ title: "You're going!", description: "See you at the event!" });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }

    setRsvpLoading(false);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: event?.title,
        text: event?.description,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied to clipboard" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 container mx-auto max-w-4xl py-8 px-4 mt-20">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-muted rounded-lg" />
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 container mx-auto max-w-4xl py-8 px-4 mt-20">
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-xl font-semibold mb-4">Event not found</h3>
              <Link to="/events">
                <Button>Back to Events</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      festival: 'bg-orange-500',
      cultural: 'bg-purple-500',
      community: 'bg-blue-500',
      sports: 'bg-green-500',
      music: 'bg-pink-500',
      food: 'bg-yellow-500',
      other: 'bg-gray-500'
    };
    return colors[category] || colors.other;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1 container mx-auto max-w-4xl py-8 px-4 mt-20">
        <Link to="/events">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
        </Link>

        {/* Hero Image */}
        <div className="relative h-64 md:h-80 rounded-lg overflow-hidden mb-6 bg-gradient-to-br from-primary/20 to-accent/20">
          {event.image_url ? (
            <img 
              src={event.image_url} 
              alt={event.title}
              className="w-full h-full object-cover"
             loading="lazy" decoding="async" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Calendar className="h-20 w-20 text-primary/30" />
            </div>
          )}
          <div className="absolute top-4 left-4 flex gap-2">
            <Badge className={`${getCategoryColor(event.category)} text-white border-0`}>
              {event.category}
            </Badge>
            {event.featured && (
              <Badge className="bg-yellow-500 text-white border-0">Featured</Badge>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
              {event.description && (
                <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
              )}
            </div>

            {/* Event Details */}
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}
                    </p>
                    {event.event_time && (
                      <p className="text-sm text-muted-foreground">
                        {event.event_time}
                        {event.end_time && ` - ${event.end_time}`}
                      </p>
                    )}
                    {event.end_date && event.end_date !== event.event_date && (
                      <p className="text-sm text-muted-foreground">
                        Until {format(new Date(event.end_date), 'MMMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">{event.venue}</p>
                    {event.venue_address && (
                      <p className="text-sm text-muted-foreground">{event.venue_address}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {event.locality && `${event.locality}, `}{event.city}
                    </p>
                  </div>
                </div>

                {event.max_attendees && (
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    <p>{event.current_attendees} / {event.max_attendees} attendees</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            {event.tags && (event.tags as string[]).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(event.tags as string[]).map((tag, i) => (
                  <Badge key={i} variant="secondary">{tag}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* RSVP Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center mb-4">
                  {event.ticket_price > 0 ? (
                    <p className="text-2xl font-bold">₹{event.ticket_price}</p>
                  ) : (
                    <p className="text-lg font-medium text-green-600">Free Event</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    onClick={handleRSVP}
                    disabled={rsvpLoading}
                    variant={hasRSVP ? "outline" : "default"}
                  >
                    {rsvpLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {hasRSVP ? "Cancel RSVP" : "RSVP Now"}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Event
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Organizer Card */}
            {event.organizer && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Organized by</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-medium">{event.organizer}</p>
                  {event.organizer_email && (
                    <a 
                      href={`mailto:${event.organizer_email}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                    >
                      <Mail className="h-4 w-4" />
                      {event.organizer_email}
                    </a>
                  )}
                  {event.organizer_contact && (
                    <a 
                      href={`tel:${event.organizer_contact}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                    >
                      <Phone className="h-4 w-4" />
                      {event.organizer_contact}
                    </a>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
