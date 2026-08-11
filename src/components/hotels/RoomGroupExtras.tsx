// Per-room-type meal / extra-bed selector used by multi-room (combination)
// bookings. Each group is priced with its OWN room configuration — meal prices
// and extra-bed rules are never shared between room types.
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { useHotelPricingConfig, useLivePrice } from "@/hooks/useHotelPricing";
import { MealSelector, ExtraBedSelector, inr } from "@/components/hotels/BookingPricingControls";
import type { MealType, PricingResult } from "@/lib/hotelPricing";
import { allocationLabel } from "@/lib/roomOccupancy";

export interface GroupSelection {
  roomId: string;
  roomType: string;
  quantity: number;
  adults: number;
  children: number;
  meals: MealType[];
  extraBeds: number;
}

export function RoomGroupExtras({
  hotelId, group, checkIn, checkOut, onChange, onPrice,
}: {
  hotelId: string;
  group: GroupSelection;
  checkIn: string;
  checkOut: string;
  onChange: (patch: Partial<GroupSelection>) => void;
  onPrice: (roomId: string, price: PricingResult | null, error: string | null) => void;
}) {
  const config = useHotelPricingConfig(hotelId, group.roomId);
  const { price, error } = useLivePrice({
    room: config.room,
    meals: config.meals,
    rateCalendar: config.rateCalendar,
    gstRate: config.gstRate,
    checkIn,
    checkOut,
    adults: group.adults,
    children: group.children,
    numRooms: group.quantity,
    extraBeds: group.extraBeds,
    selectedMeals: group.meals,
    addons: [],
    discount: 0,
  });

  useEffect(() => {
    onPrice(group.roomId, price, error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.roomId, price?.grandTotal, error]);

  const toggleMeal = (m: MealType) =>
    onChange({ meals: group.meals.includes(m) ? group.meals.filter((x) => x !== m) : [...group.meals, m] });

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">
            {group.roomType} <span className="text-muted-foreground">×{group.quantity}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" /> {allocationLabel(group)}
          </div>
        </div>
        {price && <Badge variant="secondary">{inr(price.grandTotal)}</Badge>}
      </div>

      {config.loading ? (
        <Skeleton className="h-20 w-full rounded-md" />
      ) : (
        <>
          <MealSelector meals={config.meals} selected={group.meals} onToggle={toggleMeal} />
          <ExtraBedSelector
            room={config.room}
            value={group.extraBeds}
            onChange={(v) => onChange({ extraBeds: v })}
            numRooms={group.quantity}
          />
        </>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
