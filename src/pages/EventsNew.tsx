import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Construction } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";

// Stub component - community_events table not yet created
export default function EventsNew() {
  const { user } = useAuth();

  // Mock featured events for display
  const mockEvents = [
    {
      id: "1",
      title: "Diwali Celebration 2025",
      description: "Join us for a grand Diwali celebration with cultural performances and fireworks.",
      venue: "Central Park",
      city: "Hyderabad",
      event_date: "2025-10-20",
      category: "cultural",
      featured: true,
    },
    {
      id: "2", 
      title: "Community Sports Day",
      description: "Annual sports day with various games and activities for all ages.",
      venue: "Sports Complex",
      city: "Vijayawada",
      event_date: "2025-03-15",
      category: "sports",
      featured: false,
    },
    {
      id: "3",
      title: "Real Estate Expo 2025",
      description: "Explore the latest properties and meet top builders in the region.",
      venue: "Convention Center",
      city: "Hyderabad",
      event_date: "2025-04-10",
      category: "networking",
      featured: true,
    },
  ];

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

        {/* Coming Soon Notice */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-7xl">
            <Card className="bg-muted/50">
              <CardContent className="py-8">
                <div className="text-center">
                  <Construction className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-semibold mb-2">Events Feature Coming Soon</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    The community events system is being set up. Check back soon for local events, 
                    festivals, and community gatherings!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Sample Events Preview */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-3xl font-bold mb-8">Preview: Upcoming Events</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockEvents.map((event) => (
                  <Card key={event.id} className="overflow-hidden opacity-75">
                    <div className="h-40 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Calendar className="h-12 w-12 text-primary/50" />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">{event.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{event.city}</span>
                        <span>•</span>
                        <span>{event.event_date}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
