import { Minus, Plus, UtensilsCrossed, BedDouble } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MEAL_LABEL, type MealConfig, type MealType, type PricingResult, type RoomConfig } from "@/lib/hotelPricing";

const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

/** Meal picker — only shows meals the hotel has enabled. */
export function MealSelector({
  meals, selected, onToggle,
}: {
  meals: MealConfig[];
  selected: MealType[];
  onToggle: (m: MealType) => void;
}) {
  const available = meals.filter((m) => m.is_active !== false && m.is_available !== false);
  if (!available.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <UtensilsCrossed className="h-4 w-4 text-emerald-500" /> Meal options
      </div>
      <div className="space-y-2">
        {available.map((m) => {
          const included = m.pricing_mode === "included";
          return (
            <label
              key={m.meal_type}
              className="flex cursor-pointer items-center justify-between rounded-md border border-border/60 p-3"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={included || selected.includes(m.meal_type)}
                  disabled={included}
                  onCheckedChange={() => !included && onToggle(m.meal_type)}
                />
                <div>
                  <div className="text-sm font-medium">{MEAL_LABEL[m.meal_type]}</div>
                  {included ? (
                    <Badge className="mt-1 bg-emerald-500/15 text-emerald-500">Included in room price</Badge>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {inr(m.adult_price)} / adult / day · {inr(m.child_price)} / child / day
                    </div>
                  )}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/** Extra bed stepper, bounded by the room configuration. */
export function ExtraBedSelector({
  room, value, onChange, numRooms = 1,
}: {
  room: RoomConfig | null;
  value: number;
  onChange: (v: number) => void;
  numRooms?: number;
}) {
  if (!room?.extra_bed_allowed || !Number(room.max_extra_beds)) return null;
  const max = Number(room.max_extra_beds) * Math.max(1, numRooms);
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
      <div className="flex items-center gap-2">
        <BedDouble className="h-4 w-4 text-emerald-500" />
        <div>
          <div className="text-sm font-medium">Extra bed</div>
          <div className="text-xs text-muted-foreground">
            {inr(Number(room.extra_bed_price) || 0)} / bed / night · max {max}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="icon" variant="outline" className="h-8 w-8"
          onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0}>
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="w-6 text-center text-sm font-semibold">{value}</span>
        <Button type="button" size="icon" variant="outline" className="h-8 w-8"
          onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/** Live, itemised price breakdown. */
export function PriceBreakdown({ price, compact = false }: { price: PricingResult | null; compact?: boolean }) {
  if (!price) return null;
  return (
    <div className="space-y-1 text-sm">
      <Row label={`Room charges (${price.nights} night${price.nights !== 1 ? "s" : ""})`} value={inr(price.roomCharges)} />
      {price.mealBreakdown.map((m) => (
        <Row
          key={m.meal_type}
          label={m.label}
          value={m.included ? "Included" : inr(m.total)}
          muted={m.included}
        />
      ))}
      {price.extraBedTotal > 0 && <Row label="Extra bed" value={inr(price.extraBedTotal)} />}
      {price.addonTotal > 0 && <Row label="Add-ons" value={inr(price.addonTotal)} />}
      {price.discount > 0 && <Row label="Discount" value={`− ${inr(price.discount)}`} accent />}
      <Separator className="my-2" />
      <Row label="Subtotal" value={inr(price.taxableSubtotal)} />
      <Row label={`GST (${price.gstRate}%)`} value={inr(price.taxAmount)} />
      <Separator className="my-2" />
      <div className="flex items-center justify-between text-base font-semibold">
        <span>Grand total</span><span>{inr(price.grandTotal)}</span>
      </div>
      {!compact && price.freeChildren > 0 && (
        <p className="pt-1 text-xs text-muted-foreground">
          {price.freeChildren} child(ren) stay free as per hotel age policy.
        </p>
      )}
    </div>
  );
}

function Row({ label, value, muted, accent }: { label: string; value: string; muted?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={accent ? "text-emerald-500" : muted ? "text-muted-foreground" : ""}>{value}</span>
    </div>
  );
}

export { inr };
