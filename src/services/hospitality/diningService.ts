import { supabase } from "@/integrations/supabase/client";
import { recordMovement } from "@/services/hospitality/suppliesService";
const db = supabase as any;
const ok = <T,>(r: { data: T; error: any }) => { if (r.error) throw new Error(r.error.message); return r.data; };

export type MealPlan = { id: string; name: string; meals: string[]; price: number; period: string; diet: string; is_active: boolean };
export type Menu = { id: string; meal: string; menu_date: string | null; weekday: number | null; start_time: string | null; end_time: string | null; items: string[]; is_special: boolean };
export type Sub = { id: string; plan_id: string | null; long_stay_id: string | null; person_name: string; room_label: string | null; diet: string; start_date: string; end_date: string | null; paused_until: string | null; status: string; price: number; meal_credits: number; notes: string | null; created_at: string };
export type Attendance = { id: string; subscription_id: string | null; person_name: string | null; meal: string; served_on: string; status: string; is_guest_meal: boolean };
export type MealRequest = { id: string; person_name: string; room_label: string | null; kind: string; meal: string | null; for_date: string; quantity: number; amount: number; status: string; rating: number | null; notes: string | null; created_at: string };
export type Payment = { id: string; subscription_id: string | null; amount: number; method: string; period: string | null; paid_on: string };

export async function loadDining(hotelId: string) {
  const since = new Date(Date.now() - 200 * 864e5).toISOString().slice(0, 10);
  const q = (t: string) => db.from(t).select("*").eq("hotel_id", hotelId);
  const [p, m, s, a, r, pay, res, items] = await Promise.all([
    q("hotel_meal_plans").order("price", { ascending: false }), q("hotel_meal_menus"), q("hotel_meal_subscriptions").order("person_name"),
    q("hotel_meal_attendance").gte("served_on", since).limit(5000), q("hotel_meal_requests").order("created_at", { ascending: false }).limit(1000),
    q("hotel_meal_payments").gte("paid_on", since), db.from("hotel_long_stays").select("id,resident_name,unit_label,status").eq("hotel_id", hotelId).in("status", ["active", "confirmed"]),
    db.from("hotel_supply_items").select("id,name,unit,current_stock,unit_cost,category_key").eq("hotel_id", hotelId).order("name"),
  ]);
  return { plans: ok(p) as MealPlan[], menus: ok(m) as Menu[], subs: ok(s) as Sub[], attendance: ok(a) as Attendance[], requests: ok(r) as MealRequest[], payments: ok(pay) as Payment[],
    residents: (res.data ?? []) as { id: string; resident_name: string; unit_label: string | null }[], items: (items.data ?? []) as { id: string; name: string; unit: string; current_stock: number; unit_cost: number; category_key: string }[] };
}

const save = async (table: string, hotelId: string, v: any) => { const { id, ...rest } = v; ok(id ? await db.from(table).update(rest).eq("id", id) : await db.from(table).insert({ ...rest, hotel_id: hotelId })); };
export async function savePlan(hotelId: string, v: Partial<MealPlan>) { if (!v.name?.trim()) throw new Error("Plan name is required"); if (!(Number(v.price) >= 0)) throw new Error("Enter a valid price"); await save("hotel_meal_plans", hotelId, v); }
export async function saveMenu(hotelId: string, v: Partial<Menu>) { if (!v.meal) throw new Error("Choose a meal"); if (!v.items?.length) throw new Error("Add at least one dish"); if (v.menu_date == null && v.weekday == null) throw new Error("Pick a date or weekday"); await save("hotel_meal_menus", hotelId, v); }
export async function saveSub(hotelId: string, v: Partial<Sub>) { if (!v.person_name?.trim()) throw new Error("Name is required"); if (!v.plan_id) throw new Error("Choose a meal plan"); await save("hotel_meal_subscriptions", hotelId, v); }
export async function saveRequest(hotelId: string, v: Partial<MealRequest>) { if (!v.person_name?.trim()) throw new Error("Name is required"); await save("hotel_meal_requests", hotelId, v); }
export async function markAttendance(hotelId: string, sub: Sub, meal: string, day: string, status: string) {
  ok(await db.from("hotel_meal_attendance").upsert({ hotel_id: hotelId, subscription_id: sub.id, person_name: sub.person_name, meal, served_on: day, status }, { onConflict: "subscription_id,meal,served_on" }));
}
export async function recordGuestMeal(hotelId: string, name: string, meal: string, day: string) {
  ok(await db.from("hotel_meal_attendance").insert({ hotel_id: hotelId, person_name: name, meal, served_on: day, status: "attended", is_guest_meal: true }));
}
export async function recordPayment(hotelId: string, v: Partial<Payment>) { if (!(Number(v.amount) > 0)) throw new Error("Enter an amount above zero"); ok(await db.from("hotel_meal_payments").insert({ ...v, hotel_id: hotelId })); }
/** Kitchen usage goes into the shared Inventory & Supplies ledger, never a separate stock table. */
export const recordIngredientUse = (hotelId: string, itemId: string, qty: number, meal: string) => recordMovement(hotelId, itemId, "outward", qty, null, `Mess / kitchen – ${meal}`);
