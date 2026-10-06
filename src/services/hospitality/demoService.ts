import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;
export const DEMO_KEY = "partner_demo_hotel";
const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

export const getDemoHotelId = () => localStorage.getItem(DEMO_KEY);

/** Finds this user's hidden demo property (tag "demo", never shown to customers). */
export async function findDemoHotel(userId: string): Promise<string | null> {
  const { data } = await sb.from("partner_hotels").select("id").eq("manager_id", userId).contains("tags", ["demo"]).limit(1).maybeSingle();
  return data?.id ?? null;
}

/**
 * Creates a hidden sample property with rooms, bookings (arrivals today, guests in house,
 * departures), cleaning/maintenance jobs, residents with rent, a waitlist and an offer.
 */
export async function createDemo(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in first");
  const existing = await findDemoHotel(user.id);
  if (existing) {
    const { data: h } = await sb.from("partner_hotels").select("type_details").eq("id", existing).maybeSingle();
    if (h?.type_details?.demo_seeded) { localStorage.setItem(DEMO_KEY, existing); return existing; }
    await sb.from("partner_hotels").delete().eq("id", existing).eq("manager_id", user.id); // half-made demo: start over
  }

  const { data: hotel, error } = await sb.from("partner_hotels").insert({
    name: "JAAGA Demo Stay (sample)", city: "Hyderabad", locality: "Madhapur", state: "Telangana", country: "India",
    address: "Sample address – demo only", manager_id: user.id, is_active: false, tags: ["demo"],
    business_types: ["hotel", "coliving"], property_type: "hotel", star_rating: 3, price_per_night: 2500,
    description: "Sample property for trying JAAGA partner tools. Customers never see it.",
    amenities: ["wifi", "ac", "parking"], images: [], contact_phone: "9000000000", check_in_time: "12:00", check_out_time: "11:00",
    latitude: 17.4483, longitude: 78.3915, onboarding_status: "approved",
  }).select("id").single();
  if (error) throw error;
  const hid = hotel.id as string;

  const { data: rooms, error: re } = await sb.from("hotel_rooms").insert([
    { hotel_id: hid, room_type: "Deluxe Room", room_name: "Deluxe Room", base_price: 2500, max_occupancy: 2, total_units: 4, accommodation_kind: "room", stay_unit: "room", is_active: true, photos: [] },
    { hotel_id: hid, room_type: "Suite", room_name: "Family Suite", base_price: 4200, max_occupancy: 4, total_units: 2, accommodation_kind: "room", stay_unit: "room", is_active: true, photos: [] },
    { hotel_id: hid, room_type: "Co-living bed", room_name: "Shared Bed (Co-living)", base_price: 600, monthly_price: 9000, max_occupancy: 1, total_units: 6, accommodation_kind: "bed", stay_unit: "bed", is_active: true, photos: [] },
  ]).select("id,room_name");
  if (re) throw re;
  const [deluxe, suite] = rooms;

  const guests = [
    { name: "Ravi Kumar", in: 0, out: 2, room: deluxe.id, amt: 5000, status: "confirmed" },
    { name: "Priya Sharma", in: 0, out: 1, room: suite.id, amt: 4200, status: "confirmed" },
    { name: "Arjun Reddy", in: -2, out: 0, room: deluxe.id, amt: 5000, status: "checked_in" },
    { name: "Meena Iyer", in: -1, out: 3, room: suite.id, amt: 16800, status: "checked_in" },
    { name: "Sanjay Patel", in: 5, out: 7, room: deluxe.id, amt: 5000, status: "confirmed" },
  ];
  for (const g of guests) {
    const { data: b, error: be } = await sb.from("hotel_bookings").insert({
      hotel_id: hid, room_id: g.room, guest_name: g.name, guest_phone: "9000000001", check_in: day(g.in), check_out: day(g.out),
      total_amount: g.amt, room_charges: g.amt, status: g.status, actual_check_in_at: g.status === "checked_in" ? new Date(Date.now() + g.in * 864e5).toISOString() : null, payment_status: "paid", amount_paid: g.amt, source: "demo", adults: 2,
    }).select("id").single();
    if (be) throw be;
    await sb.from("hotel_availability_blocks").insert({ hotel_id: hid, room_id: g.room, start_date: day(g.in), end_date: day(g.out), units: 1, reason: "booking", booking_id: b.id, created_by: user.id });
  }

  await sb.from("hotel_ops_tasks").insert([
    { hotel_id: hid, kind: "housekeeping", title: "Clean room 101 after check-out", room_label: "101", priority: "normal", status: "open", created_by: user.id },
    { hotel_id: hid, kind: "housekeeping", title: "Fresh towels for room 204", room_label: "204", priority: "normal", status: "in_progress", created_by: user.id },
    { hotel_id: hid, kind: "maintenance", title: "AC not cooling", room_label: "203", priority: "urgent", status: "open", created_by: user.id },
  ]);

  const { data: stays } = await sb.from("hotel_long_stays").insert([
    { hotel_id: hid, unit_label: "Bed A1", resident_name: "Kiran Rao", resident_phone: "9000000002", status: "active", move_in: day(-60), monthly_rent: 9000, deposit: 18000, rent_due_day: 5, created_by: user.id },
    { hotel_id: hid, unit_label: "Bed A2", resident_name: "Divya Nair", resident_phone: "9000000003", move_in: day(-30), monthly_rent: 9000, deposit: 18000, rent_due_day: 5, status: "notice", move_out: day(20), created_by: user.id },
    { hotel_id: hid, unit_label: "Bed B1", resident_name: "Rahul Verma", resident_phone: "9000000004", status: "active", move_in: day(7), monthly_rent: 9500, deposit: 19000, rent_due_day: 5, created_by: user.id },
  ]).select("id,monthly_rent,move_in");
  const m = new Date(); const period = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-01`;
  if (stays?.length) await sb.from("hotel_rent_dues").insert(stays.filter((s: any) => s.move_in <= day(0)).map((s: any, i: number) => ({
    stay_id: s.id, hotel_id: hid, period_month: period, amount: s.monthly_rent, due_date: `${period.slice(0, 8)}05`, status: i === 0 ? "paid" : "due", paid_at: i === 0 ? new Date().toISOString() : null,
  })));

  await sb.from("hotel_promo_codes").insert({ hotel_id: hid, code: "DEMO10", description: "10% off – sample offer", discount_type: "percent", discount_value: 10, valid_from: day(0), valid_until: day(30), is_active: true, uses_count: 0 });

  await sb.from("partner_hotels").update({ type_details: { demo_seeded: true } }).eq("id", hid);
  localStorage.setItem(DEMO_KEY, hid);
  return hid;
}

export function exitDemo() { localStorage.removeItem(DEMO_KEY); }

/** Deletes the demo property; rooms, bookings, residents, tasks and offers are removed with it. */
export async function deleteDemo() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const id = await findDemoHotel(user.id);
  if (id) {
    const { error } = await sb.from("partner_hotels").delete().eq("id", id).eq("manager_id", user.id).contains("tags", ["demo"]);
    if (error) throw error;
  }
  exitDemo();
}
