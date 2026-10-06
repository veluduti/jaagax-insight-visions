import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export type PriceTip = { roomId: string; name: string; current: number; suggested: number; occupancy: number; reason: string };
export type ListingCheck = { key: string; label: string; done: boolean; hint: string; link: string };
export type Offer = { id: string; code: string; description: string | null; discount_type: string; discount_value: number; valid_until: string | null; is_active: boolean; uses_count: number };

export type GrowthData = {
  score: number; checks: ListingCheck[]; tips: PriceTip[]; offers: Offer[];
  occupancy30: number; avgRating: number | null; reviewCount: number; unanswered: number;
};

/** Occupancy-based price tips: >80% booked → raise ~10%, <30% → lower ~10% or run an offer. */
function priceTip(r: any, booked: number): PriceTip | null {
  const units = Math.max(1, Number(r.total_units || r.number_of_available_rooms || 1));
  const occ = Math.min(1, booked / (units * 30));
  const cur = Number(r.base_price || 0);
  if (!cur) return null;
  const name = r.room_name || r.room_type || "Room";
  if (occ >= 0.8) return { roomId: r.id, name, current: cur, suggested: Math.round(cur * 1.1 / 50) * 50, occupancy: occ, reason: "Almost full for the next 30 days — guests will still book at a slightly higher price." };
  if (occ < 0.3) return { roomId: r.id, name, current: cur, suggested: Math.round(cur * 0.9 / 50) * 50, occupancy: occ, reason: "Mostly empty for the next 30 days — a lower price or an offer can bring bookings." };
  return null;
}

export async function loadGrowth(hotelId: string): Promise<GrowthData> {
  const now = new Date(); const end = new Date(now.getTime() + 30 * 864e5);
  const [h, r, b, p, rv] = await Promise.all([
    sb.from("partner_hotels").select("description,images,amenities,contact_phone,check_in_time,latitude,policies").eq("id", hotelId).maybeSingle(),
    sb.from("hotel_rooms").select("id,room_name,room_type,base_price,total_units,number_of_available_rooms,photos,description,is_active").eq("hotel_id", hotelId).limit(200),
    sb.from("hotel_availability_blocks").select("room_id,start_date,end_date,units").eq("hotel_id", hotelId).lt("start_date", iso(end)).gt("end_date", iso(now)).limit(2000),
    sb.from("hotel_promo_codes").select("id,code,description,discount_type,discount_value,valid_until,is_active,uses_count").eq("hotel_id", hotelId).order("created_at", { ascending: false }).limit(50),
    sb.from("hotel_reviews").select("rating,response").eq("hotel_id", hotelId).limit(500),
  ]);
  const hotel = h.data ?? {}; const rooms = (r.data ?? []).filter((x: any) => x.is_active !== false);

  const nights = new Map<string, number>();
  for (const blk of b.data ?? []) {
    const s = Math.max(new Date(blk.start_date).getTime(), now.getTime());
    const e = Math.min(new Date(blk.end_date).getTime(), end.getTime());
    const n = Math.max(0, Math.round((e - s) / 864e5)) * Number(blk.units || 1);
    nights.set(blk.room_id, (nights.get(blk.room_id) ?? 0) + n);
  }
  const tips = rooms.map((x: any) => priceTip(x, nights.get(x.id) ?? 0)).filter(Boolean) as PriceTip[];
  const totalUnits = rooms.reduce((a: number, x: any) => a + Math.max(1, Number(x.total_units || 1)), 0);
  const totalBooked = [...nights.values()].reduce((a, n) => a + n, 0);

  const photos = (hotel.images ?? []).length;
  const checks: ListingCheck[] = [
    { key: "photos", label: "At least 5 property photos", done: photos >= 5, hint: `You have ${photos}. Bright photos of rooms, bathroom and entrance get more bookings.`, link: "/partners/hotel-profile" },
    { key: "desc", label: "A clear description (100+ letters)", done: (hotel.description ?? "").trim().length >= 100, hint: "Say what is nearby, who it suits, and what makes it special.", link: "/partners/hotel-profile" },
    { key: "amen", label: "At least 5 amenities", done: (hotel.amenities ?? []).length >= 5, hint: "Wi‑Fi, parking, AC, hot water — guests filter by these.", link: "/partners/hotel-profile" },
    { key: "map", label: "Location pinned on the map", done: !!hotel.latitude, hint: "Guests searching nearby can only find you with a pin.", link: "/partners/hotel-profile" },
    { key: "phone", label: "Contact phone added", done: !!hotel.contact_phone, hint: "Needed for booking confirmations.", link: "/partners/hotel-profile" },
    { key: "rooms", label: "At least one room with a price", done: rooms.some((x: any) => Number(x.base_price) > 0), hint: "Add a room and its nightly price.", link: "/partners/rooms" },
    { key: "roomphotos", label: "Every room has a photo", done: rooms.length > 0 && rooms.every((x: any) => (x.photos ?? []).length > 0), hint: "Rooms without photos get far fewer clicks.", link: "/partners/rooms" },
  ];
  const reviews = rv.data ?? [];
  return {
    score: Math.round((checks.filter((c) => c.done).length / checks.length) * 100),
    checks, tips, offers: (p.data ?? []) as Offer[],
    occupancy30: totalUnits ? Math.min(1, totalBooked / (totalUnits * 30)) : 0,
    avgRating: reviews.length ? reviews.reduce((a: number, x: any) => a + Number(x.rating || 0), 0) / reviews.length : null,
    reviewCount: reviews.length, unanswered: reviews.filter((x: any) => !x.response).length,
  };
}

export async function applyPrice(roomId: string, price: number) {
  const { error } = await sb.from("hotel_rooms").update({ base_price: price }).eq("id", roomId);
  if (error) throw error;
}

export async function createOffer(hotelId: string, o: { code: string; description: string; percent: number; days: number }) {
  const today = new Date();
  const { error } = await sb.from("hotel_promo_codes").insert({
    hotel_id: hotelId, code: o.code.toUpperCase().replace(/[^A-Z0-9]/g, ""), description: o.description,
    discount_type: "percent", discount_value: o.percent, valid_from: iso(today),
    valid_until: iso(new Date(today.getTime() + o.days * 864e5)), is_active: true, uses_count: 0,
  });
  if (error) throw error;
}

export async function toggleOffer(id: string, active: boolean) {
  const { error } = await sb.from("hotel_promo_codes").update({ is_active: active }).eq("id", id);
  if (error) throw error;
}

export type AssistantRole = "owner" | "staff" | "customer" | "admin";

/** Asks the JAAGA helper. Returns the answer text or throws a readable message. */
export async function askAssistant(role: AssistantRole, question: string, context?: string) {
  const { data, error } = await supabase.functions.invoke("hospitality-assistant", { body: { role, question, context } });
  if (error) throw new Error("The helper is not available right now. Please try again in a minute.");
  if (data?.error) throw new Error(data.error);
  return String(data?.answer ?? "");
}
