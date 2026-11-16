import { supabase } from "@/integrations/supabase/client";
import { markedPrice } from "../../../supabase/functions/_shared/hotelMarkup";
export { markedPrice };
const sb = supabase as any;
export async function loadPublicMarkupRates(): Promise<Record<string, number>> {
  const { data, error } = await sb.rpc("hotel_public_markup_rates");
  if (error) throw new Error("Hotel prices could not be loaded");
  return Object.fromEntries((data ?? []).map((r: any) => [r.hotel_id, Number(r.percentage)]));
}
export function markRoom<T extends { hotel_id: string; base_price?: number | null; weekly_price?: number | null; monthly_price?: number | null }>(room: T, rates: Record<string, number>): T {
  const percentage = rates[room.hotel_id] ?? 0;
  return { ...room, ...Object.fromEntries((["base_price", "weekly_price", "monthly_price"] as const).map(key => [key, room[key] == null ? room[key] : markedPrice(Number(room[key]), percentage)])) };
}
export async function loadMarkupAdmin() {
  const { data: admin, error: denied } = await sb.rpc("is_admin", { _user_id: (await supabase.auth.getUser()).data.user?.id });
  if (denied || admin !== true) throw new Error("Global administrator access required");
  const [hotels, rules, audit] = await Promise.all([
    sb.from("partner_hotels").select("id,name,city,source_channel,is_active").order("name"),
    sb.from("hotel_price_markups").select("*").order("updated_at", { ascending: false }),
    sb.from("hotel_price_markup_audit").select("*").order("changed_at", { ascending: false }).limit(50),
  ]);
  if (hotels.error || rules.error || audit.error) throw new Error("Could not load hotel markups");
  return { hotels: hotels.data as { id: string; name: string; city: string; source_channel: string | null; is_active: boolean }[], rules: rules.data as { hotel_id: string | null; percentage: number; scope: string }[], audit: audit.data as { id: string; hotel_id: string | null; old_percentage: number | null; new_percentage: number | null; changed_at: string }[] };
}
export async function saveHotelMarkup(hotelId: string | null, percentage: number | null) {
  const { error } = await sb.rpc("set_hotel_price_markup", { _hotel_id: hotelId, _percentage: percentage });
  if (error) throw new Error(error.message);
  window.dispatchEvent(new Event("hotel-markup-changed"));
}