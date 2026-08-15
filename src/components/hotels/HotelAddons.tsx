// Customer-facing hotel add-ons ("Enhance your stay").
// Reads active add-ons from hotel_addons and offers them both as a showcase on
// the hotel page and as a quantity selector inside the booking flow.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Minus, Sparkles, Package } from "lucide-react";
import { inr } from "@/components/hotels/BookingPricingControls";

export interface HotelAddon {
  id: string;
  hotel_id: string;
  title: string;
  description: string | null;
  category: string;
  price: number;
  unit: string;
  image_url: string | null;
  photo_url: string | null;
  min_quantity: number | null;
  max_quantity: number | null;
  is_active: boolean;
  sort_order: number | null;
}

export interface AddonSelectionMap {
  [addonId: string]: number;
}

export const UNIT_LABEL: Record<string, string> = {
  per_booking: "per booking",
  per_night: "per night",
  per_guest: "per guest",
  per_person: "per person",
};

/** Multiplier applied to unit price — mirrors the server pricing rules. */
export function addonUnits(unit: string, nights: number, guests: number) {
  if (unit === "per_night") return Math.max(1, nights);
  if (unit === "per_guest" || unit === "per_person") return Math.max(1, guests);
  return 1;
}

export function addonLineTotal(a: HotelAddon, qty: number, nights: number, guests: number) {
  return Number(a.price || 0) * qty * addonUnits(a.unit, nights, guests);
}

export function useHotelAddons(hotelId: string | null | undefined) {
  const [addons, setAddons] = useState<HotelAddon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!hotelId) { setAddons([]); setLoading(false); return; }
    setLoading(true);
    (async () => {
      const { data } = await (supabase as any)
        .from("hotel_addons")
        .select("*")
        .eq("hotel_id", hotelId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });
      if (!cancelled) {
        setAddons((data ?? []) as HotelAddon[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hotelId]);

  return { addons, loading };
}

const addonImage = (a: HotelAddon) => a.image_url || a.photo_url || null;

/* ---------------------------- Hotel page ---------------------------- */

export function HotelAddonsShowcase({ hotelId, onAdd }: { hotelId: string; onAdd?: (a: HotelAddon) => void }) {
  const { addons, loading } = useHotelAddons(hotelId);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }
  if (!addons.length) return null;

  return (
    <section id="addons" className="scroll-mt-24">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Sparkles className="h-5 w-5 text-primary" />
        Enhance your stay
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {addons.map((a) => (
          <div key={a.id} className="flex gap-3 rounded-xl border border-border/60 bg-card p-3">
            {addonImage(a) ? (
              <img src={addonImage(a)!} alt={a.title} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Package className="h-6 w-6" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-semibold">{a.title}</p>
                <Badge variant="secondary" className="shrink-0 capitalize">{a.category.replace("_", " ")}</Badge>
              </div>
              {a.description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{a.description}</p>
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-sm font-bold">
                  {inr(a.price)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {UNIT_LABEL[a.unit] ?? a.unit}
                  </span>
                </span>
                <Button size="sm" variant="outline" onClick={() => onAdd?.(a)}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------- Booking flow --------------------------- */

export function AddonSelector({
  hotelId, nights, guests, value, onChange,
}: {
  hotelId: string;
  nights: number;
  guests: number;
  value: AddonSelectionMap;
  onChange: (next: AddonSelectionMap) => void;
}) {
  const { addons, loading } = useHotelAddons(hotelId);
  if (loading) return <Skeleton className="h-20 w-full rounded-md" />;
  if (!addons.length) return null;

  const setQty = (a: HotelAddon, qty: number) => {
    const max = Number(a.max_quantity) || 10;
    const next = { ...value };
    const clamped = Math.max(0, Math.min(max, qty));
    if (clamped <= 0) delete next[a.id];
    else next[a.id] = clamped;
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-emerald-500" /> Enhance your stay
      </div>
      {addons.map((a) => {
        const qty = value[a.id] ?? 0;
        return (
          <div key={a.id} className="flex items-center justify-between gap-3 rounded-md border border-border/60 p-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">{a.title}</div>
              {a.description && <div className="line-clamp-1 text-xs text-muted-foreground">{a.description}</div>}
              <div className="text-xs text-muted-foreground">
                {inr(a.price)} {UNIT_LABEL[a.unit] ?? a.unit}
                {qty > 0 && ` · ${inr(addonLineTotal(a, qty, nights, guests))}`}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button type="button" size="icon" variant="outline" className="h-8 w-8"
                onClick={() => setQty(a, qty - 1)} disabled={qty <= 0}>
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="w-6 text-center text-sm font-semibold">{qty}</span>
              <Button type="button" size="icon" variant="outline" className="h-8 w-8"
                onClick={() => setQty(a, qty + 1)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Sum of the selected add-ons (pre-tax). */
export function useAddonTotals(hotelId: string, selection: AddonSelectionMap, nights: number, guests: number) {
  const { addons } = useHotelAddons(hotelId);
  const rows = addons
    .filter((a) => (selection[a.id] ?? 0) > 0)
    .map((a) => ({
      addon: a,
      quantity: selection[a.id],
      total: addonLineTotal(a, selection[a.id], nights, guests),
    }));
  return { rows, total: rows.reduce((s, r) => s + r.total, 0) };
}
