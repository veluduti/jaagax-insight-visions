import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface LocalityEventsProps {
  city: string;
  locality: string;
}

export function LocalityEvents({ city, locality }: LocalityEventsProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [city, locality]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('community_events')
        .select('*')
        .eq('city', city)
        .eq('locality', locality)
        .not('published_at', 'is', null)
        .eq('cancelled', false)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(3);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (events.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          Upcoming Events in {locality}
        </h2>
        <Link to="/events">
          <Button variant="ghost" className="gap-2">
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {events.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={`/events/${event.id}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1">
                <div className="relative h-48">
                  <img
                    src={event.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400'}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-background/90 backdrop-blur-sm">
                      {event.category}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold line-clamp-2 hover:text-primary">
                    {event.title}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary shrink-0" />
                      <span>{new Date(event.event_date).toLocaleDateString('en-IN', { 
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <span className="line-clamp-1">{event.venue}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary shrink-0" />
                      <span>{event.current_attendees} attending</span>
                    </div>
                  </div>

                  {event.ticket_price === 0 ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Free Entry
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      ₹{event.ticket_price}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
