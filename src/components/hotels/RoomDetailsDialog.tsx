import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Check, Coffee, Images, ShieldCheck } from "lucide-react";
import type { RoomDetails } from "@/lib/roomDetails";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&auto=format&fit=crop&q=70";
const keepFallback = (e: any) => { e.target.src = FALLBACK_IMG; };

interface Props {
  details: RoomDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Popup that shows one particular room's details and amenities. */
export default function RoomDetailsDialog({ details, open, onOpenChange }: Props) {
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [details?.name, details?.photos.length]);

  const photos = details?.photos ?? [];
  const active = photos[Math.min(idx, Math.max(0, photos.length - 1))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {details && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6 text-xl font-extrabold text-primary">{details.name}</DialogTitle>
            </DialogHeader>

            {photos.length > 0 && (
              <div className="space-y-2">
                <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
                  <img src={active} alt={details.name} onError={keepFallback} className="h-56 w-full object-cover sm:h-64" />
                  <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-foreground/70 px-2 py-1 text-[11px] text-background">
                    <Images className="h-3 w-3" />{photos.length} Photo{photos.length > 1 ? "s" : ""}
                  </span>
                </div>
                {photos.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {photos.map((p, i) => (
                      <button
                        key={`${p}-${i}`}
                        type="button"
                        onClick={() => setIdx(i)}
                        className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${i === idx ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"}`}
                        aria-label={`Photo ${i + 1}`}
                      >
                        <img src={p} alt="" loading="lazy" onError={keepFallback} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {details.specs.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {details.specs.map((s) => (
                  <div key={s.label} className="rounded-lg border border-border p-2">
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                    <p className="text-sm font-semibold text-foreground">{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {details.description && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{details.description}</p>
            )}

            {details.amenities.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-bold text-foreground">Room Amenities</h4>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {details.amenities.map((a) => (
                    <span key={a} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-primary" />{a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {details.meals.length > 0 && (
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <h4 className="mb-1 flex items-center gap-1.5 text-sm font-bold"><Coffee className="h-4 w-4 text-primary" />Meals</h4>
                <div className="space-y-0.5">
                  {details.meals.map((m) => (
                    <div key={m.label} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{m.label}</span>
                      <span className="font-medium">{m.value}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">Not included in the room price — add during booking.</p>
              </div>
            )}

            {details.policies.length > 0 && (
              <div className="rounded-xl border border-border p-3">
                <h4 className="mb-1 flex items-center gap-1.5 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-primary" />Room Policies</h4>
                <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {details.policies.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </div>
            )}

            {details.photos.length === 0 && details.specs.length === 0 && !details.description && details.amenities.length === 0 && (
              <p className="text-sm text-muted-foreground">No details saved for this room yet.</p>
            )}

            <div className="flex justify-end">
              <Badge variant="outline" className="border-primary/40 text-primary">Room as saved by the partner</Badge>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
