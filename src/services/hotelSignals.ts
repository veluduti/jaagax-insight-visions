import { supabase } from "@/integrations/supabase/client";

export type SignalType = "search" | "view" | "shortlist" | "book";

export interface StayProfile {
  cities: Record<string, number>;
  types: Record<string, number>;
  prefs: Record<string, number>;
  amenities: Record<string, number>;
  avgMaxPrice: number | null;
  viewedHotels: Record<string, number>;
  total: number;
}

const WEIGHT: Record<SignalType, number> = { search: 1, view: 2, shortlist: 3, book: 5 };

/** Fire-and-forget activity logging for signed-in users. */
export async function logHotelSignal(type: SignalType, params: Record<string, unknown> = {}, hotelId?: string | null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase as any).from("hotel_user_signals").insert({
      user_id: user.id, signal_type: type, hotel_id: hotelId ?? null, params,
    });
  } catch { /* non-blocking */ }
}

export async function loadStayProfile(): Promise<StayProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await (supabase as any)
    .from("hotel_user_signals").select("signal_type,hotel_id,params")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
  if (!data?.length) return null;
  const p: StayProfile = { cities: {}, types: {}, prefs: {}, amenities: {}, avgMaxPrice: null, viewedHotels: {}, total: data.length };
  const prices: number[] = [];
  const bump = (m: Record<string, number>, k: unknown, w: number) => {
    if (typeof k === "string" && k) m[k.toLowerCase()] = (m[k.toLowerCase()] || 0) + w;
  };
  for (const s of data) {
    const w = WEIGHT[s.signal_type as SignalType] ?? 1;
    const x = s.params || {};
    bump(p.cities, x.city, w);
    (x.business_types || []).forEach((t: string) => bump(p.types, t, w));
    (x.preferences || []).forEach((t: string) => bump(p.prefs, t, w));
    (x.amenities || []).forEach((t: string) => bump(p.amenities, t, w));
    if (Number(x.max_price) > 0) prices.push(Number(x.max_price));
    if (s.hotel_id) p.viewedHotels[s.hotel_id] = (p.viewedHotels[s.hotel_id] || 0) + w;
  }
  if (prices.length) p.avgMaxPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  return p;
}
