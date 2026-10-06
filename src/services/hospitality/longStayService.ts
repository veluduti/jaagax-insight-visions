import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type LongStay = {
  id: string; hotel_id: string; room_id: string | null; unit_label: string | null; resident_name: string;
  resident_phone: string | null; resident_email: string | null; move_in: string; move_out: string | null;
  monthly_rent: number; deposit: number; rent_due_day: number; status: "active" | "notice" | "moved_out"; notes: string | null;
};
export type RentDue = { id: string; stay_id: string; period_month: string; amount: number; due_date: string; status: "due" | "paid"; paid_at: string | null };
export type WaitlistEntry = { id: string; hotel_id: string; room_id: string | null; check_in: string; check_out: string; guests: number; status: string; created_at: string };

const monthStart = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

export async function loadLongStays(hotelId: string) {
  const [s, d, w] = await Promise.all([
    sb.from("hotel_long_stays").select("*").eq("hotel_id", hotelId).order("move_in", { ascending: false }).limit(500),
    sb.from("hotel_rent_dues").select("*").eq("hotel_id", hotelId).order("due_date", { ascending: false }).limit(1000),
    sb.from("hotel_waitlist").select("id,hotel_id,room_id,check_in,check_out,guests,status,created_at").eq("hotel_id", hotelId).order("created_at", { ascending: false }).limit(200),
  ]);
  if (s.error) throw s.error;
  return { stays: (s.data ?? []) as LongStay[], dues: (d.data ?? []) as RentDue[], waitlist: (w.data ?? []) as WaitlistEntry[] };
}

export async function addResident(r: Omit<LongStay, "id" | "status" | "move_out"> & { move_out?: string | null }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await sb.from("hotel_long_stays").insert({ ...r, created_by: user?.id });
  if (error) throw error;
}

export async function giveNotice(stay: LongStay, moveOut: string) {
  const { error } = await sb.from("hotel_long_stays").update({ status: "notice", move_out: moveOut }).eq("id", stay.id);
  if (error) throw error;
}

export async function moveOut(stay: LongStay) {
  const { error } = await sb.from("hotel_long_stays").update({ status: "moved_out", move_out: stay.move_out || new Date().toISOString().slice(0, 10) }).eq("id", stay.id);
  if (error) throw error;
}

/** Creates this month's rent line for every current resident (safe to run again — one line per month). */
export async function generateMonthDues(hotelId: string, stays: LongStay[]) {
  const period = monthStart();
  const rows = stays.filter((s) => s.status !== "moved_out" && s.move_in <= new Date().toISOString().slice(0, 10)).map((s) => ({
    stay_id: s.id, hotel_id: hotelId, period_month: period, amount: s.monthly_rent,
    due_date: `${period.slice(0, 8)}${String(Math.min(28, Math.max(1, s.rent_due_day))).padStart(2, "0")}`,
  }));
  if (!rows.length) return 0;
  const { error } = await sb.from("hotel_rent_dues").upsert(rows, { onConflict: "stay_id,period_month", ignoreDuplicates: true });
  if (error) throw error;
  return rows.length;
}

export async function markRentPaid(due: RentDue, note?: string) {
  const { error } = await sb.from("hotel_rent_dues").update({ status: "paid", paid_at: new Date().toISOString(), payment_note: note || null }).eq("id", due.id);
  if (error) throw error;
}

export async function joinWaitlist(e: { hotel_id: string; room_id: string; check_in: string; check_out: string; guests: number }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to join the waitlist");
  const { error } = await sb.from("hotel_waitlist").upsert({ ...e, user_id: user.id, status: "waiting" }, { onConflict: "user_id,room_id,check_in,check_out" });
  if (error) throw error;
}

export async function loadMyWaitlist() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await sb.from("hotel_waitlist").select("id,hotel_id,room_id,check_in,check_out,guests,status,created_at")
    .eq("user_id", user.id).in("status", ["waiting", "notified"]).order("created_at", { ascending: false });
  return (data ?? []) as WaitlistEntry[];
}

export async function leaveWaitlist(id: string) {
  const { error } = await sb.from("hotel_waitlist").delete().eq("id", id);
  if (error) throw error;
}
