import { Link } from "react-router-dom";
import { ArrowRight, Building2, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIVE_HYPERGUEST_HOTELS } from "@/config/hyperguestLiveHotels";

export default function LiveHyperGuestHotels() {
  return (
    <section className="mb-5">
      <h2 className="mb-2 flex items-center gap-2 text-base font-bold"><Building2 className="h-4 w-4 text-primary" />International stays</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {LIVE_HYPERGUEST_HOTELS.map(h => (
          <article key={h.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">{h.name}</p>
                <p className="text-xs text-muted-foreground">{h.brand}</p>
              </div>
              {h.stars > 0 && <span className="flex shrink-0 items-center gap-0.5 text-xs">{Array.from({ length: h.stars }).map((_, i) => <Star key={i} className="h-3 w-3 fill-primary text-primary" />)}</span>}
            </div>
            <p className="flex items-start gap-1 text-xs text-muted-foreground"><MapPin className="mt-0.5 h-3 w-3 shrink-0" />{h.address}, {h.city}, {h.country}</p>
            <Button asChild size="sm" className="mt-auto self-start"><Link to={`/hotels/hyperguest/${h.id}?live=1`}>View rooms & book<ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </article>
        ))}
      </div>
    </section>
  );
}
