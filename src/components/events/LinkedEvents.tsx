// Shows approved upcoming events linked to a project or property (events.property_ids holds either id).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { EventRow, eventTypeLabel, fmtDate, hhmm, inr, seatsLeft } from "@/services/eventService";

export default function LinkedEvents({ entityId, compact }: { entityId: string; compact?: boolean }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    (supabase as any).from("events").select("*, tickets:event_ticket_types(*)")
      .eq("status", "approved").contains("property_ids", [entityId]).gte("event_date", today).order("event_date")
      .then(({ data }: any) => setEvents(data || []));
  }, [entityId]);

  if (!events.length) return null;

  if (compact) {
    return (
      <Card className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/10 to-accent/5 overflow-hidden shadow-[0_10px_35px_-15px_hsl(var(--primary)/0.45)]">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
              <CalendarDays className="h-4 w-4" />Upcoming Events
            </h3>
            <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0">{events.length}</Badge>
          </div>
          <div className="space-y-2">
            {events.map((e) => {
              const tickets = e.tickets || [];
              const min = tickets.length ? Math.min(...tickets.map((t) => Number(t.price))) : 0;
              const left = tickets.reduce((s, t) => s + seatsLeft(t), 0);
              return (
                <Link key={e.id} to={`/events/${e.id}`} className="group block">
                  <div className="flex gap-3 rounded-xl border border-primary/20 bg-card p-2 transition hover:border-primary/50 hover:shadow-md">
                    <img src={e.image_urls?.[0] || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300"}
                      alt={e.title} loading="lazy" className="h-16 w-16 rounded-lg object-cover shrink-0" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-[10px] uppercase tracking-wide text-primary font-semibold">{eventTypeLabel(e.event_type)}</p>
                      <p className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(e.event_date)} · {hhmm(e.start_time)}</p>
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-xs font-medium text-primary">{min === 0 ? "Free entry" : `From ${inr(min)}`}</span>
                        <span className="text-xs text-muted-foreground">{left} seats left</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <Button size="sm" className="w-full" asChild>
            <Link to={`/events/${events[0].id}`}>View & Book</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl">
      <CardContent className="p-6 space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2"><CalendarDays className="h-6 w-6 text-primary" />Upcoming Events</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((e) => {
            const tickets = e.tickets || [];
            const min = tickets.length ? Math.min(...tickets.map((t) => Number(t.price))) : 0;
            const left = tickets.reduce((s, t) => s + seatsLeft(t), 0);
            return (
              <Link key={e.id} to={`/events/${e.id}`} className="group">
                <div className="rounded-2xl border border-border overflow-hidden h-full hover:shadow-lg transition-shadow bg-card">
                  <img src={e.image_urls?.[0] || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600"}
                    alt={e.title} loading="lazy" className="w-full h-36 object-cover group-hover:scale-105 transition-transform" />
                  <div className="p-4 space-y-2">
                    <Badge variant="secondary">{eventTypeLabel(e.event_type)}</Badge>
                    <h3 className="font-semibold line-clamp-2 group-hover:text-primary">{e.title}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1"><CalendarDays className="h-4 w-4" />{fmtDate(e.event_date)} · {hhmm(e.start_time)}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 line-clamp-1"><MapPin className="h-4 w-4 shrink-0" />{e.venue}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-medium flex items-center gap-1"><Ticket className="h-4 w-4 text-primary" />{min === 0 ? "Free entry" : `From ${inr(min)}`}</span>
                      <span className="text-xs text-muted-foreground">{left} seats left</span>
                    </div>
                    <Button size="sm" className="w-full">View & Book</Button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
