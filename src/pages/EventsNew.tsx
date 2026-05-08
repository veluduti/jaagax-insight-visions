import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface CommunityEvent {
  id: string;
  title: string;
  description?: string;
  venue: string;
  city: string;
  locality?: string;
  event_date: string;
  event_time?: string;
  category: string;
  featured: boolean;
  ticket_price: number;
  max_attendees?: number;
  current_attendees: number;
  image_url?: string;
  organizer?: string;
}

export default function EventsNew() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('community_events')
      .select('*')
      .not('published_at', 'is', null)
      .neq('status', 'cancelled')
      .order('event_date', { ascending: true });

    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  };

  const featuredEvents = events.filter(e => e.featured);
  const upcomingEvents = events.filter(e => !e.featured);

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
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 px-4 overflow-hidden bg-gradient-to-br from-background via-primary/5 to-background">
          <div className="absolute inset-0 bg-grid-white/5" />
          
          <div className="container mx-auto max-w-7xl relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Community Events & Festivals</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Discover Local Events
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join vibrant community gatherings, festivals, and cultural celebrations across Hyderabad and Vijayawada
              </p>

              {user && (
                <Link to="/events/create">
                  <Button size="lg" className="gap-2">
                    <Plus className="h-5 w-5" />
                    Create Event
                  </Button>
                </Link>
              )}
            </motion.div>
          </div>
        </section>

        {/* Featured Events */}
        {featuredEvents.length > 0 && (
          <section className="py-12 px-4">
            <div className="container mx-auto max-w-7xl">
              <h2 className="text-3xl font-bold mb-8">Featured Events</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredEvents.map((event) => (
                  <EventCard key={event.id} event={event} getCategoryColor={getCategoryColor} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Upcoming Events */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-3xl font-bold mb-8">
                {featuredEvents.length > 0 ? 'Upcoming Events' : 'All Events'}
              </h2>
              
              {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="overflow-hidden animate-pulse">
                      <div className="h-40 bg-muted" />
                      <CardContent className="p-4">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : upcomingEvents.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingEvents.map((event) => (
                    <EventCard key={event.id} event={event} getCategoryColor={getCategoryColor} />
                  ))}
                </div>
              ) : events.length === 0 ? (
                <Card className="bg-muted/50">
                  <CardContent className="py-12 text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Events Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Be the first to create an event in your community!
                    </p>
                    {user && (
                      <Link to="/events/create">
                        <Button>Create Event</Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 bg-gradient-to-br from-primary/10 via-accent/5 to-background">
          <div className="container mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-6"
            >
              <h2 className="text-3xl font-bold">Host Your Event with JaagaX</h2>
              <p className="text-muted-foreground text-lg">
                Reach thousands of community members. List your event and grow your audience.
              </p>
              <Link to="/events/create">
                <Button size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Create Your Event
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

interface EventCardProps {
  event: CommunityEvent;
  getCategoryColor: (category: string) => string;
}

function EventCard({ event, getCategoryColor }: EventCardProps) {
  return (
    <Link to={`/events/${event.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
        <div className="relative h-40 bg-gradient-to-br from-primary/20 to-accent/20">
          {event.image_url ? (
            <img 
              src={event.image_url} 
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
             loading="lazy" decoding="async" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Calendar className="h-12 w-12 text-primary/50" />
            </div>
          )}
          <Badge className={`absolute top-3 left-3 ${getCategoryColor(event.category)} text-white border-0`}>
            {event.category}
          </Badge>
          {event.featured && (
            <Badge className="absolute top-3 right-3 bg-yellow-500 text-white border-0">
              Featured
            </Badge>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
            {event.title}
          </h3>
          {event.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {event.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(event.event_date), 'MMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {event.city}
            </span>
            {event.max_attendees && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {event.current_attendees}/{event.max_attendees}
              </span>
            )}
          </div>
          {event.ticket_price > 0 && (
            <Badge variant="outline" className="mt-3">
              ₹{event.ticket_price}
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
