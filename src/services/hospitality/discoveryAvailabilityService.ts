import { supabase } from "@/integrations/supabase/client";

export interface DiscoveryRoomQuote {
  perNight: number;
  originalPrice: number | null;
  breakfastIncluded: boolean;
  mealsIncluded: boolean;
}

/** Reuse checkout's server prices; failed quotes never become advertised rates. */
export async function loadDiscoveryQuotes(rooms: { id: string; hotel_id: string; max_adults?: number | null; max_children?: number | null; max_occupancy?: number | null }[], counts: Record<string, number>, checkIn: string, checkOut: string, adults: number, children: number): Promise<Record<string, DiscoveryRoomQuote>> {
  const quotes: Record<string, DiscoveryRoomQuote> = {};
  const available = rooms.filter(r => counts[r.id] > 0);
  for (let offset = 0; offset < available.length; offset += 6) {
    await Promise.all(available.slice(offset, offset + 6).map(async r => {
      const roomAdults = Math.min(adults, Number(r.max_adults ?? r.max_occupancy) || 1);
      const roomChildren = Math.max(0, Math.min(children, Number(r.max_children) || 0, (Number(r.max_occupancy) || roomAdults) - roomAdults));
      const { data, error } = await supabase.functions.invoke("booking-engine-quote", {
        body: { hotel_id: r.hotel_id, room_id: r.id, check_in: checkIn, check_out: checkOut, adults: roomAdults, children: roomChildren, num_rooms: 1 },
      });
      if (error || data?.error || !(Number(data?.per_night) > 0)) return;
      const original = Number(data.per_night);
      const discount = Number(data.discount) / Math.max(1, Number(data.nights));
      const meals = Array.isArray(data.meals) ? data.meals : [];
      quotes[r.id] = {
        perNight: Math.round((original - (discount || 0)) * 100) / 100,
        originalPrice: discount > 0 ? original : null,
        breakfastIncluded: meals.some(m => m.meal_type === "breakfast" && m.included === true),
        mealsIncluded: meals.some(m => m.included === true),
      };
    }));
  }
  return quotes;
}

/** Counts from the canonical block calendar; reservation locks remain authoritative. */
export async function loadDiscoveryAvailability(roomIds: string[], checkIn: string, checkOut: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (let offset = 0; offset < roomIds.length; offset += 8) {
    await Promise.all(roomIds.slice(offset, offset + 8).map(async id => {
      const { data, error } = await supabase.rpc("room_free_units", { _room_id: id, _check_in: checkIn, _check_out: checkOut });
      if (error) throw error;
      counts[id] = Math.max(0, Number(data) || 0);
    }));
  }
  return counts;
}