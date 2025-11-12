import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { EventList } from "@/components/events/EventList";
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

export default function EventsNew() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('community_events')
        .select('*')
        .not('published_at', 'is', null)
        .eq('cancelled', false)
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const featuredEvents = events.filter(e => e.featured);
  const upcomingEvents = events.filter(e => {
    const eventDate = new Date(e.event_date);
    return eventDate >= new Date() && !e.featured;
  });

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
          <section className="py-12 px-4 bg-gradient-to-b from-primary/5 to-background">
            <div className="container mx-auto max-w-7xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-3xl font-bold mb-8 flex items-center gap-2">
                  <span className="text-primary">★</span>
                  Featured Events
                </h2>
                <EventList events={featuredEvents} loading={loading} />
              </motion.div>
            </div>
          </section>
        )}

        {/* All Events */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-3xl font-bold mb-8">Upcoming Events</h2>
              <EventList events={upcomingEvents} loading={loading} />
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