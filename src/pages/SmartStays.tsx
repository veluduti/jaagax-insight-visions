import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Hotel, Luggage } from "lucide-react";
import { listPublished, inr } from "@/services/smartStayService";

export default function SmartStays() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { listPublished().then(setRows).catch(() => setRows([])); }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Luggage className="h-7 w-7 text-primary" /> Smart Stays</h1>
            <p className="text-muted-foreground mt-1">Multi-city trips with every hotel booked in one payment.</p>
          </div>
          <Button variant="outline" asChild><Link to="/my-smart-stays">My Smart Stays</Link></Button>
        </div>
        {rows === null ? <p className="text-muted-foreground">Loading…</p> : rows.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">No Smart Stay packages are live yet. Check back soon.</Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((p) => {
              const snap = p.revision?.snapshot ?? {};
              const it = (snap.itinerary ?? []) as any[];
              const stays = (snap.stays ?? []) as any[];
              const img = (snap.images ?? [])[0];
              return (
                <Link key={p.id} to={`/smart-stays/${p.id}`} className="group">
                  <Card className="overflow-hidden h-full flex flex-col hover:border-primary/60 transition-colors">
                    <div className="h-40 bg-muted">
                      {img ? <img src={img} alt={snap.title} className="h-full w-full object-cover" /> :
                        <div className="h-full flex items-center justify-center text-muted-foreground"><Luggage className="h-10 w-10" /></div>}
                    </div>
                    <div className="p-4 flex-1 flex flex-col gap-2">
                      <h3 className="font-semibold text-lg group-hover:text-primary">{snap.title || p.title}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-4 w-4" />{it.map((s) => s.destination).join(" → ")}</p>
                      <div className="flex gap-2 flex-wrap text-xs">
                        <Badge variant="secondary"><Calendar className="h-3 w-3 mr-1" />{it[0]?.arrival} – {it[it.length - 1]?.departure}</Badge>
                        <Badge variant="secondary"><Hotel className="h-3 w-3 mr-1" />{stays.length} hotel stay{stays.length === 1 ? "" : "s"}</Badge>
                      </div>
                      <div className="mt-auto pt-2 text-xl font-bold text-primary">{inr(p.revision?.selling_price)} <span className="text-xs font-normal text-muted-foreground">incl. taxes</span></div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
