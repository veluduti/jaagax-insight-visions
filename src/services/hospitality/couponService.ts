import { supabase } from "@/integrations/supabase/client";

export type HotelCoupon = {
  id: string; code: string; description: string; scope: "global" | "hotel"; hotel_id: string | null;
  discount_type: "percent" | "flat"; discount_value: number; max_discount: number | null;
  min_booking_amount: number; min_nights: number; max_nights: number | null;
  valid_from: string | null; valid_until: string | null; stay_from: string | null; stay_until: string | null;
  max_uses: number | null; uses_count: number; is_active: boolean;
  eligible_hotel_ids: string[]; applicable_room_ids: string[];
};
const sb = supabase as any;
export async function loadCouponAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in");
  const { data: allowed, error: permissionError } = await sb.rpc("is_admin", { _user_id: user.id });
  if (permissionError || !allowed) throw new Error("Only JaagaX Admin may manage coupons");
  const [c, h, r] = await Promise.all([
    sb.from("hotel_coupons").select("*").order("created_at", { ascending: false }),
    sb.from("partner_hotels").select("id,name").order("name"),
    sb.from("hotel_rooms").select("id,hotel_id,room_type,room_name"),
  ]);
  if (c.error || h.error || r.error) throw new Error("Could not load coupons");
  return { coupons: (c.data ?? []) as HotelCoupon[], hotels: (h.data ?? []) as { id: string; name: string }[], rooms: (r.data ?? []) as { id: string; hotel_id: string; room_type: string; room_name: string | null }[] };
}
export async function saveCoupon(c: Omit<HotelCoupon, "id" | "uses_count">, id?: string) {
  const result = id ? await sb.from("hotel_coupons").update(c).eq("id", id) : await sb.from("hotel_coupons").insert(c);
  if (result.error) throw new Error(result.error.message);
}
export async function setCouponActive(id: string, is_active: boolean) {
  const { error } = await sb.from("hotel_coupons").update({ is_active }).eq("id", id);
  if (error) throw new Error(error.message);
}