import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { longStayQuote, weeklyToMonthly, ADVANCE_LABEL } from "@/lib/longStayPricing";
import LongStayBreakdown from "@/components/hotels/LongStayBreakdown";

/** Weekly / monthly rent inputs + live "due at booking" preview for PG, Hostel and Co-living. */
export default function LongStayRentEditor({ value, onChange, noun }: {
  value: any; onChange: (patch: Record<string, any>) => void; noun: string;
}) {
  const num = (v: string) => (v === "" ? null : Math.max(0, Number(v)));
  const q = longStayQuote({ weekly_price: value.weekly_price, monthly_price: value.monthly_price, attributes: value.attributes });
  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <p className="text-sm font-semibold">Weekly & monthly rent (per {noun.toLowerCase()})</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Weekly rent ₹</Label>
          <Input type="number" min={0} value={value.weekly_price ?? ""} onChange={(e) => onChange({ weekly_price: num(e.target.value) })} />
        </div>
        <div>
          <Label>Monthly rent ₹</Label>
          <Input type="number" min={0} value={value.monthly_price ?? ""} onChange={(e) => onChange({ monthly_price: num(e.target.value) })} />
        </div>
      </div>
      {!!value.weekly_price && !value.monthly_price && (
        <p className="text-xs text-muted-foreground">
          Monthly equivalent: ₹{weeklyToMonthly(value.weekly_price).toLocaleString("en-IN")} (weekly × 52 ÷ 12)
        </p>
      )}
      <p className="text-xs text-muted-foreground">Advance: {ADVANCE_LABEL[q.advanceMode]} — set it under “Rent & advance” below.</p>
      {(q.weekly > 0 || q.monthly > 0) && <LongStayBreakdown quote={q} compact />}
    </div>
  );
}
