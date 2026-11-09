import { Link } from "react-router-dom";
import { ArrowRight, Building2, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { loadHyperGuestHotels, type HyperGuestHotel } from "@/services/hospitality/hyperguestDiscoveryService";

export default function LiveHyperGuestHotels() {
  const [hotels, setHotels] = useState<HyperGuestHotel[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { loadHyperGuestHotels().then(setHotels).catch(e => setError(e.message)); }, []);
  return (
    <section className="mb-5">
      <h2 className="mb-2 flex items-center gap-2 text-base font-bold"><Building2 className="h-4 w-4 text-primary" />Marketplace hotels</h2>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {hotels.map(h => (
          <article key={h.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">{h.name}</p>
                <p className="text-xs text-muted-foreground">{h.location?.city?.name}</p>
              </div>
              {(h.rating ?? 0) > 0 && <span className="flex shrink-0 items-center gap-0.5 text-xs">{Array.from({ length: h.rating ?? 0 }).map((_, i) => <Star key={i} className="h-3 w-3 fill-primary text-primary" />)}</span>}
            </div>
            {h.images?.[0]?.uri && <img src={h.images[0].uri} alt={h.name} className="h-36 w-full object-cover rounded-md" loading="lazy" />}
            <p className="flex items-start gap-1 text-xs text-muted-foreground"><MapPin className="mt-0.5 h-3 w-3 shrink-0" />{h.location?.address}, {h.location?.city?.name}, {h.location?.country?.name}</p>
            <Button asChild size="sm" className="mt-auto self-start"><Link to={`/hotels/hyperguest/${h.id}?marketplace=1`}>View rooms & book<ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </article>
        ))}
      </div>
    </section>
  );
}
