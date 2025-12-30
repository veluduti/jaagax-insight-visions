import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Eye, MessageSquare, MapPin, Calendar, 
  Sparkles, CheckCircle2, Home, Users,
  Building2, Clock, Award, Target
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import type { Json } from "@/integrations/supabase/types";

interface JourneyEvent {
  id: string;
  event_type: string;
  reference_id: string | null;
  metadata: Json;
  created_at: string;
}

const eventConfig: Record<string, { icon: any; color: string; label: string; bgColor: string }> = {
  property_viewed: {
    icon: Eye,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    label: "Explored a property"
  },
  ai_advice: {
    icon: Sparkles,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    label: "Received AI guidance"
  },
  agent_interaction: {
    icon: Users,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    label: "Connected with an agent"
  },
  visit_scheduled: {
    icon: Calendar,
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    label: "Scheduled a visit"
  },
  visit_completed: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    label: "Completed a visit"
  },
  stay_booked: {
    icon: Building2,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
    label: "Booked a stay"
  },
  shortlisted: {
    icon: Target,
    color: "text-rose-600",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    label: "Added to shortlist"
  },
  decision_made: {
    icon: Award,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    label: "Made a decision"
  },
  saved_search: {
    icon: Home,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    label: "Saved a search"
  }
};

const MyJourneyTimeline = () => {
  const [events, setEvents] = useState<JourneyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJourneyEvents();
  }, []);

  const fetchJourneyEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("buyer_journey_events")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching journey events:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEventConfig = (eventType: string) => {
    return eventConfig[eventType] || {
      icon: Clock,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      label: eventType.replace(/_/g, " ")
    };
  };

  const getEventDescription = (event: JourneyEvent) => {
    const metadata = (event.metadata || {}) as Record<string, any>;
    
    switch (event.event_type) {
      case "property_viewed":
        return metadata.property_title || "Viewed a property";
      case "ai_advice":
        return metadata.advice_type || "Received personalized recommendations";
      case "agent_interaction":
        return metadata.agent_name ? `Spoke with ${metadata.agent_name}` : "Connected with an agent";
      case "visit_scheduled":
        return metadata.property_title ? `Visit to ${metadata.property_title}` : "Scheduled a property visit";
      case "visit_completed":
        return metadata.property_title ? `Visited ${metadata.property_title}` : "Completed a property visit";
      case "stay_booked":
        return metadata.hotel_name ? `Stay at ${metadata.hotel_name}` : "Booked accommodation";
      case "shortlisted":
        return metadata.property_title || "Added property to shortlist";
      case "decision_made":
        return metadata.decision || "Made an important decision";
      case "saved_search":
        return metadata.search_name || "Saved search criteria";
      default:
        return metadata.description || "Journey milestone";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            My Journey
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          My Journey
        </CardTitle>
        <CardDescription>
          Your path to finding the perfect home
        </CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Your journey begins here</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              As you explore properties, connect with agents, and schedule visits, 
              your milestones will appear here.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
            
            <div className="space-y-6">
              {events.map((event, index) => {
                const config = getEventConfig(event.event_type);
                const Icon = config.icon;
                
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative flex gap-4 pl-2"
                  >
                    {/* Timeline dot */}
                    <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.bgColor}`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 pt-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{config.label}</p>
                          <p className="text-muted-foreground text-sm mt-0.5">
                            {getEventDescription(event)}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                        </Badge>
                      </div>
                      
                      {/* Additional metadata */}
                      {(() => {
                        const meta = event.metadata as Record<string, any> | null;
                        if (meta?.location) {
                          return (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {meta.location}
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MyJourneyTimeline;
