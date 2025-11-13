import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface CommunityEventHighlight {
  city: string;
  eventCount: number;
  upcomingEvents: any[];
  categories: string[];
}

export function CommunityEventHighlights() {
  const [highlights, setHighlights] = useState<CommunityEventHighlight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEventHighlights();
  }, []);

  const fetchEventHighlights = async () => {
    try {
      const { data: events, error } = await supabase
        .from('community_events')
        .select('*')
        .not('published_at', 'is', null)
        .eq('cancelled', false)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true });

      if (error) throw error;

      // Group by city
      const cityGroups: { [key: string]: any[] } = {};
      events?.forEach(event => {
        if (!cityGroups[event.city]) {
          cityGroups[event.city] = [];
        }
        cityGroups[event.city].push(event);
      });

      const cityHighlights = Object.entries(cityGroups).map(([city, cityEvents]) => {
        const categories = [...new Set(cityEvents.map(e => e.category))];
        return {
          city,
          eventCount: cityEvents.length,
          upcomingEvents: cityEvents.slice(0, 3),
          categories
        };
      }).sort((a, b) => b.eventCount - a.eventCount);

      setHighlights(cityHighlights);
    } catch (error) {
      console.error('Error fetching event highlights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || highlights.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="h-8 w-8 text-primary" />
          Community Events Happening Now
        </h2>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {highlights.slice(0, 6).map((highlight, index) => (
          <motion.div
            key={highlight.city}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={`/communities/${highlight.city}`}>
              <Card className="glass-panel hover:shadow-lg transition-all hover:-translate-y-1 border-primary/30">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold mb-1">{highlight.city}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {highlight.eventCount} upcoming events
                      </p>
                    </div>
                    <Badge className="bg-primary/20 text-primary">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {highlight.categories.slice(0, 3).map(category => (
                      <Badge key={category} variant="outline" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Upcoming:</p>
                    {highlight.upcomingEvents.slice(0, 2).map(event => (
                      <div 
                        key={event.id} 
                        className="text-sm text-muted-foreground flex items-start gap-2 bg-muted/30 p-2 rounded"
                      >
                        <Calendar className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground line-clamp-1">
                            {event.title}
                          </div>
                          <div className="text-xs">
                            {new Date(event.event_date).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
