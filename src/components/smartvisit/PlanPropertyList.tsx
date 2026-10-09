import { useEffect, useState } from "react";
import { MapPin, Clock } from "lucide-react";
import { getProperties, firstImage, inr, fmt12, type PlanProperty, type ScheduleSlot } from "@/services/smartVisitService";

const FALLBACK = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400";

export default function PlanPropertyList({ ids, schedule }: { ids: string[]; schedule?: ScheduleSlot[] }) {
  const [props, setProps] = useState<PlanProperty[] | null>(null);
  useEffect(() => { getProperties(ids).then(setProps); }, [ids.join(",")]);
  if (!props) return <p className="text-xs text-muted-foreground">Loading properties…</p>;
  if (!props.length) return <p className="text-xs text-muted-foreground">No properties added.</p>;
  const slot = (id: string) => (Array.isArray(schedule) ? schedule : []).find((s) => s.property_id === id && s.start);
  const ordered = [...props].sort((a, b) => (slot(a.id)?.start || "99").localeCompare(slot(b.id)?.start || "99"));
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ordered.map((p, i) => (
        <a key={p.id} href={`/property/${p.slug || p.id}`} target="_blank" rel="noopener noreferrer"
          className="flex gap-3 rounded-lg border border-border bg-card/60 p-2 hover:border-primary/50 transition-colors">
          <img src={firstImage(p.images) || FALLBACK} onError={(e) => ((e.target as HTMLImageElement).src = FALLBACK)}
            alt={p.title} className="h-16 w-20 rounded object-cover shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-primary font-medium flex items-center gap-1">Stop {i + 1}
              {slot(p.id) && <><Clock className="h-3 w-3 ml-1" />{fmt12(slot(p.id)!.start)}–{fmt12(slot(p.id)!.end)}</>}</p>
            <p className="text-sm font-medium truncate">{p.title || "Property"}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3" />{[p.locality, p.city].filter(Boolean).join(", ") || ""}
            </p>
            {p.price ? <p className="text-xs font-semibold">{inr(p.price)}</p> : null}
          </div>
        </a>
      ))}
    </div>
  );
}
