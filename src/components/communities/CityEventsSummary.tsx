import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, ArrowRight, Sparkles } from "lucide-react";

interface CityEventsSummaryProps {
  city: string;
}

export function CityEventsSummary({ city }: CityEventsSummaryProps) {
  const [eventStats, setEventStats] = useState({
    total: 0,
    thisWeek: 0,
    thisMonth: 0,
    topLocalities: [] as { locality: string; count: number }[]
  });
  const [featuredEvent, setFeaturedEvent] = useState<any>(null);

  useEffect(() => {
    fetchEventStats();
  }, [city]);

  const fetchEventStats = async () => {
    try {
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { data: events, error } = await supabase
        .from('community_events')
        .select('*')
        .eq('city', city)
        .not('published_at', 'is', null)
        .eq('cancelled', false)
        .gte('event_date', now.toISOString().split('T')[0]);

      if (error) throw error;

      const thisWeekEvents = events?.filter(e => 
        new Date(e.event_date) <= weekFromNow
      ) || [];
      
      const thisMonthEvents = events?.filter(e => 
        new Date(e.event_date) <= monthFromNow
      ) || [];

      // Count by locality
      const localityCounts: { [key: string]: number } = {};
      events?.forEach(e => {
        if (e.locality) {
          localityCounts[e.locality] = (localityCounts[e.locality] || 0) + 1;
        }
      });

      const topLocalities = Object.entries(localityCounts)
        .map(([locality, count]) => ({ locality, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      setEventStats({
        total: events?.length || 0,
        thisWeek: thisWeekEvents.length,
        thisMonth: thisMonthEvents.length,
        topLocalities
      });

      // Get featured event (next upcoming with most attendees)
      const featured = events?.sort((a, b) => 
        b.current_attendees - a.current_attendees
      )[0];
      setFeaturedEvent(featured);

    } catch (error) {
      console.error('Error fetching event stats:', error);
    }
  };

  if (eventStats.total === 0) return null;

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-primary/30 glow-effect">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2 mb-2">
                <Calendar className="h-6 w-6 text-primary" />
                Community Events in {city}
              </h3>
              <p className="text-muted-foreground">
                Discover local festivals, meetups, and community gatherings
              </p>
            </div>
            <Link to="/events">
              <Button variant="outline" className="gap-2">
                View All Events
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <div className="text-3xl font-bold text-primary">{eventStats.total}</div>
              <div className="text-sm text-muted-foreground">Upcoming Events</div>
            </div>
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <div className="text-3xl font-bold text-primary">{eventStats.thisWeek}</div>
              <div className="text-sm text-muted-foreground">This Week</div>
            </div>
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <div className="text-3xl font-bold text-primary">{eventStats.thisMonth}</div>
              <div className="text-sm text-muted-foreground">This Month</div>
            </div>
          </div>

          {eventStats.topLocalities.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Most Active Localities
              </h4>
              <div className="flex flex-wrap gap-2">
                {eventStats.topLocalities.map(({ locality, count }) => (
                  <Link key={locality} to={`/communities/${city}/${locality}`}>
                    <Badge variant="outline" className="hover:bg-primary/10 transition-colors">
                      <MapPin className="h-3 w-3 mr-1" />
                      {locality} ({count})
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {featuredEvent && (
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Featured Event</h4>
              <Link to={`/events/${featuredEvent.id}`}>
                <div className="flex gap-4 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                  {featuredEvent.image_url && (
                    <img 
                      src={featuredEvent.image_url} 
                      alt={featuredEvent.title}
                      className="w-24 h-24 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h5 className="font-semibold mb-1">{featuredEvent.title}</h5>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {new Date(featuredEvent.event_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        {featuredEvent.venue}
                      </div>
                    </div>
                    <Badge className="mt-2">{featuredEvent.current_attendees} attending</Badge>
                  </div>
                </div>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
