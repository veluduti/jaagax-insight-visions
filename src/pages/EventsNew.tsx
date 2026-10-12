import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Plus, Ticket, Users, Search, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  EventRow, listPublicEvents, canOrganize, fmtDate, hhmm, inr, seatsLeft, eventTypeLabel, KIND_LABEL,
} from "@/services/eventService";

export default function EventsNew() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizer, setOrganizer] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    listPublicEvents().then(setEvents).catch(() => setEvents([])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { if (user) canOrganize(user.id).then(setOrganizer); else setOrganizer(false); }, [user]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return events;
    return events.filter((e) => [e.title, e.city, e.venue, e.event_type].some((x) => x?.toLowerCase().includes(t)));
  }, [events, q]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1">
        <section className="py-12 md:py-16 px-4 bg-gradient-to-br from-background via-primary/5 to-background">
          <div className="container mx-auto max-w-6xl text-center space-y-5">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Property launches · Open houses · Expos</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold">Events near you</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">Register for verified property events hosted by JAAGA X agents and builders.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {user && <Button asChild variant="outline"><Link to="/events/my-bookings"><Ticket className="h-4 w-4 mr-2" />My bookings</Link></Button>}
              {organizer && <>
                <Button asChild variant="outline"><Link to="/events/manage"><LayoutDashboard className="h-4 w-4 mr-2" />Organizer dashboard</Link></Button>
                <Button asChild><Link to="/events/create"><Plus className="h-4 w-4 mr-2" />Create event</Link></Button>
              </>}
            </div>
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, city or venue" className="pl-9" />
            </div>
          </div>
        </section>

        <section className="py-10 px-4">
          <div className="container mx-auto max-w-6xl">
            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map((i) => <Card key={i} className="h-72 animate-pulse bg-muted/40" />)}
              </div>
            ) : shown.length === 0 ? (
              <Card className="bg-muted/30"><CardContent className="py-14 text-center">
                <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-semibold">No upcoming events</h3>
                <p className="text-sm text-muted-foreground">Check back soon for new property events.</p>
              </CardContent></Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {shown.map((e) => <EventTile key={e.id} e={e} />)}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function EventTile({ e }: { e: EventRow }) {
  const tickets = e.tickets || [];
  const left = tickets.reduce((s, t) => s + seatsLeft(t), 0);
  const prices = tickets.map((t) => (t.requires_payment ? Number(t.price) : 0));
  const min = prices.length ? Math.min(...prices) : 0;
  const kinds = Array.from(new Set(tickets.map((t) => t.kind)));
  return (
    <Link to={`/events/${e.id}`} target="_blank" rel="noopener noreferrer">
      <Card className="overflow-hidden h-full hover:border-primary/50 transition-colors group">
        <div className="relative h-40 bg-gradient-to-br from-primary/20 to-accent/20">
          {e.image_urls?.[0] ? (
            <img src={e.image_urls[0]} alt={e.title} className="w-full h-full object-cover" loading="lazy" />
          ) : <div className="flex items-center justify-center h-full"><Calendar className="h-10 w-10 text-primary/50" /></div>}
          <Badge className="absolute top-3 left-3">{eventTypeLabel(e.event_type)}</Badge>
          {left === 0 && <Badge variant="destructive" className="absolute top-3 right-3">Sold out</Badge>}
        </div>
        <CardContent className="p-4 space-y-2">
          <h3 className="font-semibold group-hover:text-primary line-clamp-1">{e.title}</h3>
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(e.event_date)} · {hhmm(e.start_time)}</p>
            <p className="flex items-center gap-1 line-clamp-1"><MapPin className="h-3 w-3" />{e.venue}{e.city ? `, ${e.city}` : ""}</p>
            <p className="flex items-center gap-1"><Users className="h-3 w-3" />{left} seats left</p>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1">{kinds.map((k) => <Badge key={k} variant="outline" className="text-[10px]">{KIND_LABEL[k]}</Badge>)}</div>
            <span className="text-sm font-semibold text-primary">{min === 0 ? "Free" : `From ${inr(min)}`}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
