import { Calendar, MapPin, Users, Tag, Verified } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description?: string;
    city: string;
    locality?: string;
    event_date: string;
    event_time?: string;
    venue: string;
    category: string;
    image_url?: string;
    organizer: string;
    verified: boolean;
    featured: boolean;
    ticket_price: number;
    max_attendees?: number;
    current_attendees: number;
    tags?: string[];
  };
  index?: number;
}

export function EventCard({ event, index = 0 }: EventCardProps) {
  const eventDate = new Date(event.event_date);
  const formattedDate = eventDate.toLocaleDateString('en-IN', { 
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const spotsLeft = event.max_attendees 
    ? event.max_attendees - event.current_attendees 
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link to={`/events/${event.id}`}>
        <Card className="group hover:shadow-xl transition-all duration-300 overflow-hidden border-border/50 backdrop-blur-sm bg-card/80 h-full">
          <div className="relative overflow-hidden">
            <img
              src={event.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600'}
              alt={event.title}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
             loading="lazy" decoding="async" />
            {event.featured && (
              <Badge className="absolute top-3 right-3 bg-gradient-to-r from-primary to-accent">
                Featured
              </Badge>
            )}
            {event.verified && (
              <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm rounded-full p-1.5">
                <Verified className="h-4 w-4 text-primary" />
              </div>
            )}
          </div>

          <CardHeader className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                {event.title}
              </h3>
              <Badge variant="outline" className="shrink-0">
                {event.category}
              </Badge>
            </div>
            {event.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {event.description}
              </p>
            )}
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formattedDate}</span>
              {event.event_time && (
                <span className="ml-1">at {event.event_time.slice(0, 5)}</span>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{event.venue}, {event.locality || event.city}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {event.current_attendees} attending
              </span>
              {spotsLeft !== null && spotsLeft > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {spotsLeft} spots left
                </Badge>
              )}
            </div>

            {event.tags && event.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                {event.tags.slice(0, 3).map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex items-center justify-between pt-0">
            <div className="flex items-center gap-2">
              {event.ticket_price === 0 ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  Free Entry
                </Badge>
              ) : (
                <span className="font-semibold text-lg">
                  ₹{event.ticket_price}
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              View Details
            </Button>
          </CardFooter>
        </Card>
      </Link>
    </motion.div>
  );
}