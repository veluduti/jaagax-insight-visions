import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { EventRow, listMyEvents, fmtDate, hhmm, seatsLeft } from "@/services/eventService";

export const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default", pending_approval: "secondary", draft: "outline", rejected: "destructive", cancelled: "destructive", completed: "outline",
};

export default function EventsManage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[] | null>(null);
  useEffect(() => { if (user) listMyEvents(user.id).then(setEvents).catch(() => setEvents([])); }, [user]);

  return (
    <div className="min-h-screen flex flex-col bg-background"><Navigation />
      <main className="flex-1 container mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div><h1 className="text-2xl font-bold">Organizer dashboard</h1><p className="text-sm text-muted-foreground">Your events, approvals and ticket sales</p></div>
          <Button asChild><Link to="/events/create"><Plus className="h-4 w-4 mr-1" />New event</Link></Button>
        </div>
        {!events ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div> :
          events.length === 0 ? <Card><CardContent className="py-14 text-center text-muted-foreground"><Calendar className="h-10 w-10 mx-auto mb-2" />No events yet.</CardContent></Card> : (
          <div className="space-y-3">{events.map((e) => {
            const t = e.tickets || [];
            const sold = t.reduce((s, x) => s + x.sold, 0), cap = t.reduce((s, x) => s + x.quantity, 0);
            return (
              <Link key={e.id} to={`/events/manage/${e.id}`}>
                <Card className="hover:border-primary/50 mb-3"><CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><h3 className="font-semibold truncate">{e.title}</h3>
                      <Badge variant={STATUS_VARIANT[e.status]}>{e.status.replace("_", " ")}</Badge></div>
                    <p className="text-xs text-muted-foreground">{fmtDate(e.event_date)} · {hhmm(e.start_time)} · {e.venue}</p>
                    {e.status === "rejected" && e.rejection_reason && <p className="text-xs text-destructive mt-1">Reason: {e.rejection_reason}</p>}
                  </div>
                  <div className="text-sm text-right shrink-0"><p><b>{sold}</b> / {cap} sold</p><p className="text-xs text-muted-foreground">{t.reduce((s, x) => s + seatsLeft(x), 0)} seats left</p></div>
                </CardContent></Card>
              </Link>);
          })}</div>
        )}
      </main><Footer /></div>
  );
}
