import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  computeBookingPrice, validateBookingSelection, nightsBetween, stayDates,
  type MealConfig, type MealType, type RoomConfig, type NightRate, type PricingResult,
  type AddonSelection,
} from "@/lib/hotelPricing";

/**
 * Loads a hotel's room / meal / rate-calendar / tax configuration and returns a
 * LIVE price preview using the same engine the backend uses. The backend value
 * stays authoritative — this only powers instant UI updates.
 */
export function useHotelPricingConfig(hotelId?: string | null, roomId?: string | null) {
  const [room, setRoom] = useState<RoomConfig | null>(null);
  const [meals, setMeals] = useState<MealConfig[]>([]);
  const [gstRate, setGstRate] = useState<number | null>(null);
  const [rateCalendar, setRateCalendar] = useState<NightRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hotelId || !roomId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [r, m, h, rc] = await Promise.all([
        (supabase as any).from("hotel_rooms").select("*").eq("id", roomId).maybeSingle(),
        (supabase as any).from("hotel_meals").select("*").eq("hotel_id", hotelId).eq("is_active", true),
        (supabase as any).from("partner_hotels").select("gst_rate").eq("id", hotelId).maybeSingle(),
        (supabase as any).from("hotel_rate_calendar").select("*").eq("room_id", roomId),
      ]);
      if (cancelled) return;
      setRoom(r.data || null);
      // Room-level meal config overrides hotel-level defaults.
      const map = new Map<string, any>();
      for (const row of m.data || []) {
        if (row.room_id && row.room_id !== roomId) continue;
        const cur = map.get(row.meal_type);
        if (!cur || (row.room_id && !cur.room_id)) map.set(row.meal_type, row);
      }
      setMeals(Array.from(map.values()));
      setGstRate(h.data?.gst_rate ?? null);
      setRateCalendar((rc.data || []).map((x: any) => ({
        date: x.date, price: Number(x.price), stop_sell: x.stop_sell, available_units: x.available_units,
      })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [hotelId, roomId]);

  return { room, meals, gstRate, rateCalendar, loading };
}

export interface LivePriceArgs {
  room: RoomConfig | null;
  meals: MealConfig[];
  rateCalendar: NightRate[];
  gstRate: number | null;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  numRooms: number;
  extraBeds: number;
  selectedMeals: MealType[];
  addons?: AddonSelection[];
  discount?: number;
}

export function useLivePrice(args: LivePriceArgs): {
  price: PricingResult | null;
  error: string | null;
} {
  return useMemo(() => {
    if (!args.room || nightsBetween(args.checkIn, args.checkOut) < 1) {
      return { price: null, error: null };
    }
    const input = {
      room: args.room,
      meals: args.meals,
      rateCalendar: args.rateCalendar,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      adults: args.adults,
      children: args.children,
      numRooms: args.numRooms,
      extraBeds: args.extraBeds,
      selectedMeals: args.selectedMeals,
      addons: args.addons || [],
      discount: args.discount || 0,
      gstRate: args.gstRate,
    };
    return {
      price: computeBookingPrice(input),
      error: validateBookingSelection(input),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    args.room, args.meals, args.rateCalendar, args.gstRate, args.checkIn, args.checkOut,
    args.adults, args.children, args.numRooms, args.extraBeds,
    args.selectedMeals.join(","), JSON.stringify(args.addons || []), args.discount,
  ]);
}

export { stayDates, nightsBetween };
