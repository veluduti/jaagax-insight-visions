import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { getProperties, firstImage, inr, type PlanProperty } from "@/services/smartVisitService";

const FALLBACK = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400";

export default function PlanPropertyList({ ids }: { ids: string[] }) {
  const [props, setProps] = useState<PlanProperty[] | null>(null);
  useEffect(() => { getProperties(ids).then(setProps); }, [ids.join(",")]);
  if (!props) return <p className="text-xs text-muted-foreground">Loading properties…</p>;
  if (!props.length) return <p className="text-xs text-muted-foreground">No properties added.</p>;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {props.map((p, i) => (
        <a key={p.id} href={`/property/${p.slug || p.id}`} target="_blank" rel="noopener noreferrer"
          className="flex gap-3 rounded-lg border border-border bg-card/60 p-2 hover:border-primary/50 transition-colors">
          <img src={firstImage(p.images) || FALLBACK} onError={(e) => ((e.target as HTMLImageElement).src = FALLBACK)}
            alt={p.title} className="h-16 w-20 rounded object-cover shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-primary font-medium">Stop {i + 1}</p>
            <p className="text-sm font-medium truncate">{p.title || "Property"}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3" />{[p.locality, p.city].filter(Boolean).join(", ") || "N/A"}
            </p>
            <p className="text-xs font-semibold">{inr(p.price)}</p>
          </div>
        </a>
      ))}
    </div>
  );
}
